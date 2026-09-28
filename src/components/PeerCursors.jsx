/**
 * PeerCursors — Renders floating teammate cursors on top of the canvas.
 * Receives `peers` map from useMultiplayer hook.
 * Fully independent component — no canvas logic touched.
 */
import { useEffect, useRef } from 'react';

function CursorIcon({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ display: 'block', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
      <path
        d="M3 2L17 8.5L10.5 11L8 17L3 2Z"
        fill={color}
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PeerCursors({ peers, pan, zoom }) {
  const scale = (zoom || 100) / 100;

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
      {Object.entries(peers).map(([id, peer]) => {
        if (peer.x === undefined || peer.x < -999) return null;

        // Convert world coords → screen coords
        const screenX = peer.x * scale + (pan?.x || 0);
        const screenY = peer.y * scale + (pan?.y || 0);

        return (
          <div
            key={id}
            style={{
              position: 'absolute',
              left: screenX,
              top: screenY,
              transform: 'translate(0, 0)',
              transition: 'left 0.05s linear, top 0.05s linear',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 2,
            }}
          >
            <CursorIcon color={peer.color} />
            <span
              style={{
                background: peer.color,
                color: '#fff',
                fontSize: 11,
                fontWeight: 600,
                fontFamily: 'Inter, system-ui, sans-serif',
                padding: '2px 6px',
                borderRadius: 4,
                whiteSpace: 'nowrap',
                letterSpacing: 0.2,
                boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                userSelect: 'none',
              }}
            >
              {peer.name || 'Anonymous'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
