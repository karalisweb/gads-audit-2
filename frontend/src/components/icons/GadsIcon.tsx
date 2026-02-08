interface GadsIconProps {
  className?: string;
  size?: number;
}

export function GadsIcon({ className, size = 22 }: GadsIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
    >
      <defs>
        <linearGradient id="gads-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d4a726" />
          <stop offset="100%" stopColor="#ff8f65" />
        </linearGradient>
      </defs>
      {/* Google Ads triangle */}
      <path
        d="M10 26 L16 6 L22 26 Z"
        fill="none"
        stroke="url(#gads-grad)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Horizontal bar */}
      <line
        x1="12"
        y1="20.5"
        x2="20"
        y2="20.5"
        stroke="url(#gads-grad)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Click dot */}
      <circle cx="23" cy="10" r="2.5" fill="#ff8f65" />
      <circle
        cx="23"
        cy="10"
        r="4.5"
        fill="none"
        stroke="#ff8f65"
        strokeWidth="0.8"
        opacity="0.5"
      />
    </svg>
  );
}
