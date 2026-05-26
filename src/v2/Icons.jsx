// Inline SVG icon components — no external dependency.
// All icons are stroke-based, size controlled via `size` prop (default 16).

function Ico({ size = 16, children, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "inline-block", flexShrink: 0, ...style }}>
      {children}
    </svg>
  );
}

export function IconBarChart({ size, style }) {
  return (
    <Ico size={size} style={style}>
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </Ico>
  );
}

export function IconFlask({ size, style }) {
  return (
    <Ico size={size} style={style}>
      <path d="M9 3h6M9 3v8l-4 9h14L15 11V3"/>
      <path d="M7.5 19h9"/>
    </Ico>
  );
}

export function IconTarget({ size, style }) {
  return (
    <Ico size={size} style={style}>
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </Ico>
  );
}

export function IconCar({ size, style }) {
  return (
    <Ico size={size} style={style}>
      <path d="M19 17H5a2 2 0 01-2-2V9a2 2 0 012-2h2l2-3h6l2 3h2a2 2 0 012 2v6a2 2 0 01-2 2z"/>
      <circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/>
    </Ico>
  );
}

export function IconLeaf({ size, style }) {
  return (
    <Ico size={size} style={style}>
      <path d="M2 22c1.25-4.5 5-8 11-9 1.5 4.5-1 9-11 9z"/>
      <path d="M22 2C14 2 8 8 7 13"/>
    </Ico>
  );
}

export function IconZap({ size, style }) {
  return (
    <Ico size={size} style={style}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </Ico>
  );
}

export function IconRecycle({ size, style }) {
  return (
    <Ico size={size} style={style}>
      <path d="M7 19H4.815a1.83 1.83 0 01-1.57-2.757L7.43 9.5"/>
      <path d="M11 19h8.185a1.83 1.83 0 001.57-2.757L16.57 9.5"/>
      <path d="M12 5L9.5 9.5M12 5l2.5 4.5M12 5V3"/>
      <path d="M4.972 9.5H7.43M16.57 9.5h2.458"/>
      <path d="M7.43 9.5L9.5 13M16.57 9.5L14.5 13"/>
      <path d="M9.5 19v2M14.5 19v2"/>
    </Ico>
  );
}

export function IconFactory({ size, style }) {
  return (
    <Ico size={size} style={style}>
      <path d="M2 20h20"/>
      <path d="M2 20V8l6 4V8l6 4V4l4 4v12"/>
      <line x1="10" y1="20" x2="10" y2="14"/><line x1="14" y1="20" x2="14" y2="14"/>
    </Ico>
  );
}

export function IconTrendingDown({ size, style }) {
  return (
    <Ico size={size} style={style}>
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
      <polyline points="17 18 23 18 23 12"/>
    </Ico>
  );
}

export function IconTrendingUp({ size, style }) {
  return (
    <Ico size={size} style={style}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </Ico>
  );
}

export function IconDollarSign({ size, style }) {
  return (
    <Ico size={size} style={style}>
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </Ico>
  );
}

export function IconPlay({ size, style }) {
  return (
    <Ico size={size} style={style}>
      <polygon points="5 3 19 12 5 21 5 3"/>
    </Ico>
  );
}

export function IconChevronDown({ size, style }) {
  return (
    <Ico size={size} style={style}>
      <polyline points="6 9 12 15 18 9"/>
    </Ico>
  );
}

export function IconChevronUp({ size, style }) {
  return (
    <Ico size={size} style={style}>
      <polyline points="18 15 12 9 6 15"/>
    </Ico>
  );
}

export function IconArrowUp({ size, style }) {
  return (
    <Ico size={size} style={style}>
      <line x1="12" y1="19" x2="12" y2="5"/>
      <polyline points="5 12 12 5 19 12"/>
    </Ico>
  );
}

export function IconArrowDown({ size, style }) {
  return (
    <Ico size={size} style={style}>
      <line x1="12" y1="5" x2="12" y2="19"/>
      <polyline points="19 12 12 19 5 12"/>
    </Ico>
  );
}

export function IconDownload({ size, style }) {
  return (
    <Ico size={size} style={style}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </Ico>
  );
}

export function IconInfo({ size, style }) {
  return (
    <Ico size={size} style={style}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </Ico>
  );
}

// Map from sector key → icon component
export const SECTOR_ICON_MAP = {
  transport:   IconCar,
  agriculture: IconLeaf,
  energy:      IconZap,
  waste:       IconRecycle,
  industrial:  IconFactory,
};
