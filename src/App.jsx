import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Undo2, Redo2, Trash2, Download, ZoomIn, ZoomOut, Maximize2, Sun, Moon, Copy, Check, MoreHorizontal
} from 'lucide-react';

import Canvas from './components/Canvas.jsx';
import Toolbar, { TOOL_KEY_MAP } from './components/Toolbar.jsx';
import PropertiesPanel from './components/PropertiesPanel.jsx';
import RoomLobby from './components/RoomLobby.jsx';
import PeerCursors from './components/PeerCursors.jsx';
import RoomPanel from './components/RoomPanel.jsx';
import MobileBottomDock from './components/MobileBottomDock.jsx';
import { useMultiplayer, checkRoom } from './hooks/useMultiplayer.js';
import { useWebRTCMesh } from './hooks/useWebRTCMesh.js';
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
  // lobbyChecking: true while async URL-room validation is in flight → hide lobby spinner
  const [showLobby, setShowLobby]       = useState(!getRoomIdFromURL()); // hide until URL check done if room in URL
  const [lobbyChecking, setLobbyChecking] = useState(!!getRoomIdFromURL());
  const [lobbyError, setLobbyError]     = useState('');
  const [lobbyPrefillRoomId, setLobbyPrefillRoomId] = useState(null);
  const [roomId, setRoomId]             = useState(null);
  const [userName, setUserName]         = useState(() => generateRandomName());
  const [multiplayerEnabled, setMultiplayerEnabled] = useState(false);

  // On mount: if ?room= param exists, validate it then show name-entry lobby
  useEffect(() => {
    if (!urlRoomId) {
      // No room param — just show the lobby normally
      setShowLobby(true);
      setLobbyChecking(false);
      return;
    }

    // Validate the room from URL param before showing lobby
    checkRoom(urlRoomId).then(({ exists, offline }) => {
      setLobbyChecking(false);
      if (exists || offline) {
        // Valid room — show lobby pre-filled with the room id so user picks a name
        setLobbyPrefillRoomId(urlRoomId);
        setShowLobby(true);
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
  const [fillStyle, setFillStyle]           = useState('none');
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('letsdraw-theme', theme);
  }, [theme]);

  // Close mobile menu on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (!e.target.closest('.corner-actions-mobile')) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('pointerdown', handleOutside);
    return () => window.removeEventListener('pointerdown', handleOutside);
  }, []);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  // ── Toast notification ───────────────────────────────────────────
  const [toast, setToast] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setToastVisible(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 1800);
  }, []);

  const handleFillStyleChange = useCallback((newStyle) => {
    if (newStyle !== 'none' && (backgroundColor === 'transparent' || !backgroundColor)) {
      showToast('Select a background color first for fill!');
      setBackgroundColor('#bbdefb');
    }
    setFillStyle(newStyle);
  }, [backgroundColor, showToast]);

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

  const handlePeerCanvasFullSync = useCallback((shapes) => {
    if (canvasRef.current?.syncPeerFullCanvas) {
      canvasRef.current.syncPeerFullCanvas(shapes);
    } else {
      canvasRef.current?.loadShapes?.(shapes);
    }
  }, []);

  const handleInitialShapes = useCallback((shapes) => {
    canvasRef.current?.loadShapes?.(shapes);
  }, []);

  const handleRoomFull = useCallback((message) => {
    showToast(message || 'Room is full! Maximum 4 people allowed.');
    setMultiplayerEnabled(false);
    setShowLobby(true);
    setRoomId(null);
    
    // Clear the room from the URL
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState({}, '', url.toString());
  }, [showToast]);

  const {
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
    reconnect,
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
    onPeerCanvasFullSync:     handlePeerCanvasFullSync,
    onInitialShapes:         handleInitialShapes,
    onRoomFull:              handleRoomFull,
  });

  // ── WebRTC Mesh Integration ──────────────────────────────────────
  const { localStream, remoteStreams, toggleAudio, toggleVideo, requestMedia } = useWebRTCMesh(
    multiplayerEnabled ? socket : null,
    roomId,
    userId,
    userName
  );

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
      {/* Validating invite link — show minimal loading screen */}
      {lobbyChecking && (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          background: 'var(--bg, #f5f5f0)', fontFamily: 'Inter, system-ui, sans-serif',
          gap: 12,
        }}>
          <div style={{ fontSize: 32 }}>✏️</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary, #888)' }}>Checking invite link…</div>
        </div>
      )}

      {/* Room Lobby (only shown when lobby check done and user hasn't entered yet) */}
      {!lobbyChecking && showLobby && (
        <RoomLobby onJoin={handleJoinRoom} onSolo={handleSolo} prefillError={lobbyError} prefillRoomId={lobbyPrefillRoomId} />
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
          className="theme-toggle-btn desktop-only"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* Top Toolbar */}
      <Toolbar activeTool={tool} onChange={setTool} />

      {/* Unified Room Panel (only in multiplayer mode) */}
      {multiplayerEnabled && roomId && (
        <RoomPanel
          peers={peers}
          myName={userName}
          myColor={myColor}
          isConnected={isConnected}
          roomId={roomId}
          localStream={localStream}
          remoteStreams={remoteStreams}
          userName={userName}
          toggleAudio={toggleAudio}
          toggleVideo={toggleVideo}
          requestMedia={requestMedia}
          emitMediaState={emitMediaState}
          reconnect={reconnect}
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
          onCanvasSync={multiplayerEnabled ? emitCanvasFullSync : undefined}
        />

        {/* Peer cursors overlay (only in multiplayer) */}
        {multiplayerEnabled && (
          <PeerCursors peers={peers} pan={pan} zoom={zoom} />
        )}
      </div>

      {/* Properties Panel (Desktop) */}
      <PropertiesPanel
        activeTool={tool}
        selectedShape={selectedShape}
        color={color}                       onColorChange={setColor}
        backgroundColor={backgroundColor}   onBackgroundColorChange={setBackgroundColor}
        fillStyle={fillStyle}               onFillStyleChange={handleFillStyleChange}
        brushSize={brushSize}               onBrushSizeChange={setBrushSize}
        strokeStyle={strokeStyle}           onStrokeStyleChange={setStrokeStyle}
        sloppiness={sloppiness}             onSloppinessChange={setSloppiness}
        fontFamily={fontFamily}             onFontFamilyChange={setFontFamily}
        fontSize={fontSize}                 onFontSizeChange={setFontSize}
        textAlign={textAlign}               onTextAlignChange={setTextAlign}
        opacity={opacity}                   onOpacityChange={setOpacity}
        onLayerChange={handleLayerChange}
      />

      {/* Mobile Bottom Dock & Properties Experience (Small Devices) */}
      <MobileBottomDock
        activeTool={tool}                   onToolChange={setTool}
        selectedShape={selectedShape}       onSelectShape={setSelectedShape}
        color={color}                       onColorChange={setColor}
        backgroundColor={backgroundColor}   onBackgroundColorChange={setBackgroundColor}
        fillStyle={fillStyle}               onFillStyleChange={handleFillStyleChange}
        brushSize={brushSize}               onBrushSizeChange={setBrushSize}
        strokeStyle={strokeStyle}           onStrokeStyleChange={setStrokeStyle}
        sloppiness={sloppiness}             onSloppinessChange={setSloppiness}
        fontFamily={fontFamily}             onFontFamilyChange={setFontFamily}
        fontSize={fontSize}                 onFontSizeChange={setFontSize}
        textAlign={textAlign}               onTextAlignChange={setTextAlign}
        opacity={opacity}                   onOpacityChange={setOpacity}
        onLayerChange={handleLayerChange}
        onDeleteShape={() => canvasRef.current?.deleteSelectedShape?.()}
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

      {/* Corner Actions (Desktop) */}
      <div className="corner-actions desktop-only">
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

      {/* Mobile Top-Right Actions Pill (Inspired by Image 3: [ Undo ] [ Redo ] [ ... ]) */}
      <div className="corner-actions-mobile mobile-only">
        <div className="mobile-actions-pill">
          <button className="mobile-action-btn" onClick={handleUndo} disabled={!canUndo} title="Undo">
            <Undo2 size={16} />
          </button>
          <button className="mobile-action-btn" onClick={handleRedo} disabled={!canRedo} title="Redo">
            <Redo2 size={16} />
          </button>
          <button
            className={`mobile-action-btn ${mobileMenuOpen ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(m => !m)}
            title="More Actions"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>

        {/* Floating popover menu revealing Theme, Export, Clear */}
        {mobileMenuOpen && (
          <div className="mobile-actions-popover" onClick={(e) => e.stopPropagation()}>
            <button className="mobile-popover-item" onClick={() => { toggleTheme(); setMobileMenuOpen(false); }} title="Toggle Theme">
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <button className="mobile-popover-item" onClick={() => { handleDownload(); setMobileMenuOpen(false); }} title="Export Image">
              <Download size={15} />
              <span>Export</span>
            </button>
            <button className="mobile-popover-item danger" onClick={() => { handleClear(); setMobileMenuOpen(false); }} title="Clear Canvas">
              <Trash2 size={15} />
              <span>Clear Canvas</span>
            </button>
          </div>
        )}
      </div>

      {/* Toast */}
      <div role="status" aria-live="polite" className={`toast${toastVisible ? ' visible' : ''}`}>
        {toast}
      </div>
    </div>
  );
}
