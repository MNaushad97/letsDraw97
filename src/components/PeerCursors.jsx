/**
 * PeerCursors — Renders floating teammate cursors on top of the canvas.
 * Uses world coordinates (x, y) from peers map and converts to screen coords.
 */

function CursorIcon({ color }) {
  return (
    <svg
      width="22" height="22" viewBox="0 0 22 22" fill="none"
      style={{ display: 'block', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))' }}
    >
      <path
        d="M4 2L18 9.5L11.5 12.5L9 19L4 2Z"
        fill={color}
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PeerCursors({ peers, pan, zoom }) {
  const scale = (zoom || 100) / 100;
  const panX  = pan?.x || 0;
  const panY  = pan?.y || 0;

  const activePeers = Object.entries(peers).filter(
    ([, peer]) => peer.x !== undefined && peer.x > -500
  );

  if (activePeers.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 300,
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      {activePeers.map(([id, peer]) => {
        // Convert world coords → screen coords
        const screenX = peer.x * scale + panX;
        const screenY = peer.y * scale + panY;

        return (
          <div
            key={id}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              // Use transform instead of left/top for GPU-accelerated smooth movement
              transform: `translate(${screenX}px, ${screenY}px)`,
              transition: 'transform 0.06s linear',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 2,
              willChange: 'transform',
            }}
          >
            <CursorIcon color={peer.color || '#6c63ff'} />
            <span
              style={{
                background: peer.color || '#6c63ff',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                fontFamily: 'Inter, system-ui, sans-serif',
                padding: '2px 8px',
                borderRadius: 5,
                whiteSpace: 'nowrap',
                letterSpacing: 0.2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                userSelect: 'none',
                marginLeft: 4,
              }}
            >
              {peer.name || 'Guest'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
