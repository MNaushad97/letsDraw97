/**
 * RoomLobby — Room join/create modal.
 * - Create: generates a new Room ID, always succeeds.
 * - Join: validates room exists on server before entering.
 * - URL param: validated by App.jsx before this component even renders.
 */
import { useState } from 'react';
import { generateRandomName, generateRoomId } from '../lib/randomNames.js';
import { checkRoom } from '../hooks/useMultiplayer.js';
import { Pencil, Users, ArrowRight, Shuffle, LogIn, Loader2 } from 'lucide-react';

export default function RoomLobby({ onJoin, onSolo, prefillError }) {
  const [mode, setMode]           = useState(null); // null | 'create' | 'join'
  const [roomInput, setRoomInput] = useState('');
  const [nameInput, setNameInput] = useState(() => generateRandomName());
  const [error, setError]         = useState(prefillError || '');
  const [loading, setLoading]     = useState(false);

  const handleCreate = () => {
    const name   = nameInput.trim() || generateRandomName();
    const roomId = generateRoomId();
    onJoin({ roomId, userName: name, isNewRoom: true });
  };

  const handleJoin = async () => {
    const roomId = roomInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!roomId) { setError('Please enter a Room ID.'); return; }

    setError('');
    setLoading(true);

    const { exists, offline } = await checkRoom(roomId);

    setLoading(false);

    if (!exists) {
      setError(`Room "${roomId}" doesn't exist. Ask the creator to share their invite link.`);
      return;
    }

    if (offline) {
      // Server unreachable, let them in anyway
      setError('');
    }

    const name = nameInput.trim() || generateRandomName();
    onJoin({ roomId, userName: name, isNewRoom: false });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--bg, #f5f5f0)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div className="canvas-grid" aria-hidden="true" />

      <div style={{
        background: 'var(--panel-bg, rgba(255,255,255,0.97))',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--border, #e0e0e0)',
        borderRadius: 20,
        padding: '36px 40px',
        width: '100%', maxWidth: 420,
        boxShadow: '0 24px 80px rgba(0,0,0,0.15)',
        position: 'relative', zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>✏️</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary, #1e1e1e)', letterSpacing: -0.5 }}>
            letsDraw97
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-secondary, #888)' }}>
            Collaborative whiteboard. Draw together in real-time.
          </p>
        </div>

        {/* Name Field */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Your Name</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="Enter your name..."
              maxLength={32}
              style={inputStyle}
            />
            <button
              onClick={() => setNameInput(generateRandomName())}
              title="Random name"
              style={shuffleBtnStyle}
            >
              <Shuffle size={15} />
            </button>
          </div>
        </div>

        {/* Mode Selector */}
        {!mode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {error && (
              <div style={errorBoxStyle}>{error}</div>
            )}
            <button onClick={() => setMode('create')} style={primaryBtnStyle('#6c63ff')}>
              <Users size={16} /> Create a New Room
            </button>
            <button onClick={() => setMode('join')} style={primaryBtnStyle('#1abc9c')}>
              <LogIn size={16} /> Join Existing Room
            </button>
            <div style={dividerStyle}>
              <div style={{ flex: 1, height: 1, background: 'var(--border, #eee)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-secondary, #aaa)' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border, #eee)' }} />
            </div>
            <button onClick={onSolo} style={ghostBtnStyle}>
              <Pencil size={14} /> Continue Solo (No Room)
            </button>
          </div>
        )}

        {/* Create Room */}
        {mode === 'create' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary, #888)', textAlign: 'center' }}>
              A unique Room ID will be generated.<br />Share the invite link with teammates!
            </p>
            <button onClick={handleCreate} style={primaryBtnStyle('#6c63ff')}>
              <ArrowRight size={16} /> Create & Enter Room
            </button>
            <button onClick={() => setMode(null)} style={ghostBtnStyle}>← Back</button>
          </div>
        )}

        {/* Join Room */}
        {mode === 'join' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={labelStyle}>Room ID</label>
            <input
              value={roomInput}
              onChange={e => { setRoomInput(e.target.value); setError(''); }}
              placeholder="e.g. abc12345"
              maxLength={20}
              onKeyDown={e => e.key === 'Enter' && !loading && handleJoin()}
              style={{ ...inputStyle, borderColor: error ? '#e74c3c' : 'var(--border, #ddd)' }}
            />
            {error && <p style={{ margin: 0, fontSize: 12, color: '#e74c3c' }}>{error}</p>}
            <button
              onClick={handleJoin}
              disabled={loading}
              style={{ ...primaryBtnStyle('#1abc9c'), opacity: loading ? 0.7 : 1 }}
            >
              {loading
                ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Checking room…</>
                : <><LogIn size={16} /> Join Room</>
              }
            </button>
            <button onClick={() => { setMode(null); setError(''); }} style={ghostBtnStyle}>← Back</button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700,
  color: 'var(--text-secondary, #888)',
  textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
};

const inputStyle = {
  flex: 1, padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid var(--border, #ddd)',
  fontSize: 14, fontWeight: 500,
  background: 'var(--bg, #fff)',
  color: 'var(--text-primary, #1e1e1e)',
  outline: 'none', fontFamily: 'inherit', width: '100%',
  boxSizing: 'border-box',
};

const shuffleBtnStyle = {
  padding: '10px 12px', borderRadius: 10,
  border: '1.5px solid var(--border, #ddd)',
  background: 'var(--panel-hover, #f5f5f0)',
  cursor: 'pointer', color: 'var(--text-secondary, #888)',
  display: 'flex', alignItems: 'center', flexShrink: 0,
};

const primaryBtnStyle = (bg) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  padding: '12px 20px', borderRadius: 12, border: 'none',
  background: bg, color: '#fff',
  fontSize: 14, fontWeight: 700, cursor: 'pointer',
  fontFamily: 'Inter, system-ui, sans-serif',
  boxShadow: `0 4px 16px ${bg}55`,
  transition: 'transform 0.1s, box-shadow 0.1s',
});

const ghostBtnStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  padding: '10px 20px', borderRadius: 12,
  border: '1.5px solid var(--border, #ddd)',
  background: 'transparent', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', color: 'var(--text-secondary, #888)',
  fontFamily: 'Inter, system-ui, sans-serif',
};

const dividerStyle = {
  display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0',
};

const errorBoxStyle = {
  background: 'rgba(231,76,60,0.08)',
  border: '1px solid rgba(231,76,60,0.3)',
  borderRadius: 10, padding: '10px 14px',
  fontSize: 12, color: '#c0392b', fontWeight: 500,
  lineHeight: 1.5,
};
