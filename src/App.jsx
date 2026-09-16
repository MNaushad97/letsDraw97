import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Undo2, Redo2, Trash2, Download, ZoomIn, ZoomOut, Maximize2, Sun, Moon
} from 'lucide-react';

import Canvas from './components/Canvas.jsx';
import Toolbar, { TOOL_KEY_MAP } from './components/Toolbar.jsx';
import PropertiesPanel from './components/PropertiesPanel.jsx';
import './index.css';

export default function App() {
  const canvasRef = useRef(null);

  // ── Tool state ──────────────────────────────────────────
  const [tool, setTool] = useState('brush');
  const [color, setColor] = useState('#1e1e1e');
  const [backgroundColor, setBackgroundColor] = useState('transparent');
  const [fillStyle, setFillStyle] = useState('hachure');
  const [brushSize, setBrushSize] = useState(2);
  const [strokeStyle, setStrokeStyle] = useState('solid');
  const [sloppiness, setSloppiness] = useState(1);
  const [fontFamily, setFontFamily] = useState('hand');
  const [fontSize, setFontSize] = useState(22);
  const [textAlign, setTextAlign] = useState('left');
  const [opacity, setOpacity] = useState(100);

  // ── Selected Shape State ────────────────────────────────
  const [selectedShape, setSelectedShape] = useState(null);

  // ── History state ───────────────────────────────────────
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // ── Selected Shape sync ─────────────────────────────────
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
    if (shape.fs) setFontSize(shape.fs);
    if (shape.textAlign) setTextAlign(shape.textAlign);
    if (shape.opacity !== undefined) setOpacity(shape.opacity);
  }, []);

  // ── Zoom ────────────────────────────────────────────────
  const [zoom, setZoom] = useState(100);

  // ── Theme ────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => localStorage.getItem('letsdraw-theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('letsdraw-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  // ── Toast notification ──────────────────────────────────
  const [toast, setToast] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setToastVisible(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 1400);
  }, []);

  // ── History change callback ─────────────────────────────
  const handleHistoryChange = useCallback(({ canUndo: u, canRedo: r }) => {
    setCanUndo(u);
    setCanRedo(r);
  }, []);

  // ── Keyboard shortcuts ──────────────────────────────────
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

  const handleUndo = () => {
    canvasRef.current?.undo();
    showToast('↩ Undo');
  };

  const handleRedo = () => {
    canvasRef.current?.redo();
    showToast('↪ Redo');
  };

  const handleClear = () => {
    canvasRef.current?.clear();
    showToast('🗑 Canvas cleared');
  };

  const handleDownload = () => {
    canvasRef.current?.download();
    showToast('💾 Image saved!');
  };

  const handleLayerChange = (action) => {
    canvasRef.current?.changeLayer(action);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 10, 400));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 10, 15));
  const handleZoomReset = () => setZoom(100);

  return (
    <div className="app">
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
      </div>

      {/* Top Toolbar */}
      <Toolbar activeTool={tool} onChange={setTool} />

      {/* Canvas */}
      <div className="canvas-container">
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
          onZoomChange={setZoom}
        />
      </div>

      {/* Properties Panel (Dynamic text vs shape panel based on user image) */}
      <PropertiesPanel
        activeTool={tool}
        selectedShape={selectedShape}
        color={color} onColorChange={setColor}
        backgroundColor={backgroundColor} onBackgroundColorChange={setBackgroundColor}
        fillStyle={fillStyle} onFillStyleChange={setFillStyle}
        brushSize={brushSize} onBrushSizeChange={setBrushSize}
        strokeStyle={strokeStyle} onStrokeStyleChange={setStrokeStyle}
        sloppiness={sloppiness} onSloppinessChange={setSloppiness}
        fontFamily={fontFamily} onFontFamilyChange={setFontFamily}
        fontSize={fontSize} onFontSizeChange={setFontSize}
        textAlign={textAlign} onTextAlignChange={setTextAlign}
        opacity={opacity} onOpacityChange={setOpacity}
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
        <button
          id="undo-btn"
          className="action-btn"
          onClick={handleUndo}
          disabled={!canUndo}
          aria-label="Undo (Ctrl+Z)"
          title="Undo (Ctrl+Z)"
          style={{ opacity: canUndo ? 1 : 0.35 }}
        >
          <Undo2 size={14} /> Undo
        </button>
        <button
          id="redo-btn"
          className="action-btn"
          onClick={handleRedo}
          disabled={!canRedo}
          aria-label="Redo (Ctrl+Y)"
          title="Redo (Ctrl+Y)"
          style={{ opacity: canRedo ? 1 : 0.35 }}
        >
          <Redo2 size={14} /> Redo
        </button>
        <button
          id="clear-btn"
          className="action-btn danger"
          onClick={handleClear}
          aria-label="Clear canvas"
          title="Clear canvas"
        >
          <Trash2 size={14} /> Clear
        </button>
        <button
          id="download-btn"
          className="action-btn primary"
          onClick={handleDownload}
          aria-label="Download image"
          title="Export as PNG"
        >
          <Download size={14} /> Export
        </button>
      </div>

      {/* Toast */}
      <div
        role="status"
        aria-live="polite"
        className={`toast${toastVisible ? ' visible' : ''}`}
      >
        {toast}
      </div>
    </div>
  );
}
