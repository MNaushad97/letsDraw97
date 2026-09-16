import {
  useRef, useEffect, useCallback,
  forwardRef, useImperativeHandle, useState,
} from 'react';
import rough from 'roughjs';

let _uid = 0;
const uid = () => `s${++_uid}`;

const getClientCoords = (e) => {
  if (e.touches && e.touches.length > 0) {
    return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
  }
  if (e.changedTouches && e.changedTouches.length > 0) {
    return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
  }
  return { clientX: e.clientX ?? 0, clientY: e.clientY ?? 0 };
};

const getPos = (e, canvas, pan, zoom = 100) => {
  const r = canvas.getBoundingClientRect();
  const scale = zoom / 100;
  const { clientX, clientY } = getClientCoords(e);
  return {
    x: (clientX - r.left - pan.x) / scale,
    y: (clientY - r.top - pan.y) / scale,
  };
};
const getScreenPos = (e, canvas) => {
  const r = canvas.getBoundingClientRect();
  const { clientX, clientY } = getClientCoords(e);
  return { x: clientX - r.left, y: clientY - r.top };
};

/* ─── Bounding box ─────────────────────────────────────────── */
function bounds(s) {
  if (s.type === 'brush') {
    if (!s.pts?.length) return { x: 0, y: 0, w: 0, h: 0 };
    const xs = s.pts.map(p => p.x), ys = s.pts.map(p => p.y);
    const pad = (s.sz || 4) + 4;
    const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
    return {
      x: minX, y: minY,
      w: Math.max(maxX - minX, 10),
      h: Math.max(maxY - minY, 10),
    };
  }
  if (s.type === 'line' || s.type === 'arrow') {
    const midX = s.cx ?? (s.x1 + s.x2) / 2;
    const midY = s.cy ?? (s.y1 + s.y2) / 2;
    const xs = [s.x1, s.x2, midX];
    const ys = [s.y1, s.y2, midY];
    const pad = (s.sz || 4) + 8;
    const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
    return {
      x: minX, y: minY,
      w: Math.max(maxX - minX, 10),
      h: Math.max(maxY - minY, 10),
    };
  }
  if (s.type === 'text') {
    const fs = s.fs || 22;
    const lines = (s.text || ' ').split('\n');
    const maxLine = Math.max(...lines.map(l => l.length), 1);
    const w = Math.max(maxLine * (fs * 0.58), 60);
    const h = Math.max(lines.length * fs * 1.35, 24);
    return { x: s.x, y: s.y, w, h };
  }
  return {
    x: Math.min(s.x1, s.x2), y: Math.min(s.y1, s.y2),
    w: Math.abs(s.x2 - s.x1), h: Math.abs(s.y2 - s.y1),
  };
}

/* ─── 8 resize handles + Rotation + 3-Point Arrow Handles ─── */
const HANDLE_DEFS = [
  { id: 'nw', rx: 0,   ry: 0,   cursor: 'nwse-resize' },
  { id: 'n',  rx: 0.5, ry: 0,   cursor: 'ns-resize'   },
  { id: 'ne', rx: 1,   ry: 0,   cursor: 'nesw-resize'  },
  { id: 'e',  rx: 1,   ry: 0.5, cursor: 'ew-resize'   },
  { id: 'se', rx: 1,   ry: 1,   cursor: 'nwse-resize'  },
  { id: 's',  rx: 0.5, ry: 1,   cursor: 'ns-resize'   },
  { id: 'sw', rx: 0,   ry: 1,   cursor: 'nesw-resize'  },
  { id: 'w',  rx: 0,   ry: 0.5, cursor: 'ew-resize'   },
];
const HANDLE_R = 6;

function getHandles(s) {
  const { x, y, w, h } = bounds(s);
  const pad = 8;
  const handles = [];

  // Bounding box handles
  HANDLE_DEFS.forEach(({ id, rx, ry, cursor }) => {
    handles.push({
      id, cursor, type: 'rect',
      x: x - pad + rx * (w + pad * 2),
      y: y - pad + ry * (h + pad * 2),
    });
  });

  // Top-center Rotation handle (floating 24px above top border)
  handles.push({
    id: 'rotate',
    cursor: 'grab',
    type: 'rotate',
    x: x + w / 2,
    y: y - pad - 24,
  });

  // Specialized 3-Point handles for Line & Arrow
  if (s.type === 'line' || s.type === 'arrow') {
    const midX = s.cx ?? (s.x1 + s.x2) / 2;
    const midY = s.cy ?? (s.y1 + s.y2) / 2;

    handles.push({ id: 'arrow_start', cursor: 'crosshair', type: 'point', x: s.x1, y: s.y1 });
    handles.push({ id: 'arrow_mid',   cursor: 'grab',      type: 'point', x: midX, y: midY });
    handles.push({ id: 'arrow_end',   cursor: 'crosshair', type: 'point', x: s.x2, y: s.y2 });
  }

  return handles;
}

function hitHandle(px, py, s) {
  const b = bounds(s);
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;

  let mx = px, my = py;
  if (s.angle) {
    const cos = Math.cos(-s.angle), sin = Math.sin(-s.angle);
    const dx = px - cx, dy = py - cy;
    mx = cx + dx * cos - dy * sin;
    my = cy + dx * sin + dy * cos;
  }

  for (const h of getHandles(s)) {
    const r = h.type === 'rotate' ? 10 : HANDLE_R + 4;
    if (Math.hypot(mx - h.x, my - h.y) <= r) return h;
  }
  return null;
}

/* ─── Distance helper ────────────────────────────────────────── */
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const nx = x1 + t * dx, ny = y1 + t * dy;
  return Math.hypot(px - nx, py - ny);
}

