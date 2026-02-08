interface GadsIconProps {
  className?: string;
  size?: number;
}

/**
 * Icona Google Ads monocromatica (gradiente oro → arancione)
 * Replica la forma della "A" di Google Ads:
 * - Barra verticale sinistra (inclinata)
 * - Barra verticale destra (inclinata)
 * - Cerchio in basso a destra
 */
export function GadsIcon({ className, size = 22 }: GadsIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id="gads-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d4a726" />
          <stop offset="100%" stopColor="#ff8f65" />
        </linearGradient>
      </defs>
      {/* Barra sinistra della A (inclinata) */}
      <rect
        x="2.5"
        y="2"
        width="4.2"
        height="18"
        rx="2.1"
        fill="url(#gads-grad)"
        transform="rotate(-15, 4.6, 11)"
      />
      {/* Barra destra della A (inclinata) */}
      <rect
        x="10.5"
        y="2"
        width="4.2"
        height="18"
        rx="2.1"
        fill="url(#gads-grad)"
        transform="rotate(15, 12.6, 11)"
      />
      {/* Cerchio in basso a destra */}
      <circle cx="18.5" cy="18.5" r="3.5" fill="url(#gads-grad)" />
    </svg>
  );
}
