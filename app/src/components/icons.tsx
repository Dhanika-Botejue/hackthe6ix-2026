"use client";

/** Compact stroke-icon set used across dispatchlingo. */
export type IconName =
  | "phone"
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
  | "clock"
  | "check"
  | "x"
  | "chevron";

const P: Record<IconName, React.ReactNode> = {
  phone: <path d="M6.5 3.5 9 4l1 3-1.5 1.5a10 10 0 0 0 4.5 4.5L14.5 15l3 1 .5 2.5a2 2 0 0 1-2.2 2A15 15 0 0 1 3 6.7 2 2 0 0 1 5 4.5Z" />,
  fire: <path d="M12 3s5 3.5 5 8.5a5 5 0 0 1-10 0c0-2 1-3 1-3s0 2 1.5 2S12 8 10.5 5.5C12 5 12 3 12 3Z" />,
  car: <><path d="M4 12l1.5-4A2 2 0 0 1 7.4 6.7h9.2A2 2 0 0 1 18.5 8L20 12v5h-3v-2H7v2H4Z" /><circle cx="7.5" cy="14.5" r="1.2" /><circle cx="16.5" cy="14.5" r="1.2" /></>,
  medical: <path d="M12 4v16M4 12h16" strokeWidth="2.6" />,
  burglary: <><circle cx="12" cy="9" r="3" /><path d="M6 12l-1.5-2M18 12l1.5-2M5 19a7 7 0 0 1 14 0" /></>,
  assault: <path d="M4 15 14 5l2 2-2 2 3 3-2 2-3-3-4 4Zm12-9 2-2 2 2-2 2Z" />,
  shield: <path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6Z" />,
  lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  home: <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1Z" />,
  chart: <path d="M5 19V5M5 19h14M9 19v-6M13 19v-9M17 19v-4" strokeWidth="2.2" />,
  trophy: <path d="M7 4h10v3a5 5 0 0 1-10 0Zm0 1H4v1a3 3 0 0 0 3 3m10-4h3v1a3 3 0 0 1-3 3m-5 4v3m-3 3h6" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.5-6.5-2 2m-9 9-2 2m13 0-2-2m-9-9-2-2" /></>,
  heart: <path d="M12 20S4 14.5 4 9a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5.5-8 11-8 11Z" />,
  lungs: <path d="M12 4v8M9 9c0 3-3 3-3 7a2 2 0 0 0 3 1c1-1 1.5-3 1.5-5M15 9c0 3 3 3 3 7a2 2 0 0 1-3 1c-1-1-1.5-3-1.5-5" />,
  flame: <path d="M12 3s5 3.5 5 8.5a5 5 0 0 1-10 0c0-2 1-3 1-3s0 2 1.5 2S12 8 10.5 5.5C12 5 12 3 12 3Z" />,
  emotion: <><circle cx="12" cy="12" r="8" /><circle cx="9" cy="10" r="0.6" /><circle cx="15" cy="10" r="0.6" /><path d="M9 14.5c1 1 5 1 6 0" /></>,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>,
  check: <path d="M5 12l4 4L19 7" strokeWidth="2.6" />,
  x: <path d="M6 6l12 12M18 6 6 18" strokeWidth="2.6" />,
  chevron: <path d="M9 6l6 6-6 6" />,
};

export function Icon({
  name,
  size = 22,
  color = "currentColor",
  fill = false,
  strokeWidth = 1.8,
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  fill?: boolean;
  strokeWidth?: number;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? color : "none"}
      stroke={fill ? "none" : color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden
    >
      {P[name]}
    </svg>
  );
}
