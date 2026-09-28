/**
 * PresencePanel — Shows who is currently online in the room.
 * Also shows the room link and copy button.
 */
import { useState } from 'react';
import { Users, Link2, Check, Wifi, WifiOff } from 'lucide-react';

export default function PresencePanel({ peers, myName, myColor, isConnected, roomId }) {
  const [copied, setCopied] = useState(false);

  const allUsers = [
    { id: '__me__', name: myName + ' (You)', color: myColor },
    ...Object.entries(peers).map(([id, p]) => ({ id, name: p.name, color: p.color })),
  ];

  const copyLink = () => {
    const url = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
        minWidth: 200,
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

      {/* Room link copy */}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border, #eee)' }}>
        <button
          onClick={copyLink}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            width: '100%',
            background: copied ? '#2ecc71' : 'var(--panel-hover, #f0f0f0)',
            border: 'none', borderRadius: 8,
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
            color: copied ? '#fff' : 'var(--text-primary, #1e1e1e)',
            transition: 'all 0.2s ease',
          }}
        >
          {copied ? <Check size={13} /> : <Link2 size={13} />}
          {copied ? 'Link copied!' : 'Copy invite link'}
        </button>
      </div>
    </div>
  );
}
