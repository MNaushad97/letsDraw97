/**
 * RoomPanel — Unified Presence + Video panel
 * Inspired by the user's sketch.
 */
import React, { useRef, useEffect, useState } from 'react';
import {
  Link2, Copy, Check, Mic, MicOff, Video, VideoOff, Maximize2, Minimize2, ChevronDown, ChevronUp
} from 'lucide-react';

/* ── Individual User Block (Video ON or OFF) ─────────────────────── */
const UserBlock = ({ stream, name, color, isLocal, audioOn, videoOn, toggleAudio, toggleVideo }) => {
  const videoRef = useRef(null);

  // We consider video live if stream exists and videoOn flag is true
  const isVideoLive = Boolean(stream && videoOn);

  useEffect(() => {
    if (videoRef.current && stream && isVideoLive) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, isVideoLive]);

  return (
    <div className={`rp-user-block ${isVideoLive ? 'video-on' : 'video-off'}`}>
      {isVideoLive && (
        <video 
          className="rp-video-bg" 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted={isLocal} 
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
            className={`rp-mini-btn ${!audioOn ? 'off' : ''}`}
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
            className={`rp-mini-btn readonly ${!audioOn ? 'off' : ''}`}
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
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId]     = useState(false);
  const [localAudioOn, setLocalAudioOn] = useState(false);
  const [localVideoOn, setLocalVideoOn] = useState(false);
  
  // Expanded by default for all screens
  const [collapsed, setCollapsed] = useState(false);
  const [minimized, setMinimized] = useState(false);

  // Filter only active online peers with valid socketId and name
  const onlinePeers = Object.entries(peers || {}).filter(([_, peer]) => {
    return peer && peer.name && peer.socketId;
  });

  const totalMembers = onlinePeers.length + 1; // local + remote peers

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

  if (minimized) {
    return (
      <div className="rp-minimized" onClick={() => setMinimized(false)}>
        <Users size={14} />
        <span>{totalMembers}</span>
        <div className={`rp-dot ${isConnected ? 'on' : 'off'}`} />
        <Maximize2 size={12} />
      </div>
    );
  }

  return (
    <div className={`rp-panel sketch-style ${collapsed ? 'rp-collapsed' : ''}`}>
      
      {/* ── Top Section: Actions & Controls ── */}
      <div className="rp-top-bar">
        <div className="rp-actions-sketch">
          <button className={`rp-sketch-btn ${copiedId ? 'success' : ''}`} onClick={copyRoomId} title="Copy Room ID">
            {copiedId ? <Check size={14}/> : <Copy size={14}/>}
            <span>ID</span>
          </button>
          <button className={`rp-sketch-btn ${copiedLink ? 'success' : ''}`} onClick={copyLink} title="Copy Invite Link">
            {copiedLink ? <Check size={14}/> : <Link2 size={14}/>}
            <span>Link</span>
          </button>
          <span className="rp-peer-counter" title="Members in room / Max 4 allowed">
            {totalMembers}/4
          </span>
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
            const rStream = remoteStreams.find(s => s.socketId === peer.socketId || s.name === peer.name)?.stream;
            const rAudio = peer.audioOn || false;
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
