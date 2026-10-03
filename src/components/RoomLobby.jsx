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

export default function RoomLobby({ onJoin, onSolo, prefillError, prefillRoomId = null }) {
  // If a room id came from URL param, drop straight into 'join' mode with it pre-filled
  const [mode, setMode]           = useState(prefillRoomId ? 'join' : null); // null | 'create' | 'join'
  const [roomInput, setRoomInput] = useState(prefillRoomId || '');
  const [nameInput, setNameInput] = useState('');
  const [error, setError]         = useState(prefillError || '');
  const [loading, setLoading]     = useState(false);

  const handleCreate = () => {
    const name = nameInput.trim();
    if (!name) {
      setError('Please enter your name or click "Generate Alias" first.');
      return;
    }
    setError('');
    const roomId = generateRoomId();
    onJoin({ roomId, userName: name, isNewRoom: true });
  };

  const handleStartCreate = () => {
    const name = nameInput.trim();
    if (!name) {
      setError('Please enter your name or click "Generate Alias" first.');
      return;
    }
    setError('');
    const roomId = generateRoomId();
    onJoin({ roomId, userName: name, isNewRoom: true });
  };

  const handleJoin = async () => {
    const name = nameInput.trim();
    if (!name) {
      setError('Please enter your name or click "Generate Alias" first.');
      return;
    }

    // If prefillRoomId is set, the room was already validated by App.jsx — skip re-check
    if (prefillRoomId) {
      setError('');
      onJoin({ roomId: prefillRoomId, userName: name, isNewRoom: false });
      return;
    }

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
        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>✏️</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary, #1e1e1e)', letterSpacing: -0.5 }}>
            Select Room
          </h1>
        </div>

        {/* Name Field */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Your Name</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={nameInput}
              onChange={e => { setNameInput(e.target.value); setError(''); }}
              placeholder="Enter your name..."
              maxLength={32}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (!mode) handleStartCreate();
                  else if (mode === 'create') handleCreate();
                  else if (mode === 'join') handleJoin();
                }
              }}
              style={{
                ...inputStyle,
                borderColor: (error && !nameInput.trim()) ? '#e74c3c' : 'var(--border, #ddd)',
              }}
            />
            <button
              type="button"
              className="alias-btn"
              onClick={() => { setNameInput(generateRandomName()); setError(''); }}
              title="Generate a random alias"
              style={aliasBtnStyle}
            >
              <Shuffle size={14} />
              <span>Generate Alias</span>
            </button>
          </div>
        </div>

        {/* Mode Selector */}
        {!mode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {error && (
              <div style={errorBoxStyle}>{error}</div>
            )}
            
            {/* First Row: Create and Join */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={handleStartCreate} style={{ ...primaryBtnStyle('#6c63ff'), padding: '12px 10px' }}>
                <Users size={16} /> Create New
              </button>
              <button onClick={() => { setMode('join'); setError(''); }} style={{ ...primaryBtnStyle('#1abc9c'), padding: '12px 10px' }}>
                <LogIn size={16} /> Join Existing
              </button>
            </div>

            <div style={dividerStyle}>
              <div style={{ flex: 1, height: 1, background: 'var(--border, #eee)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-secondary, #aaa)' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border, #eee)' }} />
            </div>

            {/* Last Row: Try Blank Canvas */}
            <button onClick={onSolo} style={ghostBtnStyle}>
              <Pencil size={14} /> Try Blank Canvas
            </button>
          </div>
        )}

        {/* Create Room */}
        {mode === 'create' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {error && <div style={errorBoxStyle}>{error}</div>}
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary, #888)', textAlign: 'center' }}>
              A unique Room ID will be generated.<br />Share the invite link with teammates!
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => setMode(null)} style={{ ...ghostBtnStyle, padding: '12px 10px' }}>← Back</button>
              <button onClick={handleCreate} style={{ ...primaryBtnStyle('#6c63ff'), padding: '12px 10px' }}>
                <ArrowRight size={16} /> Create & Enter
              </button>
            </div>
          </div>
        )}

        {/* Join Room */}
        {mode === 'join' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {prefillRoomId
          ? <div style={{ background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#6c63ff', marginBottom: 4 }}>
              🔗 You were invited to join room <strong>{prefillRoomId}</strong>. Enter your name to proceed.
            </div>
          : <label style={labelStyle}>Room ID</label>
        }
            {!prefillRoomId && (
              <input
                value={roomInput}
                onChange={e => { setRoomInput(e.target.value); setError(''); }}
                placeholder="e.g. abc12345"
                maxLength={20}
                onKeyDown={e => e.key === 'Enter' && !loading && handleJoin()}
                style={{ ...inputStyle, borderColor: error ? '#e74c3c' : 'var(--border, #ddd)' }}
              />
            )}
            {error && <div style={errorBoxStyle}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: !prefillRoomId ? '1fr 1fr' : '1fr', gap: 10 }}>
              {!prefillRoomId && (
                <button onClick={() => { setMode(null); setError(''); }} style={{ ...ghostBtnStyle, padding: '12px 10px' }}>← Back</button>
              )}
              <button
                onClick={handleJoin}
                disabled={loading}
                style={{ ...primaryBtnStyle('#1abc9c'), opacity: loading ? 0.7 : 1, padding: '12px 10px' }}
              >
                {loading
                  ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Checking…</>
                  : <><LogIn size={16} /> Join Room</>
                }
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .alias-btn:hover {
          background: var(--border, #e2e2dc) !important;
          border-color: #bbb !important;
        }
        .alias-btn:active {
          transform: scale(0.97);
        }
      `}</style>
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

const aliasBtnStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid var(--border, #ddd)',
  background: 'var(--panel-hover, #f5f5f0)',
  cursor: 'pointer', color: 'var(--text-primary, #1e1e1e)',
  fontSize: 13, fontWeight: 600,
  whiteSpace: 'nowrap', flexShrink: 0,
  transition: 'all 0.15s ease',
  fontFamily: 'Inter, system-ui, sans-serif',
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
