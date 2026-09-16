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
} from 'lucide-react';

const TOOLS = [
  { id: 'select',    icon: <MousePointer2 size={16} />, label: 'Select',    kbd: 'V' },
  { id: 'hand',      icon: <Hand size={16} />,          label: 'Pan',       kbd: 'H' },
  null, // divider
  { id: 'brush',     icon: <Pencil size={16} />,        label: 'Pencil',    kbd: 'P' },
  { id: 'eraser',    icon: <Eraser size={16} />,        label: 'Eraser',    kbd: 'E' },
  null,
  { id: 'rectangle', icon: <Square size={16} />,        label: 'Rectangle', kbd: 'R' },
  { id: 'circle',    icon: <Circle size={16} />,        label: 'Circle',    kbd: 'C' },
  { id: 'line',      icon: <Minus size={16} />,         label: 'Line',      kbd: 'L' },
  { id: 'arrow',     icon: <MoveRight size={16} />,     label: 'Arrow',     kbd: 'A' },
  { id: 'text',      icon: <Type size={16} />,          label: 'Text',      kbd: 'T' },
];

export default function Toolbar({ activeTool, onChange }) {
  return (
    <div className="top-bar" role="toolbar" aria-label="Drawing tools">
      {TOOLS.map((tool, i) => {
        if (tool === null) return <div key={`div-${i}`} className="top-bar-divider" />;
        return (
          <button
            key={tool.id}
            id={`tool-${tool.id}`}
            className={`tool-btn${activeTool === tool.id ? ' active' : ''}`}
            onClick={() => onChange(tool.id)}
            data-tooltip={`${tool.label} (${tool.kbd})`}
            aria-label={tool.label}
            aria-pressed={activeTool === tool.id}
          >
            {tool.icon}
            <span className="kbd">{tool.kbd}</span>
          </button>
        );
      })}
    </div>
  );
}

// Export keyboard map for use in App.jsx
export const TOOL_KEY_MAP = Object.fromEntries(
  TOOLS.filter(Boolean).map((t) => [t.kbd.toLowerCase(), t.id])
);
