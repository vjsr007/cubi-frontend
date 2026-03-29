import { SYSTEM_LOGOS } from '../../assets/system-logos';

interface SystemLogoProps {
  systemId: string;
  /** Logo height in pixels (width is auto). Default: 32 */
  size?: number;
  /** Text shown when no logo is available */
  fallbackText?: string;
  /** Additional inline styles applied to the <img> or fallback <span> */
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Renders a system's SVG logo by systemId, with a text fallback for unknown systems.
 * Logos are bundled at build time via Vite static imports (CC0 licensed).
 */
export function SystemLogo({
  systemId,
  size = 32,
  fallbackText,
  style,
  className,
}: SystemLogoProps) {
  const logoUrl = SYSTEM_LOGOS[systemId];

  if (!logoUrl) {
    return (
      <span
        className={className}
        style={{
          fontSize: Math.max(10, size * 0.4),
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap',
          ...style,
        }}
      >
        {fallbackText ?? systemId}
      </span>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={`${systemId} logo`}
      className={className}
      draggable={false}
      style={{
        height: size,
        width: 'auto',
        objectFit: 'contain',
        ...style,
      }}
    />
  );
}
