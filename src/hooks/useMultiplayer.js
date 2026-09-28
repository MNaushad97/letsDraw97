/**
 * useMultiplayer — Isolated Socket.io multiplayer hook for letsDraw97
 *
 * Zero-regression guarantee:
 *   This hook is ONLY created when a ?room= URL param is present.
 *   When no roomId is provided, this hook returns null-safe defaults
 *   and opens zero network connections.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getNextPeerColor } from '../lib/randomNames.js';

// ── This points to your Socket.io server ────────────────────────
// Change to your deployed server URL when going to production.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4001';

export function useMultiplayer({ roomId, userId, userName, enabled }) {
  const socketRef = useRef(null);

  const [peers, setPeers]               = useState({});   // { userId: { name, color, x, y } }
  const [isConnected, setIsConnected]   = useState(false);
  const [peerShapes, setPeerShapes]     = useState([]);    // shapes from peers added since join
  const [initialShapes, setInitialShapes] = useState(null); // shapes loaded from Firebase on join

  const peerColorsRef = useRef({}); // userId -> color

  const getPeerColor = useCallback((id) => {
    if (!peerColorsRef.current[id]) {
      peerColorsRef.current[id] = getNextPeerColor();
    }
    return peerColorsRef.current[id];
  }, []);

  useEffect(() => {
    if (!enabled || !roomId || !userId) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join-room', { roomId, userId, name: userName });
    });

    socket.on('disconnect', () => setIsConnected(false));

    // ── Receive initial state when joining ───────────────────────
    socket.on('room-init', ({ shapes, peers: existingPeers }) => {
      setInitialShapes(shapes || []);
      const coloredPeers = {};
      Object.entries(existingPeers || {}).forEach(([id, peer]) => {
        coloredPeers[id] = { ...peer, color: getPeerColor(id) };
      });
      setPeers(coloredPeers);
    });

    // ── Peer joins / leaves ──────────────────────────────────────
    socket.on('peer-joined', ({ userId: id, name }) => {
      setPeers(prev => ({ ...prev, [id]: { name, color: getPeerColor(id), x: -9999, y: -9999 } }));
    });

    socket.on('peer-left', ({ userId: id }) => {
      setPeers(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    });

    // ── Live cursor positions ────────────────────────────────────
    socket.on('peer-cursor-move', ({ userId: id, name, x, y }) => {
      setPeers(prev => ({
        ...prev,
        [id]: { ...prev[id], name, color: getPeerColor(id), x, y },
      }));
    });

    // ── Real-time shape events ───────────────────────────────────
    socket.on('peer-shape-added', ({ shape }) => {
      setPeerShapes(prev => [...prev, shape]);
    });

    socket.on('peer-shape-updated', ({ shape }) => {
      setPeerShapes(prev => prev.map(s => s.id === shape.id ? shape : s));
    });

    socket.on('peer-shape-deleted', ({ shapeId }) => {
      setPeerShapes(prev => prev.filter(s => s.id !== shapeId));
    });

    socket.on('peer-canvas-cleared', () => {
      setPeerShapes([]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setPeers({});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, roomId, userId, userName]);

  // ── Outgoing emitters (throttled cursor, shape events) ─────────
  const cursorThrottle = useRef(null);

  const emitCursorMove = useCallback((x, y) => {
    if (!socketRef.current || !roomId) return;
    if (cursorThrottle.current) return; // throttle to ~60fps
    cursorThrottle.current = setTimeout(() => {
      cursorThrottle.current = null;
      socketRef.current?.emit('cursor-move', { roomId, userId, name: userName, x, y });
    }, 16);
  }, [roomId, userId, userName]);

  const emitShapeAdded = useCallback((shape) => {
    if (!socketRef.current || !roomId) return;
    socketRef.current.emit('shape-added', { roomId, shape });
  }, [roomId]);

  const emitShapeUpdated = useCallback((shape) => {
    if (!socketRef.current || !roomId) return;
    socketRef.current.emit('shape-updated', { roomId, shape });
  }, [roomId]);

  const emitShapeDeleted = useCallback((shapeId) => {
    if (!socketRef.current || !roomId) return;
    socketRef.current.emit('shape-deleted', { roomId, shapeId });
  }, [roomId]);

  const emitCanvasCleared = useCallback(() => {
    if (!socketRef.current || !roomId) return;
    socketRef.current.emit('canvas-cleared', { roomId });
  }, [roomId]);

  return {
    isConnected,
    peers,
    initialShapes,
    peerShapes,
    emitCursorMove,
    emitShapeAdded,
    emitShapeUpdated,
    emitShapeDeleted,
    emitCanvasCleared,
  };
}
