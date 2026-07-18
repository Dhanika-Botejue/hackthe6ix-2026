"use client";

import type { CSSProperties } from "react";

/**
 * dispatchlingo mascot / logo. Renders the brand owl from /public/owl.svg, so
 * the logo can be swapped anywhere by replacing that single asset. `size` sets
 * the width; height follows the artwork's aspect ratio. `float` adds the idle
 * bob. `wink` is accepted for call-site compatibility (the flat asset doesn't
 * change per state).
 */
export function OwlMascot({
  size = 140,
  float = false,
  style,
}: {
  size?: number;
  wink?: boolean;
  float?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      role="img"
      aria-label="dispatchlingo owl mascot"
      className={float ? "anim-float" : undefined}
      style={{
        width: size,
        aspectRatio: "616 / 405",
        backgroundImage: "url(/owl.svg)",
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        ...style,
      }}
    />
  );
}
