/**
 * RoomPanel — Unified Presence + Video panel
 * Inspired by the user's sketch.
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Link2, Copy, Check, Mic, MicOff, Video, VideoOff, Maximize2, Minimize2, ChevronDown, ChevronUp, GripHorizontal
} from 'lucide-react';

/* ── Individual User Block (Video ON or OFF) ─────────────────────── */
const UserBlock = ({ stream, name, color, isLocal, audioOn, videoOn, toggleAudio, toggleVideo }) => {
  const isVideoLive = Boolean(stream && videoOn);
  const [speaking, setSpeaking] = useState(false);
  const audioCtxRef  = useRef(null);
  const animFrameRef = useRef(null);

  // ── Audio level detection (speaking glow) ───────────────────────
  useEffect(() => {
    // Cleanup previous analyzer
    setSpeaking(false);
    cancelAnimationFrame(animFrameRef.current);
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }

    if (!stream || !audioOn) return;
    if (!stream.getAudioTracks().length) return;

    let cancelled = false;

    const setup = async () => {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = audioCtx;
        const source   = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        let wasSpeaking = false;

        const check = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(data);
          // Focus on voice-frequency bins (lower portion)
          const avg = data.slice(0, 40).reduce((a, b) => a + b, 0) / 40;
          const isSpeaking = avg > 10;
          // Only call setSpeaking when value actually changes → no excess re-renders
          if (isSpeaking !== wasSpeaking) { wasSpeaking = isSpeaking; setSpeaking(isSpeaking); }
          animFrameRef.current = requestAnimationFrame(check);
        };
        animFrameRef.current = requestAnimationFrame(check);
      } catch (_) { /* AudioContext blocked by browser */ }
    };

    setup();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrameRef.current);
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    };
  }, [stream, audioOn]);

  // ── Callback ref: fires on every mount (collapse→expand fix) ────
  const videoCallbackRef = useCallback((node) => {
    if (node && stream) {
      node.srcObject = stream;
      node.play().catch(() => {});
    }
  }, [stream]);

  return (
    <div className={`rp-user-block ${isVideoLive ? 'video-on' : 'video-off'}`}>

      {/* REMOTE: always keep <video> in DOM so audio keeps playing even when
          the remote peer turns off their camera. Just hide it visually. */}
      {!isLocal && stream && (
        <video
          className="rp-video-bg"
          ref={videoCallbackRef}
          autoPlay
          playsInline
          style={!isVideoLive ? { display: 'none' } : {}}
        />
      )}

      {/* LOCAL: only show when video is live — audio goes via WebRTC tracks,
          not via a local video element, so no audio loss when video is off. */}
      {isLocal && isVideoLive && (
        <video
          className="rp-video-bg"
          ref={videoCallbackRef}
          autoPlay
          playsInline
          muted
        />
      )}

      <div className="rp-user-info">
        <div className="rp-avatar" style={{ background: color }}>
          {(name || '?')[0].toUpperCase()}
        </div>
        <span className="rp-member-name">{name}</span>
      </div>

      {isLocal ? (
        <div className="rp-user-controls">
          <button
            type="button"
            className={`rp-mini-btn ${!audioOn ? 'off' : ''} ${audioOn && speaking ? 'speaking' : ''}`}
            onClick={toggleAudio}
            title={audioOn ? 'Mute microphone' : 'Unmute microphone'}
          >
            {audioOn ? <Mic size={14}/> : <MicOff size={14}/>}
          </button>
          <button
            type="button"
            className={`rp-mini-btn ${!videoOn ? 'off' : ''}`}
            onClick={toggleVideo}
            title={videoOn ? 'Turn off video' : 'Turn on video'}
          >
            {videoOn ? <Video size={14}/> : <VideoOff size={14}/>}
          </button>
        </div>
      ) : (
        <div className="rp-user-controls readonly">
          <div
            className={`rp-mini-btn readonly ${!audioOn ? 'off' : ''} ${audioOn && speaking ? 'speaking' : ''}`}
            title={audioOn ? `${name}'s mic is on` : `${name} is muted`}
          >
            {audioOn ? <Mic size={14}/> : <MicOff size={14}/>}
          </div>
          <div
            className={`rp-mini-btn readonly ${!videoOn ? 'off' : ''}`}
            title={videoOn ? `${name}'s camera is on` : `${name}'s camera is off`}
          >
            {videoOn ? <Video size={14}/> : <VideoOff size={14}/>}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Main Panel ──────────────────────────────────────────────────── */
export default function RoomPanel({
  peers, myName, myColor, isConnected, roomId,
  localStream, remoteStreams, userName,
  toggleAudio, toggleVideo, requestMedia, emitMediaState,
  reconnect,
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId]     = useState(false);
  const [localAudioOn, setLocalAudioOn] = useState(false);
  const [localVideoOn, setLocalVideoOn] = useState(false);
  
  // Minimized by default on small screens (<= 768px) to avoid overlapping top bars
  const [collapsed, setCollapsed] = useState(false);
  const [minimized, setMinimized] = useState(() => window.innerWidth <= 768);

  // ── Dragging position state ──────────────────────────────────────
  const [pos, setPos] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const panelRef = useRef(null);

  // ── Sync Status Tab state (3s/7s timers, 90s disconnect timeout) ──
  const [tabState, setTabState] = useState(!isConnected ? 'retrying' : 'syncing');
  const [tabVisible, setTabVisible] = useState(true);
  const slideTimerRef = useRef(null);
  const timeout90sRef = useRef(null);

  // Handle connection state changes and timers
  useEffect(() => {
    clearTimeout(slideTimerRef.current);

    if (isConnected) {
      // Connected -> status: syncing (green)
      clearTimeout(timeout90sRef.current);
      timeout90sRef.current = null;

      setTabState('syncing');
      setTabVisible(true);

      // Slide down after 3 seconds
      slideTimerRef.current = setTimeout(() => {
        setTabVisible(false);
      }, 3000);
    } else {
      // Disconnected -> status: retrying (red)
      setTabState('retrying');
      setTabVisible(true);

      // Slide down after 7 seconds
      slideTimerRef.current = setTimeout(() => {
        setTabVisible(false);
      }, 7000);

      // Start 90-second timeout if not already running
      if (!timeout90sRef.current) {
        timeout90sRef.current = setTimeout(() => {
          setTabState('stopped');
          setTabVisible(true);

          // Slide down stopped tab after 7 seconds
          clearTimeout(slideTimerRef.current);
          slideTimerRef.current = setTimeout(() => {
            setTabVisible(false);
          }, 7000);
        }, 90000); // 90 seconds
      }
    }

    return () => {
      clearTimeout(slideTimerRef.current);
    };
  }, [isConnected]);

  // Manual retry handler when user clicks member count
  const handleRetryConnection = useCallback((e) => {
    e?.stopPropagation();

    clearTimeout(timeout90sRef.current);
    timeout90sRef.current = null;
    clearTimeout(slideTimerRef.current);

    // Call socket reconnect
    reconnect?.();

    // Reset status to retrying
    setTabState('retrying');
    setTabVisible(true);

    // Slide down after 7 seconds
    slideTimerRef.current = setTimeout(() => {
      setTabVisible(false);
    }, 7000);

    // Start 90-second timeout again
    timeout90sRef.current = setTimeout(() => {
      setTabState('stopped');
      setTabVisible(true);

      clearTimeout(slideTimerRef.current);
      slideTimerRef.current = setTimeout(() => {
        setTabVisible(false);
      }, 7000);
    }, 90000);
  }, [reconnect]);

  const handlePointerDown = (e) => {
    // Don't drag if clicking interactive elements
    if (e.target.closest('button, input, a, video, .rp-peer-counter')) return;
    
    const node = panelRef.current;
    if (!node) return;
    
    const rect = node.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const node = panelRef.current;
    const panelWidth = node ? node.offsetWidth : 240;
    const panelHeight = node ? node.offsetHeight : 150;
    
    let newX = e.clientX - dragOffsetRef.current.x;
    let newY = e.clientY - dragOffsetRef.current.y;
    
    // Constrain to viewport bounds with 8px safety margin
    newX = Math.max(8, Math.min(window.innerWidth - panelWidth - 8, newX));
    newY = Math.max(8, Math.min(window.innerHeight - panelHeight - 8, newY));
    
    setPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (!pos || !panelRef.current) return;
      const panelWidth = panelRef.current.offsetWidth;
      const panelHeight = panelRef.current.offsetHeight;
      const clampedX = Math.max(8, Math.min(window.innerWidth - panelWidth - 8, pos.x));
      const clampedY = Math.max(8, Math.min(window.innerHeight - panelHeight - 8, pos.y));
      if (clampedX !== pos.x || clampedY !== pos.y) {
        setPos({ x: clampedX, y: clampedY });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pos]);

  // Sync local audio/video state with actual track states whenever localStream changes
  useEffect(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      const videoTrack = localStream.getVideoTracks()[0];
      const aOn = audioTrack ? audioTrack.enabled : false;
      const vOn = videoTrack ? (videoTrack.enabled && videoTrack.readyState === 'live') : false;
      setLocalAudioOn(aOn);
      setLocalVideoOn(vOn);
      // Broadcast our initial state to peers so they know our camera is on
      emitMediaState?.(aOn, vOn);
    }
  }, [localStream]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter only active online peers with valid socketId and name
  const onlinePeers = Object.entries(peers || {}).filter(([_, peer]) => {
    return peer && peer.name && peer.socketId;
  });
  const totalMembers = onlinePeers.length + 1; // local + remote peers

  // When a NEW peer joins, re-broadcast our current media state so they
  // immediately learn whether our camera/mic is on (fixes the race where
  // a peer joins after we already have camera on, before any toggle event)
  const peerCount = onlinePeers.length;
  useEffect(() => {
    if (localStream && peerCount > 0) {
      emitMediaState?.(localAudioOn, localVideoOn);
    }
  }, [peerCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopiedId(true); setTimeout(() => setCopiedId(false), 2000);
    });
  };
  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/?room=${roomId}`).then(() => {
      setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const onToggleLocalAudio = async () => {
    if (!localStream) {
      const success = await requestMedia(true, true);
      if (success) {
        setLocalAudioOn(true);
        setLocalVideoOn(true);
        emitMediaState?.(true, true);
      }
    } else {
      const v = toggleAudio?.(); 
      setLocalAudioOn(v);
      emitMediaState?.(v, localVideoOn);
    }
  };

  const onToggleLocalVideo = async () => {
    if (!localStream) {
      const success = await requestMedia(true, true);
      if (success) {
        setLocalAudioOn(true);
        setLocalVideoOn(true);
        emitMediaState?.(true, true);
      }
    } else {
      const v = toggleVideo?.(); 
      setLocalVideoOn(v);
      emitMediaState?.(localAudioOn, v);
    }
  };

  const dragStyle = pos ? { left: `${pos.x}px`, top: `${pos.y}px`, right: 'auto', bottom: 'auto' } : undefined;

  const tabLabel = tabState === 'syncing'
    ? 'syncing...'
    : tabState === 'retrying'
    ? 'retrying sync...'
    : 'sync stopped • click to retry';

  const dotClass = tabState === 'syncing'
    ? 'on'
    : tabState === 'retrying'
    ? 'off blinking'
    : 'stopped';

  if (minimized) {
    return (
      <div
        ref={panelRef}
        className={`rp-minimized status-${tabState} ${isDragging ? 'is-dragging' : ''}`}
        style={dragStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={(e) => {
          if (!isDragging) setMinimized(false);
        }}
      >
        {/* Top Status Tab attached to Room panel */}
        <div className={`rp-top-status-tab ${tabState} ${tabVisible ? 'visible' : ''}`}>
          <div className={`rp-dot ${dotClass}`} />
          <span>{tabLabel}</span>
        </div>

        <GripHorizontal size={12} className="rp-grip-icon" />
        <Users size={14} />
        <button
          className={`rp-peer-counter-mini status-${tabState}`}
          onClick={handleRetryConnection}
          title={tabState === 'stopped' ? 'Sync stopped. Click to retry.' : 'Click to retry sync'}
        >
          <span>{totalMembers}</span>
          <div className={`rp-dot ${dotClass}`} />
        </button>
        <Maximize2 size={12} />
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className={`rp-panel sketch-style status-${tabState} ${collapsed ? 'rp-collapsed' : ''} ${isDragging ? 'is-dragging' : ''}`}
      style={dragStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Top Status Tab attached to Room panel */}
      <div className={`rp-top-status-tab ${tabState} ${tabVisible ? 'visible' : ''}`}>
        <div className={`rp-dot ${dotClass}`} />
        <span>{tabLabel}</span>
      </div>
      
      {/* ── Top Section: Actions & Controls ── */}
      <div className="rp-top-bar">
        <div className="rp-drag-handle" title="Drag to move panel">
          <GripHorizontal size={14} className="rp-grip-icon" />
        </div>
        <div className="rp-actions-sketch">
          <button className={`rp-sketch-btn ${copiedId ? 'success' : ''}`} onClick={copyRoomId} title="Copy Room ID">
            {copiedId ? <Check size={14}/> : <Copy size={14}/>}
            <span>ID</span>
          </button>
          <button className={`rp-sketch-btn ${copiedLink ? 'success' : ''}`} onClick={copyLink} title="Copy Invite Link">
            {copiedLink ? <Check size={14}/> : <Link2 size={14}/>}
            <span>Link</span>
          </button>
          <button
            className={`rp-peer-counter status-${tabState}`}
            onClick={handleRetryConnection}
            title={tabState === 'stopped' ? 'Sync stopped. Click to retry connection.' : 'Members in room / Click to retry sync'}
          >
            <div className={`rp-dot ${dotClass}`} />
            <span>{totalMembers}/4</span>
          </button>
        </div>
        
        <div className="rp-top-controls">
          <button className="rp-icon-btn" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}
          </button>
          <button className="rp-icon-btn" onClick={() => setMinimized(true)} title="Minimize">
            <Minimize2 size={13}/>
          </button>
        </div>
      </div>

      {/* ── Users List ── */}
      {!collapsed && (
        <div className="rp-users-list">
          {/* Local User */}
          <UserBlock 
            stream={localStream}
            name={`${userName} (You)`}
            color={myColor}
            isLocal={true}
            audioOn={localAudioOn}
            videoOn={localVideoOn}
            toggleAudio={onToggleLocalAudio}
            toggleVideo={onToggleLocalVideo}
          />
          
          {/* Remote Users (Online only) */}
          {onlinePeers.map(([id, peer]) => {
            const remoteEntry = remoteStreams.find(s => s.socketId === peer.socketId || s.name === peer.name);
            const rStream = remoteEntry?.stream;
            const rAudio = peer.audioOn || false;
            // Use ONLY the signaled videoOn flag — do NOT inspect receiver-side
            // track.enabled because it never reflects the sender's toggle state
            const rVideo = peer.videoOn || false;
            return (
              <UserBlock 
                key={id}
                stream={rStream}
                name={peer.name}
                color={peer.color}
                isLocal={false}
                audioOn={rAudio}
                videoOn={rVideo}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Need a mock Users icon for minimized state since we removed it from imports
const Users = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);
