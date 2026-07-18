import type { CSSProperties, ReactNode } from "react";

/** The design system's hairline corner-registration frame (design/styles.css .blueprint). */
export function Blueprint({
  children,
  style,
  className,
  onClick,
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div className={`blueprint${className ? ` ${className}` : ""}`} style={style} onClick={onClick}>
      <i className="corner tl" />
      <i className="corner tr" />
      <i className="corner bl" />
      <i className="corner br" />
      {children}
    </div>
  );
}
