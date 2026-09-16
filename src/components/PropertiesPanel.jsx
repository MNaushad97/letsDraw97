import React from 'react';

// ── Preset Palettes ──────────────────────────────────────────
const STROKE_PRESETS = [
  '#1e1e1e', // Black/Dark
  '#e03131', // Red
  '#2f9e44', // Green
  '#1971c2', // Blue
  '#f59f00', // Orange
];

const BG_PRESETS = [
  'transparent',
  '#ffcdd2', // Light Red
  '#c8e6c9', // Light Green
  '#bbdefb', // Light Blue
  '#fff9c4', // Light Yellow
];

// ── SVG Icons ───────────────────────────────────────────────
const TransparentIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <rect width="20" height="20" rx="4" fill="#E2E8F0" />
    <path d="M0 0h10v10H0zM10 10h10v10H10z" fill="#CBD5E1" />
  </svg>
);

const HachureIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="4" fill="none" strokeWidth="1.5" />
    <line x1="6" y1="18" x2="18" y2="6" strokeWidth="1.5" />
    <line x1="6" y1="12" x2="12" y2="6" strokeWidth="1.5" />
    <line x1="12" y1="18" x2="18" y2="12" strokeWidth="1.5" />
  </svg>
);

const CrossHatchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M7 17L17 7M7 7l10 10M7 12h10M12 7v10" strokeWidth="1.5" />
  </svg>
);

const SolidIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <rect x="3" y="3" width="18" height="18" rx="4" />
  </svg>
);

// Stroke Width Icons
const StrokeThinIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <rect x="4" y="11" width="16" height="2" rx="1" />
  </svg>
);
const StrokeMediumIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <rect x="4" y="10" width="16" height="4" rx="1.5" />
  </svg>
);
const StrokeThickIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <rect x="4" y="8" width="16" height="8" rx="2" />
  </svg>
);

// Stroke Style Icons
const StrokeSolidIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <line x1="4" y1="12" x2="20" y2="12" />
  </svg>
);
const StrokeDashedIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 4">
    <line x1="4" y1="12" x2="20" y2="12" />
  </svg>
);
const StrokeDottedIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeDasharray="1.5 3.5" strokeLinecap="round">
    <line x1="4" y1="12" x2="20" y2="12" />
  </svg>
);

// Sloppiness Icons
const SloppyArchitectIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
    <line x1="4" y1="12" x2="20" y2="12" />
  </svg>
);
const SloppyArtistIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
    <path d="M4 13c3-3 6 1 8-1s5-3 8-1" />
  </svg>
);
const SloppyCartoonIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
    <path d="M4 11c3-2 6 2 8 0s5-4 8-1" />
    <path d="M4 14c4-1 7 1 9 0s4-2 7 0" opacity="0.75" />
  </svg>
);

// Font Family Icons
const FontHandIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const FontSansIcon = () => (
  <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px' }}>A</span>
);

const FontCodeIcon = () => (
  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px' }}>&lt;/&gt;</span>
);

const FontSerifIcon = () => (
  <span style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: '16px' }}>A</span>
);

// Align Icons
const AlignLeftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="15" y2="12" />
    <line x1="3" y1="18" x2="18" y2="18" />
  </svg>
);
const AlignCenterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="6" y1="12" x2="18" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);
const AlignRightIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="9" y1="12" x2="21" y2="12" />
    <line x1="6" y1="18" x2="21" y2="18" />
  </svg>
);

// Layer Icons
const LayerBackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 19h14M18 13l-6 6-6-6" />
  </svg>
);
const LayerBackwardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M18 13l-6 6-6-6" />
  </svg>
);
const LayerForwardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 19V5M18 11l-6-6-6 6" />
  </svg>
);
const LayerFrontIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 19V5M5 5h14M18 11l-6-6-6 6" />
  </svg>
);

