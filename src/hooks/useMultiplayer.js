/**
 * useMultiplayer — Socket.io multiplayer hook for letsDraw97
 *
 * Architecture: callback-based peer events (not state-based).
 * Each peer event immediately calls the corresponding canvas ref method,
 * so shapes update in real-time without going through React state diffing.
 *
 * Zero-regression: only active when enabled=true && roomId is set.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getNextPeerColor } from '../lib/randomNames.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4001';

/**
 * checkRoom — One-shot socket connection to verify if a room exists on the server.
 * Resolves to { exists: boolean }.
 * Used before entering a room from the Join flow or URL param detection.
 */
export function checkRoom(roomId) {
  return new Promise((resolve) => {
    if (!roomId) { resolve({ exists: false }); return; }

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4001';
    const tempSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 2,
    });

    const timeout = setTimeout(() => {
      tempSocket.disconnect();
      // If server unreachable, fail open (let user in — connectivity issue)
      resolve({ exists: true, offline: true });
    }, 5000);

    tempSocket.on('connect', () => {
      tempSocket.emit('check-room', { roomId });
    });

    tempSocket.on('room-check-result', ({ exists }) => {
      clearTimeout(timeout);
      tempSocket.disconnect();
      resolve({ exists });
    });

    tempSocket.on('connect_error', () => {
      clearTimeout(timeout);
      tempSocket.disconnect();
      resolve({ exists: true, offline: true }); // fail open
    });
  });
}

