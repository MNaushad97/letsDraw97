import { useState, useEffect, useRef, useCallback } from 'react';

// Free Google STUN Servers
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const useWebRTCMesh = (socket, roomId, userId, userName) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);

  // Use refs so signaling handlers always see latest values
  // without triggering effect re-runs
  const peersRef       = useRef(new Map()); // socketId → RTCPeerConnection
  const localStreamRef = useRef(null);

  // Keep ref in sync
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

  // ── 1. Get local camera & mic (ON DEMAND) ──────────────────────
  const requestMedia = useCallback(async (withVideo, withAudio) => {
    if (localStreamRef.current) return true; // already have it
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Camera/Mic blocked or unsupported. Use HTTPS/localhost.');
      return false;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: withVideo, audio: withAudio });
      setLocalStream(s);
      localStreamRef.current = s;
      
      // If we already have peers, attach tracks via transceivers and renegotiate
      peersRef.current.forEach(async (pc, sid) => {
        for (const track of s.getTracks()) {
          const tr = pc.getTransceivers?.().find(t => t.receiver?.track?.kind === track.kind);
          if (tr) {
            tr.direction = 'sendrecv';
            if (tr.sender) {
              await tr.sender.replaceTrack(track);
            }
          } else {
            pc.addTrack(track, s);
          }
        }

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('webrtc-offer', {
            targetSocketId: sid,
            offer,
            callerName: userName,
            userId,
          });
        } catch (e) {
          console.warn('[WebRTC] Renegotiation error:', e);
        }
      });
      return true;
    } catch (err) {
      console.warn('[WebRTC] Camera error:', err.message);
      alert('Could not access camera/mic: ' + err.message);
      return false;
    }
  }, [socket, userName, userId]);

  // ── 2. Helper: build a fresh RTCPeerConnection ───────────────────
  //    Uses localStreamRef (not state) so it never goes stale
  const createPC = useCallback((targetSocketId, targetName) => {
    // Tear down any existing connection to this peer
    if (peersRef.current.has(targetSocketId)) {
      peersRef.current.get(targetSocketId).close();
      peersRef.current.delete(targetSocketId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Attach our local tracks (camera/mic) if we have them
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      console.log(`[WebRTC] Attached ${stream.getTracks().length} tracks for ${targetName}`);
    } else {
      // No camera yet — add transceivers so we are ready to receive remote audio/video
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });
      console.log(`[WebRTC] No camera — added recvonly transceivers for ${targetName}`);
    }

    // ICE candidate discovered → relay it via the socket server
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket) {
        socket.emit('webrtc-ice-candidate', { targetSocketId, candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE state → ${targetName}: ${pc.iceConnectionState}`);
    };

    // Received their media stream
    pc.ontrack = (event) => {
      console.log(`[WebRTC] ✅ ontrack from ${targetName}! kind: ${event.track?.kind}, streams:`, event.streams?.length);
      const mediaStream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream();
      if (event.track && !mediaStream.getTracks().some(t => t.id === event.track.id)) {
        mediaStream.addTrack(event.track);
      }
      
      setRemoteStreams(prev => {
        const existing = prev.find(s => s.socketId === targetSocketId);
        if (existing) {
          if (existing.stream && event.track && !existing.stream.getTracks().some(t => t.id === event.track.id)) {
            existing.stream.addTrack(event.track);
          }
          return prev.map(s => s.socketId === targetSocketId ? { ...s, stream: existing.stream || mediaStream, name: targetName } : s);
        }
        return [...prev, { socketId: targetSocketId, stream: mediaStream, name: targetName }];
      });
    };

    peersRef.current.set(targetSocketId, pc);
    return pc;
  }, [socket]); // deliberately no localStream dep — we use the ref

  // ── 3. Socket signaling listeners ───────────────────────────────
  useEffect(() => {
    if (!socket) {
      console.log('[WebRTC] No socket yet, skipping listener setup');
      return;
    }
    console.log('[WebRTC] Registering signaling listeners on socket:', socket.id);

    // A. A new peer joined the room → WE are existing, WE send the offer
    //    (Only existing peers initiate — prevents "glare" where both sides
    //    send offers simultaneously and destroy each other's connections)
    const handlePeerJoined = async ({ name: newName, socketId: newSocketId }) => {
      if (!newSocketId) return;
      console.log(`[WebRTC] >>> peer-joined: ${newName} (${newSocketId}) — sending offer`);
      const pc = createPC(newSocketId, newName);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc-offer', {
        targetSocketId: newSocketId,
        offer,
        callerName: userName,
        userId,
      });
      console.log(`[WebRTC] >>> Offer sent to ${newName}`);
    };

    // B. We received an offer → answer it
    const handleReceiveOffer = async ({ offer, callerSocketId, callerName }) => {
      console.log(`[WebRTC] <<< Received offer from: ${callerName} (${callerSocketId})`);
      let pc = peersRef.current.get(callerSocketId);
      if (!pc) {
        pc = createPC(callerSocketId, callerName);
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        
        // If we have local stream, bind local tracks to transceivers
        const stream = localStreamRef.current;
        if (stream) {
          for (const track of stream.getTracks()) {
            const tr = pc.getTransceivers?.().find(t => t.receiver?.track?.kind === track.kind);
            if (tr) {
              tr.direction = 'sendrecv';
              if (tr.sender && tr.sender.track !== track) {
                await tr.sender.replaceTrack(track);
              }
            } else {
              pc.addTrack(track, stream);
            }
          }
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc-answer', { targetSocketId: callerSocketId, answer });
        console.log(`[WebRTC] <<< Answer sent to ${callerName}`);
      } catch (e) {
        console.warn('[WebRTC] Error handling offer:', e);
      }
    };

    // C. Our offer was accepted
    const handleReceiveAnswer = async ({ answer, answererSocketId }) => {
      console.log(`[WebRTC] <<< Received answer from: ${answererSocketId}`);
      const pc = peersRef.current.get(answererSocketId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log(`[WebRTC] ✅ Connection established with ${answererSocketId}`);
      } else {
        console.warn(`[WebRTC] ⚠️ No PC found for answerer ${answererSocketId}`);
      }
    };

    // D. ICE candidate from a peer
    const handleIceCandidate = async ({ candidate, senderSocketId }) => {
      const pc = peersRef.current.get(senderSocketId);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
          .catch(e => console.warn('[WebRTC] addIceCandidate error:', e));
      }
    };

    // E. A peer disconnected
    const handlePeerLeft = ({ socketId }) => {
      console.log(`[WebRTC] peer-left: ${socketId}`);
      peersRef.current.get(socketId)?.close();
      peersRef.current.delete(socketId);
      setRemoteStreams(prev => prev.filter(s => s.socketId !== socketId));
    };

    // NOTE: We do NOT handle room-init here. Only existing peers send offers
    // (via peer-joined). The new joiner just waits to receive offers.
    // This prevents the "glare" problem where both sides send offers
    // and destroy each other's connections.

    socket.on('peer-joined',         handlePeerJoined);
    socket.on('webrtc-offer',        handleReceiveOffer);
    socket.on('webrtc-answer',       handleReceiveAnswer);
    socket.on('webrtc-ice-candidate',handleIceCandidate);
    socket.on('peer-left',           handlePeerLeft);

    return () => {
      socket.off('peer-joined',         handlePeerJoined);
      socket.off('webrtc-offer',        handleReceiveOffer);
      socket.off('webrtc-answer',       handleReceiveAnswer);
      socket.off('webrtc-ice-candidate',handleIceCandidate);
      socket.off('peer-left',           handlePeerLeft);
    };
  }, [socket, createPC, userName, userId]);

  // ── 4. Controls ──────────────────────────────────────────────────
  const toggleAudio = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; return track.enabled; }
    return false;
  }, []);

  const toggleVideo = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; return track.enabled; }
    return false;
  }, []);

  return { localStream, remoteStreams, toggleAudio, toggleVideo, requestMedia };
};
