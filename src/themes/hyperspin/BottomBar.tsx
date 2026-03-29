import { useI18nStore } from '../../stores/i18nStore';

interface BottomBarProps {
  mode: 'system' | 'game';
  systemName?: string;
}

export function BottomBar({ mode, systemName }: BottomBarProps) {
  const { t } = useI18nStore();
  const centerLabel = mode === 'system' ? t('hyperspin.selectSystem') : `${systemName ?? t('hyperspin.selectGame')}`;

  return (
    <div
      style={{
        height: 48,
        background: 'linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)',
        borderTop: '1px solid #2a2a2a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#c0392b',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          fontFamily: 'system-ui, Arial, sans-serif',
        }}
      >
        {t('hyperspin.player1')}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 20 }}>🕹️</span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#f39c12',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontFamily: 'system-ui, Arial, sans-serif',
            textShadow: '0 0 10px rgba(243,156,18,0.4)',
          }}
        >
          {centerLabel}
        </span>
        <span style={{ fontSize: 20 }}>🕹️</span>
      </div>

      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#2980b9',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          fontFamily: 'system-ui, Arial, sans-serif',
        }}
      >
        {t('hyperspin.player2')}
      </span>
    </div>
  );
}