export function useMultiplayer({
  roomId,
  userId,
  userName,
  enabled,
  // Direct canvas callbacks — called immediately on socket event receipt
  onPeerShapeAdded,
  onPeerShapeUpdated,
  onPeerShapeDeleted,
  onPeerCanvasCleared,
  onPeerShapesReordered,
  onPeerCanvasFullSync,
  onInitialShapes,
  onRoomFull,
}) {
  const socketRef       = useRef(null);
  const [socket, setSocket]           = useState(null);
  const [peers, setPeers]             = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const peerColorsRef = useRef({});

  // Stable refs so socket handlers always see latest callbacks
  const cbAdded    = useRef(onPeerShapeAdded);
  const cbUpdated  = useRef(onPeerShapeUpdated);
  const cbDeleted  = useRef(onPeerShapeDeleted);
  const cbCleared  = useRef(onPeerCanvasCleared);
  const cbReordered  = useRef(onPeerShapesReordered);
  const cbFullSync   = useRef(onPeerCanvasFullSync);
  const cbInitial   = useRef(onInitialShapes);
  const cbRoomFull  = useRef(onRoomFull);

  useEffect(() => { cbAdded.current   = onPeerShapeAdded;   }, [onPeerShapeAdded]);
  useEffect(() => { cbUpdated.current = onPeerShapeUpdated; }, [onPeerShapeUpdated]);
  useEffect(() => { cbDeleted.current = onPeerShapeDeleted; }, [onPeerShapeDeleted]);
  useEffect(() => { cbCleared.current = onPeerCanvasCleared;}, [onPeerCanvasCleared]);
  useEffect(() => { cbReordered.current = onPeerShapesReordered;}, [onPeerShapesReordered]);
  useEffect(() => { cbFullSync.current  = onPeerCanvasFullSync; }, [onPeerCanvasFullSync]);
  useEffect(() => { cbInitial.current  = onInitialShapes;    }, [onInitialShapes]);
  useEffect(() => { cbRoomFull.current = onRoomFull;         }, [onRoomFull]);

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
    setSocket(socket);

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join-room', { roomId, userId, name: userName });
    });

    socket.on('disconnect', () => setIsConnected(false));

    socket.on('room-full', ({ message }) => {
      cbRoomFull.current?.(message);
      socket.disconnect();
      setIsConnected(false);
    });

    // ── Room init: load existing shapes + existing peers ──────────
    socket.on('room-init', ({ shapes, peers: existingPeers }) => {
      // Load saved shapes into canvas
      if (shapes && shapes.length > 0) {
        cbInitial.current?.(shapes);
      }
      // Populate peers map
      const coloredPeers = {};
      Object.entries(existingPeers || {}).forEach(([id, peer]) => {
        coloredPeers[id] = {
          name: peer.name,
          socketId: peer.socketId,
          audioOn: peer.audioOn || false,
          videoOn: peer.videoOn || false,
          color: getPeerColor(id),
          x: -9999,
          y: -9999
        };
      });
      setPeers(coloredPeers);
    });

    // ── Peer joins / leaves ───────────────────────────────────────
    socket.on('peer-joined', ({ userId: id, name, socketId, audioOn, videoOn }) => {
      setPeers(prev => ({
        ...prev,
        [id]: { 
          name, 
          socketId, 
          audioOn: audioOn || false, 
          videoOn: videoOn || false, 
          color: getPeerColor(id), 
          x: -9999, 
          y: -9999 
        },
      }));
    });

    socket.on('peer-left', ({ userId: id }) => {
      setPeers(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    });

    // ── Live cursor ───────────────────────────────────────────────
    socket.on('peer-cursor-move', ({ userId: id, name, x, y }) => {
      setPeers(prev => ({
        ...prev,
        [id]: { ...(prev[id] || {}), name, color: getPeerColor(id), x, y },
      }));
    });

    // ── Media State ───────────────────────────────────────────────
    socket.on('peer-media-state', ({ userId: id, socketId: sid, audioOn, videoOn }) => {
      setPeers(prev => {
        if (prev[id]) {
          return {
            ...prev,
            [id]: { ...prev[id], audioOn, videoOn, socketId: sid || prev[id].socketId },
          };
        }
        // Fallback search by socketId if id doesn't match
        const foundEntry = Object.entries(prev).find(([_, p]) => p.socketId === sid);
        if (foundEntry) {
          return {
            ...prev,
            [foundEntry[0]]: { ...foundEntry[1], audioOn, videoOn },
          };
        }
        return prev;
      });
    });

    // ── Shape events: call canvas ref directly ────────────────────
    socket.on('peer-shape-added',   ({ shape })   => cbAdded.current?.(shape));
    socket.on('peer-shape-updated', ({ shape })   => cbUpdated.current?.(shape));
    socket.on('peer-shape-deleted', ({ shapeId }) => cbDeleted.current?.(shapeId));
    socket.on('peer-canvas-cleared', ()           => cbCleared.current?.());
    socket.on('peer-shapes-reordered', ({ shapes }) => cbReordered.current?.(shapes));
    socket.on('peer-canvas-full-sync', ({ shapes }) => cbFullSync.current?.(shapes));

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setPeers({});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, roomId, userId, userName]);

  // ── Outgoing emitters ─────────────────────────────────────────
  const cursorThrottle = useRef(null);

  const emitCursorMove = useCallback((x, y) => {
    if (!socketRef.current || !roomId) return;
    if (cursorThrottle.current) return;
    cursorThrottle.current = setTimeout(() => {
      cursorThrottle.current = null;
      socketRef.current?.emit('cursor-move', { roomId, userId, name: userName, x, y });
    }, 16);
  }, [roomId, userId, userName]);

  const emitShapeAdded   = useCallback((shape)   => socketRef.current?.emit('shape-added',   { roomId, shape }),   [roomId]);
  const emitShapeUpdated = useCallback((shape)   => socketRef.current?.emit('shape-updated', { roomId, shape }),   [roomId]);
  const emitShapeDeleted = useCallback((shapeId) => socketRef.current?.emit('shape-deleted', { roomId, shapeId }), [roomId]);
  const emitCanvasCleared = useCallback(()       => socketRef.current?.emit('canvas-cleared', { roomId }),         [roomId]);
  const emitShapesReordered  = useCallback((shapes) => socketRef.current?.emit('shapes-reordered',  { roomId, shapes }), [roomId]);
  const emitCanvasFullSync   = useCallback((shapes) => socketRef.current?.emit('canvas-full-sync',   { roomId, shapes }), [roomId]);

  const emitMediaState = useCallback((audioOn, videoOn) => {
    socketRef.current?.emit('webrtc-media-state', { roomId, userId, audioOn, videoOn });
  }, [roomId, userId]);

  return {
    socket,
    isConnected,
    peers,
    emitCursorMove,
    emitShapeAdded,
    emitShapeUpdated,
    emitShapeDeleted,
    emitCanvasCleared,
    emitShapesReordered,
    emitCanvasFullSync,
    emitMediaState,
  };
}
