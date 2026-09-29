import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Undo2, Redo2, Trash2, Download, ZoomIn, ZoomOut, Maximize2, Sun, Moon, Copy, Check
} from 'lucide-react';

import Canvas from './components/Canvas.jsx';
import Toolbar, { TOOL_KEY_MAP } from './components/Toolbar.jsx';
import PropertiesPanel from './components/PropertiesPanel.jsx';
import RoomLobby from './components/RoomLobby.jsx';
import PeerCursors from './components/PeerCursors.jsx';
import PresencePanel from './components/PresencePanel.jsx';
import { useMultiplayer, checkRoom } from './hooks/useMultiplayer.js';
import { generateRandomName, getNextPeerColor } from './lib/randomNames.js';
import './index.css';

// ── Read ?room= URL param ─────────────────────────────────────────
function getRoomIdFromURL() {
  return new URLSearchParams(window.location.search).get('room') || null;
}

// ── Generate a stable userId for this browser session ────────────
function getOrCreateUserId() {
  const key = 'letsdraw97-userId';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = 'u_' + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(key, id);
  }
  return id;
}

export default function App() {
  const canvasRef = useRef(null);

  // ── Multiplayer state ────────────────────────────────────────────
  const urlRoomId = useMemo(() => getRoomIdFromURL(), []);
  const userId    = useMemo(() => getOrCreateUserId(), []);
  const myColor   = useMemo(() => getNextPeerColor(), []);

  // Lobby: shown on first load. If ?room= is in URL, validate it first before skipping lobby.
  const [showLobby, setShowLobby]       = useState(true); // always show until validated
  const [lobbyError, setLobbyError]     = useState('');
  const [roomId, setRoomId]             = useState(null);
  const [userName, setUserName]         = useState(() => generateRandomName());
  const [multiplayerEnabled, setMultiplayerEnabled] = useState(false);

  // On mount: if ?room= param exists, validate it then auto-join or show error in lobby
  useEffect(() => {
    if (!urlRoomId) {
      // No room param — just show the lobby normally
      setShowLobby(true);
      return;
    }

    // Validate the room from URL param before entering
    checkRoom(urlRoomId).then(({ exists, offline }) => {
      if (exists || offline) {
        // Valid room — skip the lobby and enter directly
        setRoomId(urlRoomId);
        setMultiplayerEnabled(true);
        setShowLobby(false);
      } else {
        // Room doesn't exist — show lobby with error, clear invalid ?room= from URL
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('room');
        window.history.replaceState({}, '', cleanUrl.toString());
        setLobbyError(`Room "${urlRoomId}" doesn't exist or has expired. Please create a new room or ask for a fresh invite link.`);
        setShowLobby(true);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Current pan/zoom for cursor coordinate conversion
  const [pan, setPanState]              = useState({ x: 0, y: 0 });
  const [zoom, setZoom]                 = useState(100);
  const panRef = useRef({ x: 0, y: 0 });

  // ── Tool state ──────────────────────────────────────────────────
  const [tool, setTool]                     = useState('brush');
  const [color, setColor]                   = useState('#1e1e1e');
  const [backgroundColor, setBackgroundColor] = useState('transparent');
  const [fillStyle, setFillStyle]           = useState('hachure');
  const [brushSize, setBrushSize]           = useState(2);
  const [strokeStyle, setStrokeStyle]       = useState('solid');
  const [sloppiness, setSloppiness]         = useState(1);
  const [fontFamily, setFontFamily]         = useState('hand');
  const [fontSize, setFontSize]             = useState(22);
  const [textAlign, setTextAlign]           = useState('left');
  const [opacity, setOpacity]               = useState(100);

  // ── Selected Shape State ─────────────────────────────────────────
  const [selectedShape, setSelectedShape]   = useState(null);

  // ── History state ────────────────────────────────────────────────
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [copiedRoom, setCopiedRoom] = useState(false);

  // ── Selected Shape sync ──────────────────────────────────────────
  const handleSelectShape = useCallback((shape) => {
    setSelectedShape(shape);
    if (!shape) return;
    if (shape.color) setColor(shape.color);
    if (shape.bg) setBackgroundColor(shape.bg);
    if (shape.fillStyle) setFillStyle(shape.fillStyle);
    if (shape.sz) setBrushSize(shape.sz);
    if (shape.strokeStyle) setStrokeStyle(shape.strokeStyle);
    if (shape.sloppiness !== undefined) setSloppiness(shape.sloppiness);
    if (shape.fontFamily) setFontFamily(shape.fontFamily);
    // NOTE: We intentionally do NOT sync shape.fs → fontSize state.
    // Reason: selecting/resizing a text shape would pollute the "default"
    // font size for NEW text boxes. The PropertiesPanel reads selectedShape.fs
    // directly for display when a text shape is selected.
    if (shape.textAlign) setTextAlign(shape.textAlign);
    if (shape.opacity !== undefined) setOpacity(shape.opacity);
  }, []);

  // ── Theme ─────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => localStorage.getItem('letsdraw-theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('letsdraw-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  // ── Toast notification ───────────────────────────────────────────
  const [toast, setToast] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setToastVisible(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 1400);
  }, []);

  // ── History change callback ──────────────────────────────────────
  const handleHistoryChange = useCallback(({ canUndo: u, canRedo: r }) => {
    setCanUndo(u);
    setCanRedo(r);
  }, []);

  const handleCopyRoomId = useCallback(() => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId).then(() => {
      setCopiedRoom(true);
      showToast(`📋 Room ID "${roomId}" copied!`);
      setTimeout(() => setCopiedRoom(false), 2000);
    });
  }, [roomId, showToast]);

  // ── Keyboard shortcuts ───────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.metaKey || e.ctrlKey) return;
      const mapped = TOOL_KEY_MAP[e.key.toLowerCase()];
      if (mapped) setTool(mapped);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleUndo     = () => { canvasRef.current?.undo(); showToast('↩ Undo'); };
  const handleRedo     = () => { canvasRef.current?.redo(); showToast('↪ Redo'); };
  const handleClear    = () => {
    canvasRef.current?.clear();
    showToast('🗑 Canvas cleared');
    emitCanvasCleared?.();
  };
  const handleDownload = () => { canvasRef.current?.download(theme); showToast('💾 Image saved!'); };
  const handleLayerChange = (action) => canvasRef.current?.changeLayer(action);

  const handleZoomIn    = () => setZoom((z) => Math.min(z + 10, 400));
  const handleZoomOut   = () => setZoom((z) => Math.max(z - 10, 15));
  const handleZoomReset = () => setZoom(100);

  // ── Multiplayer hook ─────────────────────────────────────────────
  // ── Direct canvas callbacks for peer events ────────────────────────
  // Using useCallback + ref so the socket handler always has the latest ref
  const handlePeerShapeAdded = useCallback((shape) => {
    canvasRef.current?.mergePeerShapes?.([shape]);
  }, []);

  const handlePeerShapeUpdated = useCallback((shape) => {
    canvasRef.current?.updatePeerShape?.(shape);
  }, []);

  const handlePeerShapeDeleted = useCallback((shapeId) => {
    canvasRef.current?.deletePeerShape?.(shapeId);
  }, []);

  const handlePeerCanvasCleared = useCallback(() => {
    canvasRef.current?.loadShapes?.([]);
  }, []);

  const handlePeerShapesReordered = useCallback((shapes) => {
    canvasRef.current?.reorderShapes?.(shapes);
  }, []);

  const handleInitialShapes = useCallback((shapes) => {
    canvasRef.current?.loadShapes?.(shapes);
  }, []);

  const {
    isConnected,
    peers,
    emitCursorMove,
    emitShapeAdded,
    emitShapeUpdated,
    emitShapeDeleted,
    emitCanvasCleared,
    emitShapesReordered,
  } = useMultiplayer({
    roomId,
    userId,
    userName,
    enabled: multiplayerEnabled,
    onPeerShapeAdded:        handlePeerShapeAdded,
    onPeerShapeUpdated:      handlePeerShapeUpdated,
    onPeerShapeDeleted:      handlePeerShapeDeleted,
    onPeerCanvasCleared:     handlePeerCanvasCleared,
    onPeerShapesReordered:   handlePeerShapesReordered,
    onInitialShapes:         handleInitialShapes,
  });

  // Sync pan/zoom for cursor coordinate conversion
  const handlePanChange = useCallback((newPan) => {
    panRef.current = newPan;
    setPanState(newPan);
  }, []);

  const handleZoomChange = useCallback((newZoom) => {
    setZoom(newZoom);
  }, []);

  // ── Lobby handlers ───────────────────────────────────────────────
  const handleJoinRoom = useCallback(({ roomId: rid, userName: uname }) => {
    setUserName(uname);
    setRoomId(rid);
    setMultiplayerEnabled(true);
    setShowLobby(false);
    // Update URL so users can share the link
    const url = new URL(window.location.href);
    url.searchParams.set('room', rid);
    window.history.replaceState({}, '', url.toString());
    showToast('🎉 Room joined! Share the link with teammates.');
  }, [showToast]);

  const handleSolo = useCallback(() => {
    setShowLobby(false);
    setMultiplayerEnabled(false);
  }, []);

  // ── Cursor move handler (for multiplayer) ────────────────────────
  const handleCursorMove = useCallback((x, y) => {
    if (multiplayerEnabled) emitCursorMove(x, y);
  }, [multiplayerEnabled, emitCursorMove]);

  return (
    <div className="app">
      {/* Room Lobby (only shown when no ?room= and user hasn't chosen yet) */}
      {showLobby && (
        <RoomLobby onJoin={handleJoinRoom} onSolo={handleSolo} prefillError={lobbyError} />
      )}

      {/* Dot-grid background */}
      <div className="canvas-grid" aria-hidden="true" />

      {/* Logo + Theme Toggle */}
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 100, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="app-logo" aria-label="letsDraw97">
          <span className="app-logo-icon">✏️</span>
          <span className="app-logo-text">letsDraw97</span>
        </div>
        <button
          id="theme-toggle-btn"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Multiplayer indicator badge with copy button */}
        {multiplayerEnabled && roomId && (
          <button
            id="copy-room-badge-btn"
            onClick={handleCopyRoomId}
            title="Click to copy Room ID directly"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: isConnected ? 'rgba(46,204,113,0.15)' : 'rgba(231,76,60,0.12)',
              border: `1px solid ${isConnected ? '#2ecc71' : '#e74c3c'}`,
              borderRadius: 20, padding: '4px 10px',
              fontSize: 11, fontWeight: 700,
              color: isConnected ? '#27ae60' : '#c0392b',
              fontFamily: 'Inter, system-ui, sans-serif',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isConnected ? '#2ecc71' : '#e74c3c',
              animation: isConnected ? 'pulse 2s infinite' : 'none',
              flexShrink: 0,
            }} />
            <span>{isConnected ? `Room: ${roomId}` : 'Reconnecting…'}</span>
            {copiedRoom ? <Check size={12} color="#27ae60" /> : <Copy size={12} />}
          </button>
        )}
      </div>

      {/* Top Toolbar */}
      <Toolbar activeTool={tool} onChange={setTool} />

      {/* Presence Panel (only in multiplayer mode) */}
      {multiplayerEnabled && roomId && (
        <PresencePanel
          peers={peers}
          myName={userName}
          myColor={myColor}
          isConnected={isConnected}
          roomId={roomId}
        />
      )}

      {/* Canvas */}
      <div className="canvas-container" style={{ position: 'relative' }}>
        <Canvas
          ref={canvasRef}
          tool={tool}
          color={color}
          backgroundColor={backgroundColor}
          fillStyle={fillStyle}
          brushSize={brushSize}
          strokeStyle={strokeStyle}
          sloppiness={sloppiness}
          fontFamily={fontFamily}
          fontSize={fontSize}
          textAlign={textAlign}
          opacity={opacity}
          zoom={zoom}
          onHistoryChange={handleHistoryChange}
          onToolChange={setTool}
          onSelectShape={handleSelectShape}
          onZoomChange={handleZoomChange}
          onPanChange={handlePanChange}
          onCursorMove={handleCursorMove}
          onShapeAdded={multiplayerEnabled ? emitShapeAdded : undefined}
          onShapeUpdated={multiplayerEnabled ? emitShapeUpdated : undefined}
          onShapeDeleted={multiplayerEnabled ? emitShapeDeleted : undefined}
          onShapesReordered={multiplayerEnabled ? emitShapesReordered : undefined}
        />

        {/* Peer cursors overlay (only in multiplayer) */}
        {multiplayerEnabled && (
          <PeerCursors peers={peers} pan={pan} zoom={zoom} />
        )}
      </div>

      {/* Properties Panel */}
      <PropertiesPanel
        activeTool={tool}
        selectedShape={selectedShape}
        color={color}                       onColorChange={setColor}
        backgroundColor={backgroundColor}   onBackgroundColorChange={setBackgroundColor}
        fillStyle={fillStyle}               onFillStyleChange={setFillStyle}
        brushSize={brushSize}               onBrushSizeChange={setBrushSize}
        strokeStyle={strokeStyle}           onStrokeStyleChange={setStrokeStyle}
        sloppiness={sloppiness}             onSloppinessChange={setSloppiness}
        fontFamily={fontFamily}             onFontFamilyChange={setFontFamily}
        fontSize={fontSize}                 onFontSizeChange={setFontSize}
        textAlign={textAlign}               onTextAlignChange={setTextAlign}
        opacity={opacity}                   onOpacityChange={setOpacity}
        onLayerChange={handleLayerChange}
      />

      {/* Zoom controls */}
      <div className="bottom-bar" role="group" aria-label="Zoom controls">
        <button id="zoom-out-btn" className="icon-btn" onClick={handleZoomOut} title="Zoom out (−)" aria-label="Zoom out">
          <ZoomOut size={14} />
        </button>
        <button id="zoom-reset-btn" className="zoom-label" onClick={handleZoomReset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
          {zoom}%
        </button>
        <button id="zoom-in-btn" className="icon-btn" onClick={handleZoomIn} title="Zoom in (+)" aria-label="Zoom in">
          <ZoomIn size={14} />
        </button>
        <div className="top-bar-divider" style={{ margin: '0 2px' }} />
        <button id="zoom-fit-btn" className="icon-btn" onClick={handleZoomReset} title="Fit to screen" aria-label="Fit to screen">
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Corner Actions */}
      <div className="corner-actions">
        <button id="undo-btn" className="action-btn" onClick={handleUndo} disabled={!canUndo} aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)" style={{ opacity: canUndo ? 1 : 0.35 }}>
          <Undo2 size={14} /> <span className="btn-label">Undo</span>
        </button>
        <button id="redo-btn" className="action-btn" onClick={handleRedo} disabled={!canRedo} aria-label="Redo (Ctrl+Y)" title="Redo (Ctrl+Y)" style={{ opacity: canRedo ? 1 : 0.35 }}>
          <Redo2 size={14} /> <span className="btn-label">Redo</span>
        </button>
        <button id="clear-btn" className="action-btn danger" onClick={handleClear} aria-label="Clear canvas" title="Clear canvas">
          <Trash2 size={14} /> <span className="btn-label">Clear</span>
        </button>
        <button id="download-btn" className="action-btn primary" onClick={handleDownload} aria-label="Download image" title="Export as PNG">
          <Download size={14} /> <span className="btn-label">Export</span>
        </button>
      </div>

      {/* Toast */}
      <div role="status" aria-live="polite" className={`toast${toastVisible ? ' visible' : ''}`}>
        {toast}
      </div>
    </div>
  );
}