export default function PropertiesPanel({
  activeTool,
  selectedShape,
  color,            onColorChange,
  backgroundColor,  onBackgroundColorChange,
  fillStyle,        onFillStyleChange,
  brushSize,        onBrushSizeChange,
  strokeStyle,      onStrokeStyleChange,
  sloppiness,       onSloppinessChange,
  fontFamily,       onFontFamilyChange,
  fontSize,         onFontSizeChange,
  textAlign,        onTextAlignChange,
  opacity,          onOpacityChange,
  onLayerChange,
}) {
  const currentType = selectedShape?.type || activeTool;
  const isTextMode  = currentType === 'text';

  // Only closed 2D shapes (rectangle, circle, etc) show Fill & Background options
  const showFillOptions =
    !isTextMode &&
    currentType !== 'line' &&
    currentType !== 'arrow' &&
    currentType !== 'brush' &&
    currentType !== 'pencil' &&
    currentType !== 'draw';

  return (
    <aside className="side-panel" aria-label="Properties Panel">

      {/* ── STROKE COLOR ── */}
      <section className="prop-group">
        <label className="prop-label">Stroke</label>
        <div className="swatch-row">
          {STROKE_PRESETS.map((c) => (
            <button
              key={c}
              className={`color-swatch-btn${color === c ? ' active' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => onColorChange(c)}
              title={c}
              aria-label={`Stroke color ${c}`}
            />
          ))}
          <div className="divider-v" />
          <label className={`color-custom-btn${!STROKE_PRESETS.includes(color) ? ' active' : ''}`}>
            <input
              type="color"
              value={color === 'transparent' ? '#000000' : color}
              onChange={(e) => onColorChange(e.target.value)}
            />
            <span className="color-preview-inner" style={{ backgroundColor: color }} />
          </label>
        </div>
      </section>

      {/* ── TEXT MODE PANEL ── */}
      {isTextMode ? (
        <>
          {/* FONT FAMILY */}
          <section className="prop-group">
            <label className="prop-label">Font family</label>
            <div className="btn-group">
              <button
                className={`prop-btn${fontFamily === 'hand' ? ' active' : ''}`}
                onClick={() => onFontFamilyChange('hand')}
                title="Hand-drawn (Caveat)"
              >
                <FontHandIcon />
              </button>
              <button
                className={`prop-btn${fontFamily === 'sans' ? ' active' : ''}`}
                onClick={() => onFontFamilyChange('sans')}
                title="Sans-serif (Inter)"
              >
                <FontSansIcon />
              </button>
              <button
                className={`prop-btn${fontFamily === 'code' ? ' active' : ''}`}
                onClick={() => onFontFamilyChange('code')}
                title="Code (Monospace)"
              >
                <FontCodeIcon />
              </button>
              <button
                className={`prop-btn${fontFamily === 'serif' ? ' active' : ''}`}
                onClick={() => onFontFamilyChange('serif')}
                title="Serif (Georgia)"
              >
                <FontSerifIcon />
              </button>
            </div>
          </section>

          {/* FONT SIZE */}
          <section className="prop-group">
            <label className="prop-label">Font size</label>
            <div className="btn-group">
              <button
                className={`prop-btn text-size-btn${fontSize <= 16 ? ' active' : ''}`}
                onClick={() => onFontSizeChange(16)}
                title="Small (16px)"
              >
                S
              </button>
              <button
                className={`prop-btn text-size-btn${fontSize === 22 ? ' active' : ''}`}
                onClick={() => onFontSizeChange(22)}
                title="Medium (22px)"
              >
                M
              </button>
              <button
                className={`prop-btn text-size-btn${fontSize === 28 ? ' active' : ''}`}
                onClick={() => onFontSizeChange(28)}
                title="Large (28px)"
              >
                L
              </button>
              <button
                className={`prop-btn text-size-btn${fontSize >= 36 ? ' active' : ''}`}
                onClick={() => onFontSizeChange(36)}
                title="Extra Large (36px)"
              >
                XL
              </button>
            </div>
          </section>

          {/* TEXT ALIGN */}
          <section className="prop-group">
            <label className="prop-label">Text align</label>
            <div className="btn-group">
              <button
                className={`prop-btn${textAlign === 'left' ? ' active' : ''}`}
                onClick={() => onTextAlignChange('left')}
                title="Align Left"
              >
                <AlignLeftIcon />
              </button>
              <button
                className={`prop-btn${textAlign === 'center' ? ' active' : ''}`}
                onClick={() => onTextAlignChange('center')}
                title="Align Center"
              >
                <AlignCenterIcon />
              </button>
              <button
                className={`prop-btn${textAlign === 'right' ? ' active' : ''}`}
                onClick={() => onTextAlignChange('right')}
                title="Align Right"
              >
                <AlignRightIcon />
              </button>
            </div>
          </section>
        </>
      ) : (
        /* ── SHAPE PANEL ── */
        <>
          {/* BACKGROUND COLOR (Only shown for 2D shapes: Rectangle, Circle) */}
          {showFillOptions && (
            <section className="prop-group">
              <label className="prop-label">Background</label>
              <div className="swatch-row">
                {BG_PRESETS.map((c) => (
                  <button
                    key={c}
                    className={`color-swatch-btn${backgroundColor === c ? ' active' : ''}`}
                    style={{ backgroundColor: c === 'transparent' ? undefined : c }}
                    onClick={() => onBackgroundColorChange(c)}
                    title={c === 'transparent' ? 'Transparent' : c}
                    aria-label={`Background color ${c}`}
                  >
                    {c === 'transparent' && <TransparentIcon />}
                  </button>
                ))}
                <div className="divider-v" />
                <label className={`color-custom-btn${!BG_PRESETS.includes(backgroundColor) ? ' active' : ''}`}>
                  <input
                    type="color"
                    value={backgroundColor === 'transparent' ? '#ffffff' : backgroundColor}
                    onChange={(e) => onBackgroundColorChange(e.target.value)}
                  />
                  <span className="color-preview-inner" style={{ backgroundColor: backgroundColor === 'transparent' ? '#fff' : backgroundColor }} />
                </label>
              </div>
            </section>
          )}

          {/* FILL STYLE (Only shown for 2D shapes: Rectangle, Circle) */}
          {showFillOptions && (
            <section className="prop-group">
              <label className="prop-label">Fill</label>
              <div className="btn-group">
                <button
                  className={`prop-btn${fillStyle === 'hachure' ? ' active' : ''}`}
                  onClick={() => onFillStyleChange('hachure')}
                  title="Hachure fill"
                >
                  <HachureIcon />
                </button>
                <button
                  className={`prop-btn${fillStyle === 'cross-hatch' ? ' active' : ''}`}
                  onClick={() => onFillStyleChange('cross-hatch')}
                  title="Cross-hatch fill"
                >
                  <CrossHatchIcon />
                </button>
                <button
                  className={`prop-btn${fillStyle === 'solid' ? ' active' : ''}`}
                  onClick={() => onFillStyleChange('solid')}
                  title="Solid fill"
                >
                  <SolidIcon />
                </button>
              </div>
            </section>
          )}

          {/* STROKE WIDTH */}
          <section className="prop-group">
            <label className="prop-label">Stroke width</label>
            <div className="btn-group">
              <button
                className={`prop-btn${brushSize === 2 ? ' active' : ''}`}
                onClick={() => onBrushSizeChange(2)}
                title="Thin (2px)"
              >
                <StrokeThinIcon />
              </button>
              <button
                className={`prop-btn${brushSize === 4 ? ' active' : ''}`}
                onClick={() => onBrushSizeChange(4)}
                title="Medium (4px)"
              >
                <StrokeMediumIcon />
              </button>
              <button
                className={`prop-btn${brushSize === 8 ? ' active' : ''}`}
                onClick={() => onBrushSizeChange(8)}
                title="Thick (8px)"
              >
                <StrokeThickIcon />
              </button>
            </div>
          </section>

          {/* STROKE STYLE */}
          <section className="prop-group">
            <label className="prop-label">Stroke style</label>
            <div className="btn-group">
              <button
                className={`prop-btn${strokeStyle === 'solid' ? ' active' : ''}`}
                onClick={() => onStrokeStyleChange('solid')}
                title="Solid"
              >
                <StrokeSolidIcon />
              </button>
              <button
                className={`prop-btn${strokeStyle === 'dashed' ? ' active' : ''}`}
                onClick={() => onStrokeStyleChange('dashed')}
                title="Dashed"
              >
                <StrokeDashedIcon />
              </button>
              <button
                className={`prop-btn${strokeStyle === 'dotted' ? ' active' : ''}`}
                onClick={() => onStrokeStyleChange('dotted')}
                title="Dotted"
              >
                <StrokeDottedIcon />
              </button>
            </div>
          </section>

          {/* SLOPPINESS */}
          <section className="prop-group">
            <label className="prop-label">Sloppiness</label>
            <div className="btn-group">
              <button
                className={`prop-btn${sloppiness === 0 ? ' active' : ''}`}
                onClick={() => onSloppinessChange(0)}
                title="Architect (Clean)"
              >
                <SloppyArchitectIcon />
              </button>
              <button
                className={`prop-btn${sloppiness === 1 ? ' active' : ''}`}
                onClick={() => onSloppinessChange(1)}
                title="Artist (Hand-drawn)"
              >
                <SloppyArtistIcon />
              </button>
              <button
                className={`prop-btn${sloppiness === 2 ? ' active' : ''}`}
                onClick={() => onSloppinessChange(2)}
                title="Cartoonist (Sketchy)"
              >
                <SloppyCartoonIcon />
              </button>
            </div>
          </section>
        </>
      )}

      {/* ── OPACITY ── */}
      <section className="prop-group">
        <div className="prop-label-row">
          <label className="prop-label">Opacity</label>
          <span className="prop-value">{opacity}</span>
        </div>
        <input
          className="opacity-slider"
          type="range"
          min={0}
          max={100}
          value={opacity}
          onChange={(e) => onOpacityChange(Number(e.target.value))}
        />
      </section>

      {/* ── LAYERS ── */}
      <section className="prop-group">
        <label className="prop-label">Layers</label>
        <div className="btn-group">
          <button
            className="prop-btn"
            onClick={() => onLayerChange?.('back')}
            title="Send to back"
          >
            <LayerBackIcon />
          </button>
          <button
            className="prop-btn"
            onClick={() => onLayerChange?.('backward')}
            title="Send backward"
          >
            <LayerBackwardIcon />
          </button>
          <button
            className="prop-btn"
            onClick={() => onLayerChange?.('forward')}
            title="Bring forward"
          >
            <LayerForwardIcon />
          </button>
          <button
            className="prop-btn"
            onClick={() => onLayerChange?.('front')}
            title="Bring to front"
          >
            <LayerFrontIcon />
          </button>
        </div>
      </section>

    </aside>
  );
}
