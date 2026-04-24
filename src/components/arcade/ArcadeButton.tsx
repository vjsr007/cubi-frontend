// ═══════════════════════════════════════════════════════════════
// ArcadeButton.tsx — neon pill button with shine sweep
// Variants: cyan (default) · magenta · yellow · green · chrome · violet
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import './ArcadeButton.css';

type Variant = 'cyan' | 'magenta' | 'yellow' | 'green' | 'chrome' | 'violet';
type Size = 'sm' | 'md' | 'lg';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  shine?: boolean;
  pulse?: boolean;
  icon?: React.ReactNode;
}

export const ArcadeButton: React.FC<Props> = ({
  variant = 'cyan',
  size = 'md',
  shine = true,
  pulse = false,
  icon,
  children,
  className = '',
  ...rest
}) => {
  const cls = [
    'arcade-btn',
    `arcade-btn--${variant}`,
    `arcade-btn--${size}`,
    shine && 'arcade-btn--shine',
    pulse && 'arcade-btn--pulse',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={cls} {...rest}>
      {icon && <span className="arcade-btn-icon">{icon}</span>}
      <span className="arcade-btn-label">{children}</span>
    </button>
  );
};

export default ArcadeButton;
