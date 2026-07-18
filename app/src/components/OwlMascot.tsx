"use client";

/**
 * dispatchlingo mascot — a Duolingo-style green owl wearing a 911 police cap
 * and a dispatcher headset. Pure SVG so it scales crisply at any size and
 * needs no image asset. `wink` swaps one eye for a happy curve (used on the
 * "passed" screen); `talking` gives the headset mic a gentle pulse.
 */
export function OwlMascot({
  size = 140,
  wink = false,
  float = false,
  style,
}: {
  size?: number;
  wink?: boolean;
  float?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={float ? "anim-float" : undefined}
      style={style}
      aria-label="dispatchlingo owl mascot"
    >
      <defs>
        <linearGradient id="owlBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7ed957" />
          <stop offset="1" stopColor="#4faf12" />
        </linearGradient>
        <linearGradient id="owlBelly" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d6f5b8" />
          <stop offset="1" stopColor="#b6e88a" />
        </linearGradient>
        <linearGradient id="owlCap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#243247" />
          <stop offset="1" stopColor="#111a2b" />
        </linearGradient>
        <radialGradient id="owlShadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(0,0,0,0.35)" />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      {/* ground shadow */}
      <ellipse cx="100" cy="184" rx="52" ry="10" fill="url(#owlShadow)" />

      {/* headphone band */}
      <path d="M40 96 A60 60 0 0 1 160 96" fill="none" stroke="#1b2740" strokeWidth="12" strokeLinecap="round" />

      {/* ear tufts */}
      <path d="M55 60 L70 26 L86 58 Z" fill="url(#owlBody)" />
      <path d="M145 60 L130 26 L114 58 Z" fill="url(#owlBody)" />

      {/* body */}
      <path
        d="M100 44
           C58 44 40 74 40 108
           C40 150 66 176 100 176
           C134 176 160 150 160 108
           C160 74 142 44 100 44 Z"
        fill="url(#owlBody)"
      />

      {/* belly */}
      <path
        d="M100 96 C78 96 68 112 68 132 C68 158 84 170 100 170 C116 170 132 158 132 132 C132 112 122 96 100 96 Z"
        fill="url(#owlBelly)"
      />

      {/* police cap */}
      <path d="M52 60 Q100 22 148 60 L150 66 Q100 44 50 66 Z" fill="url(#owlCap)" />
      <rect x="48" y="60" width="104" height="12" rx="6" fill="#0c1424" />
      {/* cap badge */}
      <rect x="86" y="40" width="28" height="20" rx="5" fill="#0e1830" stroke="#3a6bd6" strokeWidth="1.5" />
      <text x="100" y="54" textAnchor="middle" fontFamily="Baloo 2, sans-serif" fontWeight="800" fontSize="11" fill="#5aa2ff">911</text>

      {/* eyes */}
      <circle cx="80" cy="104" r="24" fill="#fff" />
      <circle cx="120" cy="104" r="24" fill="#fff" />
      {wink ? (
        <path d="M70 106 Q80 96 90 106" fill="none" stroke="#1a1a1a" strokeWidth="5" strokeLinecap="round" />
      ) : (
        <>
          <circle cx="82" cy="106" r="10" fill="#12212e" />
          <circle cx="85" cy="102" r="3.2" fill="#fff" />
        </>
      )}
      <circle cx="118" cy="106" r="10" fill="#12212e" />
      <circle cx="121" cy="102" r="3.2" fill="#fff" />

      {/* beak */}
      <path d="M100 116 L112 126 L100 138 L88 126 Z" fill="#ff9f1c" />
      <path d="M100 127 L112 126 L100 138 Z" fill="#f57e0f" />

      {/* headphone cups */}
      <rect x="30" y="92" width="20" height="30" rx="9" fill="#22314e" stroke="#0d1424" strokeWidth="2" />
      <rect x="150" y="92" width="20" height="30" rx="9" fill="#22314e" stroke="#0d1424" strokeWidth="2" />

      {/* mic boom */}
      <path d="M40 118 Q40 150 74 150" fill="none" stroke="#1b2740" strokeWidth="5" strokeLinecap="round" />
      <circle cx="76" cy="150" r="5" fill="#5aa2ff" />
    </svg>
  );
}
