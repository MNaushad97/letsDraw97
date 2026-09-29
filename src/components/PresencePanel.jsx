/**
 * PresencePanel — Shows who is currently online in the room.
 * Also shows direct Copy Room ID and Copy invite link buttons.
 */
import { useState } from 'react';
import { Users, Link2, Copy, Check, Wifi, WifiOff } from 'lucide-react';

export default function PresencePanel({ peers, myName, myColor, isConnected, roomId }) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const allUsers = [
    { id: '__me__', name: myName + ' (You)', color: myColor },
    ...Object.entries(peers).map(([id, p]) => ({ id, name: p.name, color: p.color })),
  ];

  const copyRoomId = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId).then(() => {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    });
  };

  const copyLink = () => {
    const url = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 72,
        right: 16,
        zIndex: 200,
        background: 'var(--panel-bg, rgba(255,255,255,0.95))',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border, #e0e0e0)',
        borderRadius: 12,
        padding: '10px 14px',
        minWidth: 210,
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Users size={14} color="var(--text-secondary, #888)" />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary, #888)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Room · {allUsers.length} online
        </span>
        <span style={{ marginLeft: 'auto' }} title={isConnected ? 'Connected' : 'Reconnecting...'}>
          {isConnected
            ? <Wifi size={13} color="#2ecc71" />
            : <WifiOff size={13} color="#e74c3c" />}
        </span>
      </div>

      {/* User List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {allUsers.map(u => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 26, height: 26,
              borderRadius: '50%',
              background: u.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff',
              flexShrink: 0,
            }}>
              {(u.name || '?')[0].toUpperCase()}
            </div>
            <span style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text-primary, #1e1e1e)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 130,
            }}>
              {u.name}
            </span>
          </div>
        ))}
      </div>

      {/* Action buttons: Copy Room ID & Copy Link */}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border, #eee)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          id="copy-room-id-btn"
          onClick={copyRoomId}
          title="Copy Room ID directly to clipboard"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            width: '100%',
            background: copiedId ? 'rgba(46,204,113,0.15)' : 'var(--panel-hover, #f0f0f0)',
            border: copiedId ? '1px solid #2ecc71' : '1px solid transparent',
            borderRadius: 8,
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
            color: copiedId ? '#27ae60' : 'var(--text-primary, #1e1e1e)',
            transition: 'all 0.2s ease',
          }}
        >
          {copiedId ? <Check size={13} color="#27ae60" /> : <Copy size={13} />}
          {copiedId ? 'Room ID copied!' : `Copy Room ID (${roomId})`}
        </button>

        <button
          id="copy-invite-link-btn"
          onClick={copyLink}
          title="Copy shareable link with room parameter"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            width: '100%',
            background: copiedLink ? '#2ecc71' : 'transparent',
            border: '1px solid var(--border, #e0e0e0)',
            borderRadius: 8,
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
            color: copiedLink ? '#fff' : 'var(--text-primary, #1e1e1e)',
            transition: 'all 0.2s ease',
          }}
        >
          {copiedLink ? <Check size={13} /> : <Link2 size={13} />}
          {copiedLink ? 'Link copied!' : 'Copy invite link'}
        </button>
      </div>
    </div>
  );
}
