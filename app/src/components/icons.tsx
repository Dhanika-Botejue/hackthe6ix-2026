"use client";

/**
 * Nine One Run icon set — hand-drawn filled/duotone glyphs instead of generic
 * stroke outlines. Each icon declares its own preferred rendering mode; the
 * `fill` prop still overrides it for call-site compatibility.
 */
export type IconName =
  | "phone"
  | "headset"
  | "fire"
  | "car"
  | "medical"
  | "burglary"
  | "assault"
  | "shield"
  | "lock"
  | "home"
  | "chart"
  | "trophy"
  | "gear"
  | "heart"
  | "lungs"
  | "flame"
  | "emotion"
  | "bolt"
  | "clock"
  | "pin"
  | "warning"
  | "people"
  | "bookmark"
  | "help"
  | "info"
  | "mic"
  | "check"
  | "x"
  | "chevron";

interface IconDef {
  el: React.ReactNode;
  mode: "fill" | "stroke";
  sw?: number;
}

const FIRE_PATH =
  "M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z";

const ICONS: Record<IconName, IconDef> = {
  /* classic solid handset — rotate 135° at call sites for "end call" */
  phone: {
    mode: "fill",
    el: (
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.21c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    ),
  },
  /* dispatcher headset with mic boom */
  headset: {
    mode: "fill",
    el: (
      <>
        <path d="M4.5 14.5v-3.3a7.5 7.5 0 0 1 15 0v3.3" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="2.8" y="12.6" width="4.2" height="6.6" rx="1.9" />
        <rect x="17" y="12.6" width="4.2" height="6.6" rx="1.9" />
        <path d="M19.1 19.2a4.8 4.8 0 0 1-4.3 2.6h-2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12.6" cy="21.8" r="1.5" />
      </>
    ),
  },
  /* whatshot-style flame with inner swirl */
  fire: { mode: "fill", el: <path d={FIRE_PATH} /> },
  flame: { mode: "fill", el: <path d={FIRE_PATH} /> },
  /* collision — car silhouette + impact spark */
  car: {
    mode: "fill",
    el: (
      <>
        <g transform="translate(0.6 3.2) scale(0.85)">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
        </g>
        <path d="M18.6 1.2l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5Z" />
      </>
    ),
  },
  /* first-aid case with cross cutout */
  medical: {
    mode: "fill",
    el: (
      <path d="M4 8.2A2.2 2.2 0 0 1 6.2 6h11.6A2.2 2.2 0 0 1 20 8.2v9.6a2.2 2.2 0 0 1-2.2 2.2H6.2A2.2 2.2 0 0 1 4 17.8V8.2Zm7 1.3v2.5H8.5v3H11v2.5h2V15h2.5v-3H13V9.5h-2ZM9.2 6V4.4A2.4 2.4 0 0 1 11.6 2h.8a2.4 2.4 0 0 1 2.4 2.4V6h-1.9V4.4a.5.5 0 0 0-.5-.5h-.8a.5.5 0 0 0-.5.5V6H9.2Z" />
    ),
  },
  /* masked robber — head, mask band with eye cutouts, shoulders */
  burglary: {
    mode: "fill",
    el: (
      <path d="M12 3.6a5.1 5.1 0 1 1 0 10.2 5.1 5.1 0 0 1 0-10.2ZM6.1 7.9h11.8a.8.8 0 0 1 .8.8v1a.8.8 0 0 1-.8.8H6.1a.8.8 0 0 1-.8-.8v-1a.8.8 0 0 1 .8-.8Zm3.3.05a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Zm5.2 0a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5ZM12 14.9c3.9 0 7.1 2.7 7.4 6.1H4.6c.3-3.4 3.5-6.1 7.4-6.1Z" />
    ),
  },
  /* knife — curved blade + diagonal handle */
  assault: {
    mode: "fill",
    el: (
      <>
        <path d="M3.1 3c5.4.3 9.9 3 12 7.7l-3.4 3.4C7 12 4.3 7.5 3.1 3Z" />
        <path d="M15.9 12.5l3.6 3.6a1.5 1.5 0 0 1 0 2.1l-1.3 1.3a1.5 1.5 0 0 1-2.1 0l-3.6-3.6 3.4-3.4Z" />
      </>
    ),
  },
  /* badge shield with star cutout */
  shield: {
    mode: "fill",
    el: (
      <path d="M12 2.1 20.2 5.3v6.2c0 5-3.4 8.3-8.2 10.6C7.2 19.8 3.8 16.5 3.8 11.5V5.3L12 2.1Zm0 5.5.76 2.15 2.28.06-1.8 1.39.64 2.19L12 12.1l-1.88 1.29.64-2.19-1.8-1.39 2.28-.06L12 7.6Z" />
    ),
  },
  /* padlock — solid body, keyhole cutout, stroked shackle */
  lock: {
    mode: "fill",
    el: (
      <>
        <path d="M7.8 10.7h8.4a2.4 2.4 0 0 1 2.4 2.4v4.9a2.4 2.4 0 0 1-2.4 2.4H7.8a2.4 2.4 0 0 1-2.4-2.4v-4.9a2.4 2.4 0 0 1 2.4-2.4Zm4.2 2.9a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Z" />
        <path d="M8.6 10.7V7.4a3.4 3.4 0 0 1 6.8 0v3.3" fill="none" stroke="currentColor" strokeWidth="2" />
      </>
    ),
  },
  home: { mode: "fill", el: <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z" /> },
  /* ascending signal bars */
  chart: {
    mode: "fill",
    el: (
      <>
        <rect x="3.6" y="12.6" width="4" height="7.6" rx="1.4" />
        <rect x="10" y="8.2" width="4" height="12" rx="1.4" />
        <rect x="16.4" y="3.8" width="4" height="16.4" rx="1.4" />
      </>
    ),
  },
  /* solid trophy with pierced handles + base */
  trophy: {
    mode: "fill",
    el: (
      <>
        <path d="M6.8 3h10.4v1.4h3.2v2a4.9 4.9 0 0 1-3.9 4.81 5.9 5.9 0 0 1-3.3 2.49v2.3h1.4a1.3 1.3 0 0 1 1.3 1.3v1.3H8.1v-1.3a1.3 1.3 0 0 1 1.3-1.3h1.4v-2.3a5.9 5.9 0 0 1-3.3-2.49A4.9 4.9 0 0 1 3.6 6.4v-2h3.2V3Zm-2.5 3.6a1.05 1.05 0 1 0 2.1 0 1.05 1.05 0 0 0-2.1 0Zm13.3 0a1.05 1.05 0 1 0 2.1 0 1.05 1.05 0 0 0-2.1 0Z" />
        <rect x="6.9" y="19.6" width="10.2" height="1.9" rx="0.9" />
      </>
    ),
  },
  gear: {
    mode: "fill",
    el: (
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    ),
  },
  heart: {
    mode: "fill",
    el: (
      <path d="M12 20.8C6.2 16.9 3.2 13.3 3.2 9.5 3.2 6.8 5.3 4.8 7.9 4.8c1.6 0 3.1.8 4.1 2.1 1-1.3 2.5-2.1 4.1-2.1 2.6 0 4.7 2 4.7 4.7 0 3.8-3 7.4-8.8 11.3Z" />
    ),
  },
  lungs: {
    mode: "fill",
    el: (
      <>
        <path d="M12 3.4v5.2m0 0c0 1.5-1 2.4-2.4 3.1M12 8.6c0 1.5 1 2.4 2.4 3.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9.3 10.2c.8-.4 1.6.2 1.6 1.1v6.5c0 2-1.3 3.5-3.1 3.5-1.8 0-2.9-1.3-2.9-3.3 0-4.3 2.3-6.7 4.4-7.8Z" />
        <path d="M14.7 10.2c2.1 1.1 4.4 3.5 4.4 7.8 0 2-1.1 3.3-2.9 3.3-1.8 0-3.1-1.5-3.1-3.5v-6.5c0-.9.8-1.5 1.6-1.1Z" />
      </>
    ),
  },
  /* solid smiley with punched eyes + smile */
  emotion: {
    mode: "fill",
    el: (
      <path d="M12 2.9a9.1 9.1 0 1 1 0 18.2 9.1 9.1 0 0 1 0-18.2ZM8.9 8.6a1.35 1.35 0 1 0 0 2.7 1.35 1.35 0 0 0 0-2.7Zm6.2 0a1.35 1.35 0 1 0 0 2.7 1.35 1.35 0 0 0 0-2.7ZM8.2 13.9c1.9.74 5.7.74 7.6 0 .5-.2.95.35.7.82-.85 1.6-2.1 2.48-3.8 2.48s-2.95-.88-3.8-2.48c-.25-.47.2-1.02.7-.82Z" />
    ),
  },
  bolt: { mode: "fill", el: <path d="M13.2 2.2 5.7 13.1h4.2L8.8 21.8l7.5-10.9h-4.2l1.1-8.7Z" /> },
  clock: {
    mode: "fill",
    el: (
      <path d="M12 2.8a9.2 9.2 0 1 1 0 18.4 9.2 9.2 0 0 1 0-18.4Zm-1 3.4v6.4c0 .34.17.65.45.83l4.2 2.6 1.05-1.6-3.8-2.33V6.2h-1.9Z" />
    ),
  },
  pin: {
    mode: "fill",
    el: (
      <path d="M12 2.4a7 7 0 0 1 7 7c0 5-7 12.2-7 12.2S5 14.4 5 9.4a7 7 0 0 1 7-7Zm0 4.3a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4Z" />
    ),
  },
  warning: {
    mode: "fill",
    el: (
      <path d="M13.6 4.2c-.7-1.2-2.5-1.2-3.2 0L3.2 16.9c-.7 1.2.2 2.8 1.6 2.8h14.4c1.4 0 2.3-1.6 1.6-2.8L13.6 4.2Zm-2.5 4.6h1.8l-.3 5.4h-1.2l-.3-5.4Zm.9 6.9a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z" />
    ),
  },
  people: {
    mode: "fill",
    el: (
      <>
        <path d="M9.2 4.6a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2Z" />
        <path d="M9.2 13.6c3.5 0 6.4 2.4 6.9 5.6l.1 1H2.2l.1-1c.5-3.2 3.4-5.6 6.9-5.6Z" />
        <path d="M16.4 5.6a3.1 3.1 0 0 1 0 6.2 4.9 4.9 0 0 0 0-6.2Z" />
        <path d="M17.5 13.9c2.4.6 4.2 2.5 4.6 4.9l.2 1.4h-3.9c-.1-2.4-1.2-4.6-2.9-6 .6-.3 1.3-.4 2-.3Z" />
      </>
    ),
  },
  bookmark: {
    mode: "fill",
    el: (
      <path d="M8 3.4h8A1.6 1.6 0 0 1 17.6 5v15.1a.6.6 0 0 1-.95.5L12 17.2l-4.65 3.4a.6.6 0 0 1-.95-.5V5A1.6 1.6 0 0 1 8 3.4Z" />
    ),
  },
  help: {
    mode: "stroke",
    sw: 1.9,
    el: (
      <>
        <circle cx="12" cy="12" r="8.6" />
        <path d="M9.4 9.3a2.7 2.7 0 1 1 3.7 3.1c-.8.35-1.1.8-1.1 1.7v.3" />
        <circle cx="12" cy="17.3" r="0.9" fill="currentColor" stroke="none" />
      </>
    ),
  },
  info: {
    mode: "stroke",
    sw: 1.9,
    el: (
      <>
        <circle cx="12" cy="12" r="8.6" />
        <path d="M12 11.2v5.2" />
        <circle cx="12" cy="7.9" r="0.9" fill="currentColor" stroke="none" />
      </>
    ),
  },
  mic: {
    mode: "fill",
    el: (
      <>
        <rect x="9.4" y="2.8" width="5.2" height="9.6" rx="2.6" />
        <path d="M6.2 11.2a5.8 5.8 0 0 0 11.6 0M12 17v3.4M8.8 20.4h6.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </>
    ),
  },
  check: { mode: "stroke", sw: 2.6, el: <path d="M5 12l4 4L19 7" /> },
  x: { mode: "stroke", sw: 2.6, el: <path d="M6 6l12 12M18 6 6 18" /> },
  chevron: { mode: "stroke", el: <path d="M9 6l6 6-6 6" /> },
};

/** Colored rounded-square badge holding an icon — shared glyph style for stat rows. */
export function IconBadge({ name, color, size = 34, icon = 18 }: { name: IconName; color: string; size?: number; icon?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: `color-mix(in srgb, ${color} 16%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
        display: "grid",
        placeItems: "center",
        flex: "none",
      }}
    >
      <Icon name={name} size={icon} color={color} />
    </span>
  );
}

export function Icon({
  name,
  size = 22,
  color = "currentColor",
  fill,
  strokeWidth,
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  /** Override the icon's own mode; leave undefined to use its natural style. */
  fill?: boolean;
  strokeWidth?: number;
  style?: React.CSSProperties;
}) {
  const def = ICONS[name];
  const filled = fill ?? def.mode === "fill";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      fillRule="evenodd"
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={strokeWidth ?? def.sw ?? 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color, flex: "none", ...style }}
      aria-hidden
    >
      {def.el}
    </svg>
  );
}