/* ─── Shape hit test (with rotation support) ─────────────────── */
function rawHitShape(px, py, s) {
  const pad = Math.max(s.sz ?? 4, 12);

  switch (s.type) {
    case 'circle': {
      const cx = (s.x1 + s.x2) / 2;
      const cy = (s.y1 + s.y2) / 2;
      const rx = Math.abs(s.x2 - s.x1) / 2 + pad;
      const ry = Math.abs(s.y2 - s.y1) / 2 + pad;
      if (rx < 1 || ry < 1) return false;
      return ((px - cx) ** 2) / (rx ** 2) + ((py - cy) ** 2) / (ry ** 2) <= 1;
    }
    case 'line':
    case 'arrow': {
      const midX = s.cx ?? (s.x1 + s.x2) / 2;
      const midY = s.cy ?? (s.y1 + s.y2) / 2;
      return distToSegment(px, py, s.x1, s.y1, midX, midY) <= pad ||
             distToSegment(px, py, midX, midY, s.x2, s.y2) <= pad;
    }
    case 'brush': {
      if (!s.pts || s.pts.length === 0) return false;
      return s.pts.some(p => Math.hypot(p.x - px, p.y - py) <= pad);
    }
    case 'text': {
      const b = bounds(s);
      return px >= b.x - pad && px <= b.x + b.w + pad && py >= b.y - pad && py <= b.y + b.h + pad;
    }
    case 'rectangle':
    default: {
      const x = Math.min(s.x1, s.x2) - pad, y = Math.min(s.y1, s.y2) - pad;
      const w = Math.abs(s.x2 - s.x1) + pad * 2, h = Math.abs(s.y2 - s.y1) + pad * 2;
      return px >= x && px <= x + w && py >= y && py <= y + h;
    }
  }
}

function hitShape(px, py, s) {
  const b = bounds(s);
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;

  let mx = px, my = py;
  if (s.angle) {
    const cos = Math.cos(-s.angle), sin = Math.sin(-s.angle);
    const dx = px - cx, dy = py - cy;
    mx = cx + dx * cos - dy * sin;
    my = cy + dx * sin + dy * cos;
  }

  return rawHitShape(mx, my, s);
}

/* ─── Eraser Hit Testing & Brush Splitting ───────────────────── */
function shouldEraseShape(s, pos, er) {
  const pad = er;
  switch (s.type) {
    case 'circle': {
      const cx = (s.x1 + s.x2) / 2;
      const cy = (s.y1 + s.y2) / 2;
      const rx = Math.abs(s.x2 - s.x1) / 2 + pad;
      const ry = Math.abs(s.y2 - s.y1) / 2 + pad;
      if (rx < 1 || ry < 1) return false;
      return ((pos.x - cx) ** 2) / (rx ** 2) + ((pos.y - cy) ** 2) / (ry ** 2) <= 1;
    }
    case 'rectangle': {
      const x = Math.min(s.x1, s.x2) - pad;
      const y = Math.min(s.y1, s.y2) - pad;
      const w = Math.abs(s.x2 - s.x1) + pad * 2;
      const h = Math.abs(s.y2 - s.y1) + pad * 2;
      return pos.x >= x && pos.x <= x + w && pos.y >= y && pos.y <= y + h;
    }
    case 'line':
    case 'arrow': {
      const midX = s.cx ?? (s.x1 + s.x2) / 2;
      const midY = s.cy ?? (s.y1 + s.y2) / 2;
      return distToSegment(pos.x, pos.y, s.x1, s.y1, midX, midY) <= pad + (s.sz || 4) / 2 ||
             distToSegment(pos.x, pos.y, midX, midY, s.x2, s.y2) <= pad + (s.sz || 4) / 2;
    }
    case 'text': {
      const b = bounds(s);
      return pos.x >= b.x - pad && pos.x <= b.x + b.w + pad && pos.y >= b.y - pad && pos.y <= b.y + b.h + pad;
    }
    case 'brush': {
      if (!s.pts || s.pts.length === 0) return false;
      const strokePad = pad + (s.sz || 4) / 2;
      for (let i = 0; i < s.pts.length - 1; i++) {
        if (distToSegment(pos.x, pos.y, s.pts[i].x, s.pts[i].y, s.pts[i + 1].x, s.pts[i + 1].y) <= strokePad) {
          return true;
        }
      }
      return Math.hypot(s.pts[0].x - pos.x, s.pts[0].y - pos.y) <= strokePad;
    }
    default:
      return false;
  }
}

function eraseBrushStroke(s, pos, er) {
  if (!s.pts || s.pts.length < 2) return [];
  const strokePad = er + (s.sz || 4) / 2;
  const segments = [];
  let currentSeg = [];

  for (let i = 0; i < s.pts.length; i++) {
    const pt = s.pts[i];
    const d = Math.hypot(pt.x - pos.x, pt.y - pos.y);
    if (d > strokePad) {
      currentSeg.push(pt);
    } else {
      if (currentSeg.length >= 2) {
        segments.push({ ...s, id: uid(), pts: currentSeg });
      }
      currentSeg = [];
    }
  }
  if (currentSeg.length >= 2) {
    segments.push({ ...s, id: uid(), pts: currentSeg });
  }
  return segments;
}

