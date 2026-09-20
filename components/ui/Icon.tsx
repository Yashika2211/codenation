type IconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

/**
 * Inline stroke icons. No emoji anywhere in CodeNation, and no icon font —
 * every glyph is a 24-viewBox path that inherits `currentColor`.
 */
function Svg({
  size = 16,
  className,
  strokeWidth = 1.6,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function IconTerminal(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 8 4 4-4 4" />
      <path d="M13 16h6" />
      <rect x="2" y="3" width="20" height="18" rx="3" />
    </Svg>
  );
}

export function IconCube(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.5 21 7v10l-9 4.5L3 17V7z" />
      <path d="M3 7l9 4.5L21 7" />
      <path d="M12 11.5V21.5" />
    </Svg>
  );
}

export function IconGlobe(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.7 3.8 5.7 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
    </Svg>
  );
}

export function IconAnvil(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 8h7l2.5 3H19a2 2 0 0 0 2-2V8" />
      <path d="M10 11v3H7l-1 5h12l-1-5h-3v-3" />
      <path d="M3 8V6" />
    </Svg>
  );
}

export function IconSwords(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14.5 14.5 21 8V3h-5l-6.5 6.5" />
      <path d="m9.5 9.5-6.5 6.5v5h5l6.5-6.5" />
      <path d="m5 19 2-2" />
      <path d="m17 7 2-2" />
    </Svg>
  );
}

export function IconNodes(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="5" cy="6" r="2.5" />
      <circle cx="19" cy="6" r="2.5" />
      <circle cx="12" cy="18" r="2.5" />
      <path d="M7 7.5 10.5 16" />
      <path d="M17 7.5 13.5 16" />
      <path d="M7.5 6h9" />
    </Svg>
  );
}

export function IconShield(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.5 20 6v6.2c0 4.3-3.2 7.9-8 9.3-4.8-1.4-8-5-8-9.3V6z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </Svg>
  );
}

export function IconSpark(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.5 14 9.5l7 2-7 2-2 7-2-7-7-2 7-2z" />
    </Svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0" />
      <path d="M16.5 5.3a3.2 3.2 0 0 1 0 5.4" />
      <path d="M18 14.4A6.2 6.2 0 0 1 21.2 20" />
    </Svg>
  );
}

export function IconGithub(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15 21.5v-3.2c0-1-.3-1.7-.9-2.2 2.9-.3 5.6-1.4 5.6-6.1 0-1.3-.5-2.4-1.2-3.3.1-.3.5-1.5-.1-3.2 0 0-1-.3-3.3 1.2a11.4 11.4 0 0 0-6 0C6.8 3.2 5.8 3.5 5.8 3.5c-.6 1.7-.2 2.9-.1 3.2A4.8 4.8 0 0 0 4.5 10c0 4.7 2.7 5.8 5.6 6.1-.4.4-.7.9-.8 1.7-1.8.8-3.3-.4-4.1-1.5" />
      <path d="M9.3 17.8v3.7" />
    </Svg>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </Svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m4.5 12.5 5 5 10-11" />
    </Svg>
  );
}

export function IconX(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </Svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.3l3.3 2" />
    </Svg>
  );
}

export function IconLock(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="10" width="16" height="11" rx="2.5" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </Svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 4.8 19 12 7 19.2z" />
    </Svg>
  );
}

export function IconFlag(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 21V4" />
      <path d="M5 4.5h12l-2.2 4L17 12.5H5z" />
    </Svg>
  );
}

export function IconChart(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="m7.5 15.5 3.5-4.5 3 2.5 4.5-6" />
    </Svg>
  );
}
