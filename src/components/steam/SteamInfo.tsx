import { useState } from 'react';
import { useI18nStore } from '../../stores/i18nStore';
import type { SteamGameData } from '../../types/steam';

interface Props {
  data: SteamGameData;
}

export function SteamInfo({ data }: Props) {
  const { t } = useI18nStore();
  const [showReqs, setShowReqs] = useState(false);

  const chipStyle: React.CSSProperties = {
    background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
    borderRadius: 12, padding: '2px 8px', fontSize: 10, color: 'var(--color-text-muted)',
    display: 'inline-block', whiteSpace: 'nowrap',
  };

  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Steam Info
      </span>

      {/* Short description */}
      {data.short_description && (
        <p style={{ fontSize: 12, color: 'var(--color-text)', margin: 0, lineHeight: 1.5 }}>
          {data.short_description}
        </p>
      )}

      {/* Release date */}
      {data.release_date && (
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
          {t('steam.releaseDate')}: <span style={{ color: 'var(--color-text)' }}>{data.release_date}</span>
        </div>
      )}

      {/* Categories */}
      {data.categories.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {data.categories.map((cat) => (
            <span key={cat} style={chipStyle}>{cat}</span>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {data.dlc_count > 0 && (
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            {data.dlc_count} DLC
          </span>
        )}
        {data.achievements_count > 0 && (
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            {data.achievements_count} {t('steam.achievements')}
          </span>
        )}
      </div>

      {/* Languages */}
      {data.languages.length > 0 && (
        <div>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            {t('steam.languages')}
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {data.languages.slice(0, 12).map((lang) => (
              <span key={lang} style={chipStyle}>{lang}</span>
            ))}
            {data.languages.length > 12 && (
              <span style={chipStyle}>+{data.languages.length - 12}</span>
            )}
          </div>
        </div>
      )}

      {/* System requirements (collapsible) */}
      {(data.requirements_min || data.requirements_rec) && (
        <div>
          <button
            onClick={() => setShowReqs(!showReqs)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: 11, fontWeight: 600, color: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {showReqs ? '\u25BC' : '\u25B6'} {t('steam.systemRequirements')}
          </button>
          {showReqs && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-text)', lineHeight: 1.5 }}>
              {data.requirements_min && (
                <div style={{ marginBottom: 8 }}>
                  <strong>{t('steam.minimum')}:</strong>
                  <p style={{ margin: '4px 0', whiteSpace: 'pre-wrap' }}>{data.requirements_min}</p>
                </div>
              )}
              {data.requirements_rec && (
                <div>
                  <strong>{t('steam.recommended')}:</strong>
                  <p style={{ margin: '4px 0', whiteSpace: 'pre-wrap' }}>{data.requirements_rec}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