/* ─── Apply resize/rotate/curve to a shape ───────────────────── */
function applyResize(s, handleId, mx, my) {
  // ── ROTATION HANDLE ──
  if (handleId === 'rotate') {
    const b = bounds(s);
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    let angle = Math.atan2(my - cy, mx - cx) + Math.PI / 2;

    // Snap to 15-degree steps
    const deg = (angle * 180) / Math.PI;
    const snapDeg = Math.round(deg / 15) * 15;
    if (Math.abs(deg - snapDeg) < 4) {
      angle = (snapDeg * Math.PI) / 180;
    }
    return { ...s, angle };
  }

  // ── ARROW / LINE 3-POINT HANDLES ──
  if (handleId === 'arrow_start') {
    return { ...s, x1: mx, y1: my };
  }
  if (handleId === 'arrow_mid') {
    return { ...s, cx: mx, cy: my };
  }
  if (handleId === 'arrow_end') {
    return { ...s, x2: mx, y2: my };
  }

  // ── BOUNDING BOX RESIZING ──
  const b = bounds(s);
  const { x, y, w, h } = b;

  const fixX = handleId.includes('w') ? x + w : x;
  const fixY = handleId.includes('n') ? y + h : y;

  let newX1 = x, newY1 = y, newX2 = x + w, newY2 = y + h;

  if (handleId.includes('e') || handleId.includes('w')) {
    newX1 = Math.min(mx, fixX);
    newX2 = Math.max(mx, fixX);
  }
  if (handleId.includes('n') || handleId.includes('s')) {
    newY1 = Math.min(my, fixY);
    newY2 = Math.max(my, fixY);
  }
  if (handleId === 'n' || handleId === 's') { newX1 = x; newX2 = x + w; }
  if (handleId === 'e' || handleId === 'w') { newY1 = y; newY2 = y + h; }

  const newW = Math.max(Math.abs(newX2 - newX1), 10);
  const newH = Math.max(Math.abs(newY2 - newY1), 10);

  if (s.type === 'text') {
    const origH  = h || 1;
    const origFs = s.fs || 22;
    const scaleRatio = newH / origH;
    const newFs = Math.max(12, Math.round(origFs * scaleRatio));
    return { ...s, x: newX1, y: newY1, fs: newFs };
  }

  if (s.type === 'brush') {
    const origW = w || 1;
    const origH = h || 1;

    const newPts = s.pts.map(p => ({
      x: newX1 + ((p.x - x) / origW) * newW,
      y: newY1 + ((p.y - y) / origH) * newH,
    }));
    return { ...s, pts: newPts };
  }

  return { ...s, x1: newX1, y1: newY1, x2: newX2, y2: newY2 };
}

/* ─── RoughJS Options generator ──────────────────────────────── */
function getRoughOptions(s) {
  const isClean   = s.sloppiness === 0;
  const isCartoon = s.sloppiness === 2;

  const roughness = isClean ? 0 : isCartoon ? 2.8 : 1.4;
  const bowing    = isClean ? 0 : isCartoon ? 2.8 : 1.4;

  const strokeDash = s.strokeStyle === 'dashed'
    ? [10, 8]
    : s.strokeStyle === 'dotted'
      ? [3, 6]
      : undefined;

  const opts = {
    stroke: s.color || '#1e1e1e',
    strokeWidth: s.sz || 2,
    roughness,
    bowing,
    seed: s.seed || 1,
  };

  if (strokeDash) {
    opts.strokeLineDash = strokeDash;
  }

  if (s.bg && s.bg !== 'transparent') {
    opts.fill = s.bg;
    opts.fillStyle = s.fillStyle || 'hachure';
    opts.fillWeight = Math.max(1, (s.sz || 2) / 2);
    opts.hachureGap = 8;
  }

  return opts;
}

/* ─── Draw a shape with RoughJS ──────────────────────────────── */
function drawShape(ctx, rc, s) {
  ctx.save();
  ctx.globalAlpha = (s.opacity ?? 100) / 100;
  const opts = getRoughOptions(s);

  switch (s.type) {
    case 'rectangle': {
      const x = Math.min(s.x1, s.x2), y = Math.min(s.y1, s.y2);
      const w = Math.abs(s.x2 - s.x1),   h = Math.abs(s.y2 - s.y1);
      if (w > 0 && h > 0) {
        rc.rectangle(x, y, w, h, opts);
      }
      break;
    }
    case 'circle': {
      const rx = Math.abs(s.x2 - s.x1) / 2, ry = Math.abs(s.y2 - s.y1) / 2;
      const cx = (s.x1 + s.x2) / 2,         cy = (s.y1 + s.y2) / 2;
      if (rx > 0 && ry > 0) {
        rc.ellipse(cx, cy, rx * 2, ry * 2, opts);
      }
      break;
    }
    case 'line':
    case 'arrow': {
      const midX = s.cx ?? (s.x1 + s.x2) / 2;
      const midY = s.cy ?? (s.y1 + s.y2) / 2;
      const isCurved = s.cx !== undefined || s.cy !== undefined;

      if (isCurved) {
        rc.curve([[s.x1, s.y1], [midX, midY], [s.x2, s.y2]], opts);
      } else {
        rc.line(s.x1, s.y1, s.x2, s.y2, opts);
      }

      if (s.type === 'arrow') {
        const dx = isCurved ? s.x2 - midX : s.x2 - s.x1;
        const dy = isCurved ? s.y2 - midY : s.y2 - s.y1;
        const len = Math.hypot(dx, dy);

        if (len >= 4) {
          const ang = Math.atan2(dy, dx);
          const head = Math.min(len * 0.3, 28) + (s.sz || 2);
          const h1x = s.x2 - head * Math.cos(ang - Math.PI / 6);
          const h1y = s.y2 - head * Math.sin(ang - Math.PI / 6);
          const h2x = s.x2 - head * Math.cos(ang + Math.PI / 6);
          const h2y = s.y2 - head * Math.sin(ang + Math.PI / 6);

          if (isCurved) {
            rc.curve([[s.x2, s.y2], [h1x, h1y]], opts);
            rc.curve([[s.x2, s.y2], [h2x, h2y]], opts);
          } else {
            rc.line(s.x2, s.y2, h1x, h1y, opts);
            rc.line(s.x2, s.y2, h2x, h2y, opts);
          }
        }
      }
      break;
    }
    case 'brush': {
      if (s.pts && s.pts.length >= 2) {
        const points = s.pts.map(p => [p.x, p.y]);
        rc.linearPath(points, opts);
      }
      break;
    }
    case 'text': {
      ctx.fillStyle = s.color || '#1e1e1e';
      let fontFam = "'Caveat', 'Kalam', cursive";
      if (s.fontFamily === 'sans') fontFam = "Inter, system-ui, sans-serif";
      if (s.fontFamily === 'code') fontFam = "'Fira Code', 'Courier New', monospace";
      if (s.fontFamily === 'serif') fontFam = "Georgia, serif";

      const fontSize = s.fs || 22;
      ctx.font = `600 ${fontSize}px ${fontFam}`;
      ctx.textBaseline = 'top';

      const lines = (s.text ?? '').split('\n');
      const b = bounds(s);

      lines.forEach((line, i) => {
        let alignX = s.x;
        if (s.textAlign === 'center') {
          ctx.textAlign = 'center';
          alignX = s.x + b.w / 2;
        } else if (s.textAlign === 'right') {
          ctx.textAlign = 'right';
          alignX = s.x + b.w;
        } else {
          ctx.textAlign = 'left';
        }
        ctx.fillText(line, alignX, s.y + i * fontSize * 1.35);
      });
      break;
    }
  }
  ctx.restore();
}

