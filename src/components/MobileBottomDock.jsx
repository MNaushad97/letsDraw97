import React, { useState, useEffect } from 'react';
import {
  MousePointer2,
  Pencil,
  Square,
  Circle,
  Minus,
  MoveRight,
  Eraser,
  Type,
  Hand,
  MoreHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import {
  STROKE_PRESETS,
  BG_PRESETS,
  TransparentIcon,
  HachureIcon,
  CrossHatchIcon,
  SolidIcon,
  ZigzagIcon,
  StrokeThinIcon,
  StrokeMediumIcon,
  StrokeThickIcon,
  StrokeSolidIcon,
  StrokeDashedIcon,
  StrokeDottedIcon,
  SloppyArchitectIcon,
  SloppyArtistIcon,
  SloppyCartoonIcon,
  FontHandIcon,
  FontSansIcon,
  FontCodeIcon,
  FontSerifIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  LayerBackIcon,
  LayerBackwardIcon,
  LayerForwardIcon,
  LayerFrontIcon,
} from './PropertiesPanel';

const ALL_TOOLS = [
  { id: 'select',    icon: MousePointer2, label: 'Select' },
  { id: 'hand',      icon: Hand,          label: 'Pan' },
  { id: 'brush',     icon: Pencil,        label: 'Pencil' },
  { id: 'eraser',    icon: Eraser,        label: 'Eraser' },
  { id: 'rectangle', icon: Square,        label: 'Rectangle' },
  { id: 'circle',    icon: Circle,        label: 'Circle' },
  { id: 'line',      icon: Minus,         label: 'Line' },
  { id: 'arrow',     icon: MoveRight,     label: 'Arrow' },
  { id: 'text',      icon: Type,          label: 'Text' },
];

const PRESET_COLORS = [
  '#1e1e1e', '#e03131', '#2f9e44', '#1971c2', '#f08c00', '#9c36b5', '#ffffff'
];

export default function MobileBottomDock({
  activeTool,
  onToolChange,
  selectedShape,
  color,
  onColorChange,
  backgroundColor,
  onBackgroundColorChange,
  fillStyle,
  onFillStyleChange,
  brushSize,
  onBrushSizeChange,
  strokeStyle,
  onStrokeStyleChange,
  sloppiness,
  onSloppinessChange,
  fontFamily,
  onFontFamilyChange,
  fontSize,
  onFontSizeChange,
  textAlign,
  onTextAlignChange,
  opacity,
  onOpacityChange,
  onLayerChange,
  onDeleteShape,
}) {
  // Recent tools tracking (stores last 2 tools used, excluding active tool)
  const [recentTools, setRecentTools] = useState(() => {
    const defaults = ['arrow', 'rectangle', 'circle', 'line'];
    return defaults.filter((t) => t !== activeTool).slice(0, 2);
  });
  const [prevTool, setPrevTool] = useState(activeTool);

  // Bottom Sheet Drawer & Popover state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activePopover, setActivePopover] = useState(null); // 'strokeStyle' | 'strokeWidth' | 'strokeColor' | 'fontFamily' | 'fontSize'

  // Update recent tools whenever activeTool changes (guarantees active tool is never duplicated in recent list)
  useEffect(() => {
    if (activeTool !== prevTool) {
      setRecentTools((prev) => {
        const pool = ['arrow', 'rectangle', 'circle', 'line', 'brush', 'eraser', 'select', 'hand', 'text'];
        const filtered = prev.filter((t) => t !== activeTool && t !== prevTool);
        const fallback = filtered[0] || pool.find((t) => t !== activeTool && t !== prevTool) || 'rectangle';
        return [prevTool, fallback].slice(0, 2);
      });
      setPrevTool(activeTool);
    }
  }, [activeTool, prevTool]);

  const handleToolSelect = (toolId) => {
    onToolChange(toolId);
    setIsDrawerOpen(false);
  };

  const getToolObj = (id) => ALL_TOOLS.find((t) => t.id === id) || ALL_TOOLS[0];
  const ActiveIcon = getToolObj(activeTool).icon;

  const isSelectionMode = Boolean(selectedShape);

  const currentType = selectedShape?.type || activeTool;
  const isTextMode  = currentType === 'text';

  const displayFontSize = (selectedShape?.type === 'text' && selectedShape.fs)
    ? selectedShape.fs
    : fontSize;

  const showFillOptions =
    !isTextMode &&
    currentType !== 'line' &&
    currentType !== 'arrow' &&
    currentType !== 'brush' &&
    currentType !== 'pencil' &&
    currentType !== 'draw';

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.mb-dock-wrapper') && !e.target.closest('.mb-popover')) {
        setActivePopover(null);
      }
    };
    window.addEventListener('pointerdown', handleClickOutside);
    return () => window.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  return (
    <div className="mb-dock-wrapper">
      {/* ── Floating Popover Menu (Above Quick Property Buttons) ── */}
      {isSelectionMode && activePopover && (
        <div className="mb-popover">
          {activePopover === 'strokeStyle' && (
            <div className="mb-popover-options">
              <div className="mb-popover-title">Stroke Style</div>
              <div className="mb-popover-row">
                <button
                  className={`mb-popover-btn ${strokeStyle === 'solid' ? 'active' : ''}`}
                  onClick={() => { onStrokeStyleChange('solid'); setActivePopover(null); }}
                >
                  <div className="style-line solid" />
                  <span>Solid</span>
                </button>
                <button
                  className={`mb-popover-btn ${strokeStyle === 'dashed' ? 'active' : ''}`}
                  onClick={() => { onStrokeStyleChange('dashed'); setActivePopover(null); }}
                >
                  <div className="style-line dashed" />
                  <span>Dashed</span>
                </button>
                <button
                  className={`mb-popover-btn ${strokeStyle === 'dotted' ? 'active' : ''}`}
                  onClick={() => { onStrokeStyleChange('dotted'); setActivePopover(null); }}
                >
                  <div className="style-line dotted" />
                  <span>Dotted</span>
                </button>
              </div>
            </div>
          )}

          {activePopover === 'strokeWidth' && (
            <div className="mb-popover-options">
              <div className="mb-popover-title">Stroke Width</div>
              <div className="mb-popover-row">
                <button
                  className={`mb-popover-btn ${brushSize === 2 ? 'active' : ''}`}
                  onClick={() => { onBrushSizeChange(2); setActivePopover(null); }}
                >
                  <div className="width-dot thin" />
                  <span>Thin</span>
                </button>
                <button
                  className={`mb-popover-btn ${brushSize === 4 ? 'active' : ''}`}
                  onClick={() => { onBrushSizeChange(4); setActivePopover(null); }}
                >
                  <div className="width-dot medium" />
                  <span>Medium</span>
                </button>
                <button
                  className={`mb-popover-btn ${brushSize === 8 ? 'active' : ''}`}
                  onClick={() => { onBrushSizeChange(8); setActivePopover(null); }}
                >
                  <div className="width-dot thick" />
                  <span>Thick</span>
                </button>
              </div>
            </div>
          )}

          {activePopover === 'strokeColor' && (
            <div className="mb-popover-options">
              <div className="mb-popover-title">Color</div>
              <div className="mb-popover-swatches">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`mb-swatch-btn ${color === c ? 'active' : ''}`}
                    style={{ background: c }}
                    onClick={() => { onColorChange(c); setActivePopover(null); }}
                  />
                ))}
                <label className="mb-swatch-custom" title="Custom color">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => onColorChange(e.target.value)}
                  />
                  <div className="mb-custom-rainbow" />
                </label>
              </div>
            </div>
          )}

          {activePopover === 'fontFamily' && (
            <div className="mb-popover-options">
              <div className="mb-popover-title">Font Family</div>
              <div className="mb-popover-column">
                <button
                  className={`mb-popover-btn-list ${fontFamily === 'hand' ? 'active' : ''}`}
                  onClick={() => { onFontFamilyChange('hand'); setActivePopover(null); }}
                >
                  <span style={{ fontFamily: 'Caveat, cursive', fontSize: 16 }}>Handwritten</span>
                </button>
                <button
                  className={`mb-popover-btn-list ${fontFamily === 'sans' ? 'active' : ''}`}
                  onClick={() => { onFontFamilyChange('sans'); setActivePopover(null); }}
                >
                  <span style={{ fontFamily: 'Inter, sans-serif' }}>Normal (Sans)</span>
                </button>
                <button
                  className={`mb-popover-btn-list ${fontFamily === 'serif' ? 'active' : ''}`}
                  onClick={() => { onFontFamilyChange('serif'); setActivePopover(null); }}
                >
                  <span style={{ fontFamily: 'serif' }}>Serif</span>
                </button>
              </div>
            </div>
          )}

          {activePopover === 'fontSize' && (
            <div className="mb-popover-options">
              <div className="mb-popover-title">Font Size</div>
              <div className="mb-popover-row">
                {[
                  { label: 'S', val: 16 },
                  { label: 'M', val: 22 },
                  { label: 'L', val: 32 },
                  { label: 'XL', val: 48 },
                ].map((s) => (
                  <button
                    key={s.label}
                    className={`mb-popover-btn ${fontSize === s.val ? 'active' : ''}`}
                    onClick={() => { onFontSizeChange(s.val); setActivePopover(null); }}
                  >
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Main Dock Bar ── */}
      <div className="mb-dock-container">
        {!isSelectionMode ? (
          /* ── DEFAULT TOOLS MODE: [...] | [Recent 2] | [Recent 1] | | [Active Tool Circle] ── */
          <div className="mb-dock-tools-layout">
            <div className="mb-dock-pill">
              {/* Slot 1: More (...) */}
              <button
                className={`mb-dock-item ${isDrawerOpen ? 'active' : ''}`}
                onClick={() => setIsDrawerOpen(true)}
              >
                <div className="mb-dock-icon-box">
                  <MoreHorizontal size={20} />
                </div>
                <span className="mb-dock-label">more</span>
              </button>

              {/* Slot 2: Recent Tool 2 */}
              {recentTools[1] && (() => {
                const rObj = getToolObj(recentTools[1]);
                const RIcon = rObj.icon;
                return (
                  <button
                    className="mb-dock-item"
                    onClick={() => onToolChange(rObj.id)}
                  >
                    <div className="mb-dock-icon-box">
                      <RIcon size={18} />
                    </div>
                    <span className="mb-dock-label">{rObj.label.toLowerCase()}</span>
                  </button>
                );
              })()}

              {/* Slot 3: Recent Tool 1 */}
              {recentTools[0] && (() => {
                const rObj = getToolObj(recentTools[0]);
                const RIcon = rObj.icon;
                return (
                  <button
                    className="mb-dock-item"
                    onClick={() => onToolChange(rObj.id)}
                  >
                    <div className="mb-dock-icon-box">
                      <RIcon size={18} />
                    </div>
                    <span className="mb-dock-label">{rObj.label.toLowerCase()}</span>
                  </button>
                );
              })()}
            </div>

            {/* Standalone Circle: Active Tool */}
            <button
              className="mb-dock-circle-active"
              onClick={() => setIsDrawerOpen(true)}
              title={`Active: ${getToolObj(activeTool).label}`}
            >
              <ActiveIcon size={22} />
            </button>
          </div>
        ) : (
          /* ── SELECTION PROPERTIES MODE: [...] | [Prop 1] | [Prop 2] | [Prop 3] ── */
          <div className="mb-dock-pill full-width">
            {/* Slot 1: More (...) -> opens full properties drawer */}
            <button
              className={`mb-dock-item ${isDrawerOpen ? 'active' : ''}`}
              onClick={() => setIsDrawerOpen(true)}
            >
              <div className="mb-dock-icon-box">
                <MoreHorizontal size={20} />
              </div>
              <span className="mb-dock-label">more</span>
            </button>

            {selectedShape.type === 'text' ? (
              <>
                {/* Text Prop 1: Font Family */}
                <button
                  className={`mb-dock-item ${activePopover === 'fontFamily' ? 'active' : ''}`}
                  onClick={() => setActivePopover(activePopover === 'fontFamily' ? null : 'fontFamily')}
                >
                  <div className="mb-dock-icon-box">
                    <Type size={18} />
                  </div>
                  <span className="mb-dock-label">font</span>
                </button>

                {/* Text Prop 2: Font Size */}
                <button
                  className={`mb-dock-item ${activePopover === 'fontSize' ? 'active' : ''}`}
                  onClick={() => setActivePopover(activePopover === 'fontSize' ? null : 'fontSize')}
                >
                  <div className="mb-dock-icon-box">
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{fontSize}px</span>
                  </div>
                  <span className="mb-dock-label">font size</span>
                </button>

                {/* Text Prop 3: Color */}
                <button
                  className={`mb-dock-item ${activePopover === 'strokeColor' ? 'active' : ''}`}
                  onClick={() => setActivePopover(activePopover === 'strokeColor' ? null : 'strokeColor')}
                >
                  <div className="mb-dock-icon-box">
                    <div className="mb-swatch-preview" style={{ background: color }} />
                  </div>
                  <span className="mb-dock-label">color</span>
                </button>
              </>
            ) : (
              <>
                {/* Shape Prop 1: Stroke Style */}
                <button
                  className={`mb-dock-item ${activePopover === 'strokeStyle' ? 'active' : ''}`}
                  onClick={() => setActivePopover(activePopover === 'strokeStyle' ? null : 'strokeStyle')}
                >
                  <div className="mb-dock-icon-box">
                    <div className={`style-line-preview ${strokeStyle}`} />
                  </div>
                  <span className="mb-dock-label">stroke style</span>
                </button>

                {/* Shape Prop 2: Stroke Width */}
                <button
                  className={`mb-dock-item ${activePopover === 'strokeWidth' ? 'active' : ''}`}
                  onClick={() => setActivePopover(activePopover === 'strokeWidth' ? null : 'strokeWidth')}
                >
                  <div className="mb-dock-icon-box">
                    <div className={`width-line-preview w-${brushSize}`} />
                  </div>
                  <span className="mb-dock-label">stroke width</span>
                </button>

                {/* Shape Prop 3: Stroke Color */}
                <button
                  className={`mb-dock-item ${activePopover === 'strokeColor' ? 'active' : ''}`}
                  onClick={() => setActivePopover(activePopover === 'strokeColor' ? null : 'strokeColor')}
                >
                  <div className="mb-dock-icon-box">
                    <div className="mb-swatch-preview" style={{ background: color }} />
                  </div>
                  <span className="mb-dock-label">stroke</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Sheet Drawer (Full Tools or Full Properties) ── */}
      {isDrawerOpen && (
        <div className="mb-drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div className="mb-drawer-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-drawer-handle" />

            <div className="mb-drawer-header">
              <span className="mb-drawer-title">
                {isSelectionMode ? 'Properties' : 'All Tools'}
              </span>
              <button
                className="mb-drawer-close"
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Close drawer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-drawer-content">
              {!isSelectionMode ? (
                /* All Tools Grid */
                <div className="mb-drawer-tools-grid">
                  {ALL_TOOLS.map((t) => {
                    const TIcon = t.icon;
                    const isActive = activeTool === t.id;
                    return (
                      <button
                        key={t.id}
                        className={`mb-drawer-tool-btn ${isActive ? 'active' : ''}`}
                        onClick={() => handleToolSelect(t.id)}
                      >
                        <TIcon size={22} />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Full Shape Properties Controls (Identical to PropertiesPanel) */
                <div className="mb-drawer-props-container">
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

                  {/* ── TEXT MODE OR SHAPE MODE ── */}
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
                            className={`prop-btn text-size-btn${displayFontSize <= 16 ? ' active' : ''}`}
                            onClick={() => onFontSizeChange(16)}
                            title="Small (16px)"
                          >
                            S
                          </button>
                          <button
                            className={`prop-btn text-size-btn${displayFontSize === 22 ? ' active' : ''}`}
                            onClick={() => onFontSizeChange(22)}
                            title="Medium (22px)"
                          >
                            M
                          </button>
                          <button
                            className={`prop-btn text-size-btn${displayFontSize === 28 ? ' active' : ''}`}
                            onClick={() => onFontSizeChange(28)}
                            title="Large (28px)"
                          >
                            L
                          </button>
                          <button
                            className={`prop-btn text-size-btn${displayFontSize >= 36 ? ' active' : ''}`}
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
                    <>
                      {/* BACKGROUND COLOR (2D Shapes) */}
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

                      {/* FILL STYLE (2D Shapes) */}
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
                            <button
                              className={`prop-btn${fillStyle === 'zigzag' ? ' active' : ''}`}
                              onClick={() => onFillStyleChange('zigzag')}
                              title="Zigzag fill"
                            >
                              <ZigzagIcon />
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

                  {/* DELETE SHAPE */}
                  {onDeleteShape && (
                    <section className="prop-group" style={{ marginTop: 4 }}>
                      <button
                        className="mb-delete-btn"
                        onClick={() => {
                          onDeleteShape();
                          setIsDrawerOpen(false);
                        }}
                        style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Trash2 size={16} />
                        <span>Delete Shape</span>
                      </button>
                    </section>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