/* ─── Draw selection box + handles (with rotation & curve handles) ─ */
function drawSelBox(ctx, s) {
  const { x, y, w, h } = bounds(s);
  const pad = 8;
  const bX = x - pad, bY = y - pad;
  const bW = w + pad * 2, bH = h + pad * 2;
  const cx = x + w / 2, cy = y + h / 2;

  ctx.save();
  if (s.angle) {
    ctx.translate(cx, cy);
    ctx.rotate(s.angle);
    ctx.translate(-cx, -cy);
  }

  // Dashed border
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = '#6c63ff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(bX, bY, bW, bH);
  ctx.setLineDash([]);

  // Connecting stem to Top-Center Rotation handle
  const rotX = cx;
  const rotY = bY - 24;
  ctx.beginPath();
  ctx.moveTo(cx, bY);
  ctx.lineTo(rotX, rotY);
  ctx.strokeStyle = '#6c63ff';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Rotation Handle (top-center circular icon)
  ctx.beginPath();
  ctx.arc(rotX, rotY, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = '#6c63ff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Draw handles
  getHandles(s).forEach(h => {
    if (h.type === 'rotate') return;

    ctx.beginPath();
    if (h.type === 'point') {
      // 3 control points for Arrow / Line (tail, mid-curve, tip)
      ctx.arc(h.x, h.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#6c63ff';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
    } else {
      // Bounding box handles
      ctx.arc(h.x, h.y, HANDLE_R, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#6c63ff';
      ctx.lineWidth = 1.5;
    }
    ctx.stroke();
  });

  ctx.restore();
}

/* ─── Full redraw ───────────────────────────────────────────── */
function redrawAll(canvas, shapes, selId, pan, zoom = 100) {
  if (!canvas) return;
  const { width, height } = canvas;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);

  const rc = rough.canvas(canvas);
  const scale = zoom / 100;

  ctx.save();
  ctx.translate(pan.x, pan.y);
  ctx.scale(scale, scale);

  shapes.forEach(s => {
    const b = bounds(s);
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    if (s.angle) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(s.angle);
      ctx.translate(-cx, -cy);
    }
    drawShape(ctx, rc, s);
    if (s.angle) ctx.restore();
  });

  // Selection overlay
  if (selId) {
    const sel = shapes.find(s => s.id === selId);
    if (sel) drawSelBox(ctx, sel);
  }
  ctx.restore();
}

/* ════════════════════════════════════════════
   Canvas Component
════════════════════════════════════════════ */
const Canvas = forwardRef(function Canvas(
  {
    tool,
    color,
    backgroundColor,
    fillStyle,
    brushSize,
    strokeStyle,
    sloppiness,
    fontFamily,
    fontSize = 22,
    textAlign = 'left',
    opacity,
    zoom = 100,
    onHistoryChange,
    onToolChange,
    onSelectShape,
    onZoomChange,
  }, ref,
) {
  const canvasRef = useRef(null);
  const [shapes,  setShapes] = useState([]);
  const [selId,   setSelId]  = useState(null);
  const [pan,     setPan]    = useState({ x: 0, y: 0 });
  const [cursor,  setCursor] = useState('crosshair');

  const clipboardRef = useRef(null);

  // Always-fresh refs
  const shapesRef   = useRef([]);
  const selIdRef    = useRef(null);
  const panRef      = useRef({ x: 0, y: 0 });
  const zoomRef     = useRef(zoom);
  const toolRef     = useRef(tool);
  const colorRef    = useRef(color);
  const bgRef       = useRef(backgroundColor);
  const fillStRef   = useRef(fillStyle);
  const szRef       = useRef(brushSize);
  const strokeStRef = useRef(strokeStyle);
  const slopRef     = useRef(sloppiness);
  const fontRef     = useRef(fontFamily);
  const fsRef       = useRef(fontSize);
  const alignRef    = useRef(textAlign);
  const opRef       = useRef(opacity);

  useEffect(() => { shapesRef.current = shapes; }, [shapes]);
  useEffect(() => {
    selIdRef.current  = selId;
    if (selId) {
      const selected = shapesRef.current.find(s => s.id === selId);
      if (selected) onSelectShape?.(selected);
    } else {
      onSelectShape?.(null);
    }
  }, [selId, onSelectShape]);

  useEffect(() => { panRef.current      = pan;             }, [pan]);
  useEffect(() => { zoomRef.current     = zoom;            }, [zoom]);
  useEffect(() => { toolRef.current     = tool;            }, [tool]);
  useEffect(() => { colorRef.current    = color;           }, [color]);
  useEffect(() => { bgRef.current       = backgroundColor; }, [backgroundColor]);
  useEffect(() => { fillStRef.current   = fillStyle;       }, [fillStyle]);
  useEffect(() => { szRef.current       = brushSize;       }, [brushSize]);
  useEffect(() => { strokeStRef.current = strokeStyle;     }, [strokeStyle]);
  useEffect(() => { slopRef.current     = sloppiness;      }, [sloppiness]);
  useEffect(() => { fontRef.current     = fontFamily;      }, [fontFamily]);
  useEffect(() => { fsRef.current       = fontSize;        }, [fontSize]);
  useEffect(() => { alignRef.current    = textAlign;       }, [textAlign]);
  useEffect(() => { opRef.current       = opacity;         }, [opacity]);

  // Sync prop changes to currently selected shape
  useEffect(() => {
    if (!selIdRef.current) return;
    setShapes(prev => prev.map(s => {
      if (s.id !== selIdRef.current) return s;
      return {
        ...s,
        color,
        bg: backgroundColor,
        fillStyle,
        sz: brushSize,
        strokeStyle,
        sloppiness,
        fontFamily,
        fs: fontSize,
        textAlign,
        opacity,
      };
    }));
  }, [color, backgroundColor, fillStyle, brushSize, strokeStyle, sloppiness, fontFamily, fontSize, textAlign, opacity]);

  // Clear selection when switching away from select tool
  useEffect(() => {
    if (tool !== 'select') {
      setSelId(null);
      selIdRef.current   = null;
      movingId.current   = null;
      resizingId.current = null;
      moving.current     = false;
      resizing.current   = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  // Interaction refs
  const drawing        = useRef(false);
  const moving         = useRef(false);
  const resizing       = useRef(false);
  const panning        = useRef(false);
  const hasDragged     = useRef(false);
  const mouseDownPos   = useRef(null);
  const curShape       = useRef(null);
  const dragOrig       = useRef({ x: 0, y: 0 });
  const resizeHnd      = useRef(null);
  const panStart       = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const movingId   = useRef(null);
  const resizingId = useRef(null);

  // History
  const hist    = useRef([]);
  const redoStk = useRef([]);

  const pushHist = useCallback(() => {
    hist.current.push(shapesRef.current.map(s => ({ ...s })));
    redoStk.current = [];
    if (hist.current.length > 80) hist.current.shift();
    onHistoryChange?.({ canUndo: true, canRedo: false });
  }, [onHistoryChange]);

  // ── Copy / Cut / Paste / Duplicate ───────────────────────
  const copySelected = useCallback(() => {
    if (!selIdRef.current) return;
    const sel = shapesRef.current.find(s => s.id === selIdRef.current);
    if (sel) {
      clipboardRef.current = JSON.parse(JSON.stringify(sel));
    }
  }, []);

  const cutSelected = useCallback(() => {
    if (!selIdRef.current) return;
    copySelected();
    pushHist();
    setShapes(prev => prev.filter(s => s.id !== selIdRef.current));
    setSelId(null);
  }, [copySelected, pushHist]);

  const pasteSelected = useCallback(() => {
    if (!clipboardRef.current) return;
    const item = JSON.parse(JSON.stringify(clipboardRef.current));
    item.id = uid();
    item.seed = Math.floor(Math.random() * 100000);
    const offset = 24;

    if (item.type === 'brush') {
      item.pts = item.pts.map(p => ({ x: p.x + offset, y: p.y + offset }));
    } else if (item.type === 'text') {
      item.x += offset;
      item.y += offset;
    } else {
      item.x1 += offset;
      item.y1 += offset;
      item.x2 += offset;
      item.y2 += offset;
      if (item.cx !== undefined) item.cx += offset;
      if (item.cy !== undefined) item.cy += offset;
    }

    pushHist();
    setShapes(prev => [...prev, item]);
    setSelId(item.id);
    clipboardRef.current = item;
  }, [pushHist]);

  const duplicateSelected = useCallback(() => {
    if (!selIdRef.current) return;
    copySelected();
    pasteSelected();
  }, [copySelected, pasteSelected]);

  // ── Layer Reordering ─────────────────────────────────────
  const changeLayer = useCallback((action) => {
    if (!selIdRef.current) return;
    pushHist();
    setShapes(prev => {
      const idx = prev.findIndex(s => s.id === selIdRef.current);
      if (idx === -1) return prev;
      const item = prev[idx];
      const copy = [...prev];
      copy.splice(idx, 1);

      if (action === 'back') {
        copy.unshift(item);
      } else if (action === 'backward') {
        const newIdx = Math.max(0, idx - 1);
        copy.splice(newIdx, 0, item);
      } else if (action === 'forward') {
        const newIdx = Math.min(copy.length, idx + 1);
        copy.splice(newIdx, 0, item);
      } else if (action === 'front') {
        copy.push(item);
      }
      return copy;
    });
  }, [pushHist]);

  // ── Object/Segment Eraser Action ────────────────────────
  const eraseAtPos = useCallback((pos) => {
    const er = Math.max(szRef.current * 3, 10);
    let changed = false;
    const newShapes = [];

    for (const s of shapesRef.current) {
      if (s.type === 'brush') {
        if (shouldEraseShape(s, pos, er)) {
          changed = true;
          const split = eraseBrushStroke(s, pos, er);
          newShapes.push(...split);
        } else {
          newShapes.push(s);
        }
      } else {
        if (shouldEraseShape(s, pos, er)) {
          changed = true;
        } else {
          newShapes.push(s);
        }
      }
    }

    if (changed) {
      shapesRef.current = newShapes;
      setShapes(newShapes);
    }
  }, []);

  // ── Expose API ────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    undo() {
      if (!hist.current.length) return;
      redoStk.current.push(shapesRef.current.map(s => ({ ...s })));
      setShapes(hist.current.pop()); setSelId(null);
      onHistoryChange?.({ canUndo: hist.current.length > 0, canRedo: true });
    },
    redo() {
      if (!redoStk.current.length) return;
      hist.current.push(shapesRef.current.map(s => ({ ...s })));
      setShapes(redoStk.current.pop()); setSelId(null);
      onHistoryChange?.({ canUndo: true, canRedo: redoStk.current.length > 0 });
    },
    clear() { pushHist(); setShapes([]); setSelId(null); },
    changeLayer,
    copy: copySelected,
    cut: cutSelected,
    paste: pasteSelected,
    duplicate: duplicateSelected,
    download(theme = 'light') {
      const c = canvasRef.current;
      if (!c) return;
      const off = Object.assign(document.createElement('canvas'), { width: c.width, height: c.height });
      const oc = off.getContext('2d');
      const isDark = theme === 'dark';

      // Fill theme background
      oc.fillStyle = isDark ? '#13131a' : '#ffffff';
      oc.fillRect(0, 0, off.width, off.height);

      // Subtle Dot grid overlay
      oc.fillStyle = isDark ? 'rgba(108, 99, 255, 0.22)' : 'rgba(90, 82, 232, 0.15)';
      for (let x = 14; x < off.width; x += 28) {
        for (let y = 14; y < off.height; y += 28) {
          oc.beginPath();
          oc.arc(x, y, 1, 0, Math.PI * 2);
          oc.fill();
        }
      }

      oc.drawImage(c, 0, 0);

      const a = document.createElement('a');
      a.download = `letsdraw97-${theme}.png`;
      a.href = off.toDataURL('image/png');
      a.click();
    },
  }), [pushHist, onHistoryChange, changeLayer, copySelected, cutSelected, pasteSelected, duplicateSelected]);

  // ── Redraw on state change ───────────────────────────────
  useEffect(() => { redrawAll(canvasRef.current, shapes, selId, pan, zoom); }, [shapes, selId, pan, zoom]);

  // ── Canvas resize ────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    let raf;
    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      redrawAll(canvas, shapesRef.current, selIdRef.current, panRef.current, zoomRef.current);
    };
    resize();
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(resize); });
    ro.observe(canvas.parentElement);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  // ── WHEEL & PINCH TO ZOOM ────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Pinch zoom
        const zoomFactor = Math.pow(0.99, e.deltaY);
        const oldZoom = zoomRef.current;
        const newZoom = Math.min(Math.max(Math.round(oldZoom * zoomFactor), 15), 400);

        if (newZoom !== oldZoom) {
          const r = canvas.getBoundingClientRect();
          const mouseX = e.clientX - r.left;
          const mouseY = e.clientY - r.top;

          const oldScale = oldZoom / 100;
          const newScale = newZoom / 100;

          const newPanX = mouseX - (mouseX - panRef.current.x) * (newScale / oldScale);
          const newPanY = mouseY - (mouseY - panRef.current.y) * (newScale / oldScale);

          const np = { x: newPanX, y: newPanY };
          panRef.current = np;
          setPan(np);

          zoomRef.current = newZoom;
          onZoomChange?.(newZoom);
        }
      } else {
        // Scroll pan
        const np = {
          x: panRef.current.x - e.deltaX,
          y: panRef.current.y - e.deltaY,
        };
        panRef.current = np;
        setPan(np);
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [onZoomChange]);

  // ── TEXT ─────────────────────────────────────────────────
  const [textState, setTextState] = useState(null);
  const textRef      = useRef(null);
  const textStateRef = useRef(null);
  useEffect(() => { textStateRef.current = textState; }, [textState]);

  const commitText = useCallback(() => {
    const ts = textStateRef.current;
    setTextState(null);
    if (!ts || !ts.value.trim()) {
      onToolChange?.('select');
      return;
    }

    if (ts.shapeId) {
      pushHist();
      setShapes(prev => prev.map(s => s.id === ts.shapeId ? {
        ...s, text: ts.value, fs: fsRef.current, fontFamily: fontRef.current, textAlign: alignRef.current,
      } : s));
      setSelId(ts.shapeId);
    } else {
      const newId = uid();
      const shape = {
        id: newId, type: 'text',
        x: ts.worldX, y: ts.worldY, text: ts.value,
        fs: fsRef.current || 22,
        color: colorRef.current,
        sz: szRef.current,
        opacity: opRef.current,
        fontFamily: fontRef.current,
        textAlign: alignRef.current,
        seed: Math.floor(Math.random() * 100000),
      };
      pushHist();
      setShapes(prev => [...prev, shape]);
      setSelId(newId);
    }
    onToolChange?.('select');
  }, [pushHist, onToolChange]);

  const openText = useCallback((screenX, screenY, worldX, worldY, initialVal = '', shapeId = null) => {
    setTextState({ screenX, screenY, worldX, worldY, value: initialVal, shapeId });
  }, []);

  const hadText = useRef(false);
  useEffect(() => {
    if (textState && !hadText.current) {
      hadText.current = true;
      setTimeout(() => textRef.current?.focus(), 50);
    }
    if (!textState) hadText.current = false;
  }, [textState]);

  // ── MOUSE / TOUCH DOWN ───────────────────────────────────
  const onMouseDown = useCallback((e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const canvas = canvasRef.current;
    const pan    = panRef.current;
    const zm     = zoomRef.current;
    const pos    = getPos(e, canvas, pan, zm);
    const t      = toolRef.current;

    mouseDownPos.current = pos;
    hasDragged.current   = false;

    // IF A TEXT AREA IS ALREADY OPEN: CLICKING OUTSIDE COMMITS TEXT AND STOPS!
    if (textStateRef.current) {
      commitText();
      return;
    }

    if (t === 'hand') {
      panning.current = true;
      panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
      return;
    }

    // ── UNIVERSAL RESIZE / ROTATE / CURVE HANDLE CHECK ─────
    if (selIdRef.current) {
      const selShape = shapesRef.current.find(s => s.id === selIdRef.current);
      if (selShape) {
        const h = hitHandle(pos.x, pos.y, selShape);
        if (h) {
          pushHist();
          resizing.current   = true;
          resizingId.current = selShape.id;
          resizeHnd.current  = h.id;
          setCursor(h.cursor);
          return;
        }
      }
    }

    // ── TEXT TOOL ─────────────────────────────────────────────
    if (t === 'text') {
      if (selIdRef.current) {
        setSelId(null);
        selIdRef.current = null;
        redrawAll(canvasRef.current, shapesRef.current, null, panRef.current, zoomRef.current);
        onToolChange?.('select');
        return;
      }
      const sp = getScreenPos(e, canvas);
      setTimeout(() => {
        openText(sp.x, sp.y, pos.x, pos.y);
      }, 30);
      return;
    }

    // ── ERASER TOOL ──────────────────────────────────────────
    if (t === 'eraser') {
      pushHist();
      drawing.current = true;
      eraseAtPos(pos);
      return;
    }

    // ── SELECT TOOL ──────────────────────────────────────────
    if (t === 'select') {
      const found = [...shapesRef.current].reverse().find(s => hitShape(pos.x, pos.y, s));
      if (found) {
        setSelId(found.id);
        movingId.current = found.id;
        pushHist();
        moving.current   = true;
        dragOrig.current = pos;
        setCursor('move');
      } else {
        setSelId(null);
        movingId.current = null;
        setCursor('default');
      }
      return;
    }

    // ── DRAWING TOOLS ────────────────────────────────────────
    const grabbed = [...shapesRef.current].reverse().find(s => hitShape(pos.x, pos.y, s));
    if (grabbed) {
      setSelId(grabbed.id);
      movingId.current = grabbed.id;
      pushHist();
      moving.current   = true;
      dragOrig.current = pos;
      setCursor('move');
      return;
    }

    pushHist();
    drawing.current = true;
    const seed = Math.floor(Math.random() * 100000);

    if (t === 'brush') {
      curShape.current = {
        id: uid(), type: 'brush', pts: [pos],
        color: colorRef.current, bg: bgRef.current, fillStyle: fillStRef.current,
        sz: szRef.current, strokeStyle: strokeStRef.current, sloppiness: slopRef.current,
        fontFamily: fontRef.current, opacity: opRef.current, seed,
      };
      return;
    }

    curShape.current = {
      id: uid(), type: t,
      x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y,
      color: colorRef.current, bg: bgRef.current, fillStyle: fillStRef.current,
      sz: szRef.current, strokeStyle: strokeStRef.current, sloppiness: slopRef.current,
      fontFamily: fontRef.current, opacity: opRef.current, seed,
    };
  }, [commitText, openText, pushHist, eraseAtPos, onToolChange]);

  // ── MOUSE MOVE ───────────────────────────────────────────
  const onMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    const pan    = panRef.current;
    const zm     = zoomRef.current;
    const pos    = getPos(e, canvas, pan, zm);

    if (mouseDownPos.current) {
      if (Math.hypot(pos.x - mouseDownPos.current.x, pos.y - mouseDownPos.current.y) > 3) {
        hasDragged.current = true;
      }
    }

    // Pan
    if (panning.current) {
      const { mx, my, px, py } = panStart.current;
      const np = { x: px + e.clientX - mx, y: py + e.clientY - my };
      panRef.current = np;
      setPan(np);
      return;
    }

    // Resize / Rotate / Curve selected shape
    if (resizing.current && resizingId.current && resizeHnd.current) {
      setShapes(prev => prev.map(s =>
        s.id === resizingId.current ? applyResize(s, resizeHnd.current, pos.x, pos.y) : s,
      ));
      return;
    }

    // Move selected shape
    if (moving.current && movingId.current) {
      const dx  = pos.x - dragOrig.current.x;
      const dy  = pos.y - dragOrig.current.y;
      dragOrig.current = pos;
      setShapes(prev => prev.map(s => {
        if (s.id !== movingId.current) return s;
        if (s.type === 'brush')
          return { ...s, pts: s.pts.map(p => ({ x: p.x + dx, y: p.y + dy })) };
        if (s.type === 'text') return { ...s, x: s.x + dx, y: s.y + dy };
        const updated = { ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy };
        if (s.cx !== undefined) updated.cx = s.cx + dx;
        if (s.cy !== undefined) updated.cy = s.cy + dy;
        return updated;
      }));
      return;
    }

    // Drawing / Erasing
    if (drawing.current) {
      const t = toolRef.current;
      if (t === 'eraser') {
        eraseAtPos(pos);
        return;
      }

      if (curShape.current) {
        const c = curShape.current;
        if (c.type === 'brush') {
          c.pts.push(pos);
          redrawAll(canvas, [...shapesRef.current, c], selIdRef.current, pan, zm);
          return;
        }

        curShape.current = { ...c, x2: pos.x, y2: pos.y };
        redrawAll(canvas, [...shapesRef.current, curShape.current], selIdRef.current, pan, zm);
        return;
      }
    }

    // ── Hover / Cursor ───────────────────────────────────────
    const t = toolRef.current;

    if (t === 'hand') { setCursor('grab'); return; }
    if (t === 'eraser') { setCursor('cell'); return; }
    if (t === 'text') { setCursor('text'); return; }

    // 1. Handles on selected shape (rotation, points, resize)
    if (selIdRef.current) {
      const selShape = shapesRef.current.find(s => s.id === selIdRef.current);
      if (selShape) {
        const h = hitHandle(pos.x, pos.y, selShape);
        if (h) { setCursor(h.cursor); return; }
      }
    }

    // 2. Shape hover -> move cursor
    const hitAny = [...shapesRef.current].reverse().find(s => hitShape(pos.x, pos.y, s));
    if (hitAny) { setCursor('move'); return; }

    // 3. Empty space cursor
    setCursor(t === 'select' ? 'default' : 'crosshair');
  }, [eraseAtPos]);

  // ── MOUSE UP ─────────────────────────────────────────────
  const onMouseUp = useCallback(() => {
    panning.current      = false;
    mouseDownPos.current = null;

    if (resizing.current) {
      resizing.current   = false;
      resizingId.current = null;
      resizeHnd.current  = null;
      return;
    }
    if (moving.current) {
      moving.current   = false;
      movingId.current = null;
      return;
    }

    const wasDrawing = drawing.current;
    drawing.current  = false;

    if (!wasDrawing) return;

    const t = toolRef.current;
    if (t === 'eraser') return;

    const shape = curShape.current;
    curShape.current = null;

    if (!shape) return;

    if (shape.type === 'brush') {
      if (!shape.pts || shape.pts.length < 2 || !hasDragged.current) {
        setSelId(null);
        selIdRef.current = null;
        redrawAll(canvasRef.current, shapesRef.current, null, panRef.current, zoomRef.current);
        onToolChange?.('select');
        return;
      }
      setShapes(prev => [...prev, shape]);
      return;
    }

    if (!hasDragged.current || (Math.abs(shape.x2 - shape.x1) < 3 && Math.abs(shape.y2 - shape.y1) < 3)) {
      setSelId(null);
      selIdRef.current = null;
      redrawAll(canvasRef.current, shapesRef.current, null, panRef.current, zoomRef.current);
      onToolChange?.('select');
      return;
    }

    setShapes(prev => [...prev, shape]);
  }, [onToolChange]);

  // ── DOUBLE CLICK → ONLY open text when hitting a shape OR text tool active ──
  const onDblClick = useCallback((e) => {
    const canvas = canvasRef.current;
    const pan    = panRef.current;
    const zm     = zoomRef.current;
    const pos    = getPos(e, canvas, pan, zm);
    const sp     = getScreenPos(e, canvas);
    const t      = toolRef.current;

    const hit = [...shapesRef.current].reverse().find(s => hitShape(pos.x, pos.y, s));
    if (hit || t === 'text') {
      if (textStateRef.current) commitText();
      if (hit && hit.type === 'text') {
        openText(sp.x, sp.y, hit.x, hit.y, hit.text, hit.id);
      } else if (hit) {
        openText(sp.x, sp.y, pos.x, pos.y, hit.text || '', hit.id);
      } else {
        openText(sp.x, sp.y, pos.x, pos.y, '', null);
      }
    }
  }, [commitText, openText]);

  // ── KEYBOARD ─────────────────────────────────────────────
  useEffect(() => {
    const fn = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();

      if (isCmdOrCtrl && k === 'c') {
        e.preventDefault();
        copySelected();
      }
      if (isCmdOrCtrl && k === 'x') {
        e.preventDefault();
        cutSelected();
      }
      if (isCmdOrCtrl && k === 'v') {
        e.preventDefault();
        pasteSelected();
      }
      if (isCmdOrCtrl && k === 'd') {
        e.preventDefault();
        duplicateSelected();
      }

      if (isCmdOrCtrl && k === 'z' && !e.shiftKey) {
        e.preventDefault(); ref.current?.undo();
      }
      if (isCmdOrCtrl && (k === 'y' || (e.shiftKey && k === 'z'))) {
        e.preventDefault(); ref.current?.redo();
      }
      if (e.key === 'Escape') setSelId(null);
      if ((e.key === 'Delete' || e.key === 'Backspace') && selIdRef.current) {
        pushHist();
        setShapes(prev => prev.filter(s => s.id !== selIdRef.current));
        setSelId(null);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [ref, pushHist, copySelected, cutSelected, pasteSelected, duplicateSelected]);

  useEffect(() => {
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchend', onMouseUp);
    return () => {
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [onMouseUp]);

  const fontFamilyCss = fontRef.current === 'hand'
    ? "'Caveat', cursive"
    : fontRef.current === 'code'
      ? "'Fira Code', monospace"
      : fontRef.current === 'serif'
        ? "Georgia, serif"
        : "Inter, sans-serif";

  // Native non-passive touch event listeners for Android Chrome & iOS Safari
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleNativeTouchStart = (e) => {
      if (e.touches && e.touches.length > 1) return;
      if (e.cancelable) e.preventDefault();
      onMouseDown(e);
    };

    const handleNativeTouchMove = (e) => {
      if (e.touches && e.touches.length > 1) return;
      if (e.cancelable) e.preventDefault();
      onMouseMove(e);
    };

    const handleNativeTouchEnd = (e) => {
      if (e.cancelable) e.preventDefault();
      onMouseUp(e);
    };

    canvas.addEventListener('touchstart', handleNativeTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleNativeTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleNativeTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleNativeTouchStart);
      canvas.removeEventListener('touchmove', handleNativeTouchMove);
      canvas.removeEventListener('touchend', handleNativeTouchEnd);
      canvas.removeEventListener('touchcancel', handleNativeTouchEnd);
    };
  }, [onMouseDown, onMouseMove, onMouseUp]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        style={{ cursor, touchAction: 'none' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseLeave={() => { if (drawing.current) onMouseUp(); }}
        onDoubleClick={onDblClick}
      />

      {textState && (
        <textarea
          ref={textRef}
          id="canvas-text-input"
          value={textState.value}
          placeholder="Type here..."
          onChange={e => {
            const v = e.target.value;
            setTextState(prev => prev ? { ...prev, value: v } : prev);
          }}
          onKeyDown={e => {
            e.stopPropagation();
            if (e.key === 'Escape') { e.preventDefault(); commitText(); }
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitText(); }
          }}
          onMouseDown={e => e.stopPropagation()}
          onBlur={commitText}
          style={{
            position: 'absolute',
            left: textState.screenX,
            top:  textState.screenY,
            minWidth: 140,
            minHeight: 40,
            padding: '4px 8px',
            font: `600 ${Math.max((fsRef.current || 22) * (zoom / 100), 16)}px ${fontFamilyCss}`,
            textAlign: alignRef.current || 'left',
            lineHeight: 1.35,
            color: colorRef.current,
            caretColor: colorRef.current,
            background: 'transparent',
            border: '1px dashed #6c63ff',
            borderRadius: 6,
            outline: 'none',
            resize: 'both',
            zIndex: 600,
            whiteSpace: 'pre',
            overflow: 'auto',
          }}
        />
      )}
    </>
  );
});

export default Canvas;
