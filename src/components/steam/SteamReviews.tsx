import { useI18nStore } from '../../stores/i18nStore';
import type { SteamGameData } from '../../types/steam';

interface Props {
  data: SteamGameData;
}

function scoreColor(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes('overwhelmingly positive')) return '#66c0f4';
  if (d.includes('very positive')) return '#66c0f4';
  if (d.includes('positive')) return '#a4d007';
  if (d.includes('mixed')) return '#b9a074';
  if (d.includes('negative')) return '#c35c2c';
  return 'var(--color-text-muted)';
}

export function SteamReviews({ data }: Props) {
  const { t } = useI18nStore();
  const total = data.review_positive + data.review_negative;
  const pct = total > 0 ? Math.round((data.review_positive / total) * 100) : 0;

  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 8, padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Steam Reviews
        </span>
        <a
          href={data.store_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 10, color: 'var(--color-primary)', textDecoration: 'none' }}
        >
          {t('steam.viewOnSteam')}
        </a>
      </div>

      {/* Score summary */}
      {data.review_score_desc && (
        <div style={{ marginBottom: 12 }}>
          <span style={{
            fontSize: 15, fontWeight: 700,
            color: scoreColor(data.review_score_desc),
          }}>
            {data.review_score_desc}
          </span>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 8 }}>
            {pct}% of {total.toLocaleString()} reviews
          </span>
        </div>
      )}

      {/* Review bar */}
      {total > 0 && (
        <div style={{
          width: '100%', height: 8, borderRadius: 4, overflow: 'hidden',
          display: 'flex', marginBottom: 16, background: 'var(--color-surface-2)',
        }}>
          <div style={{ width: `${pct}%`, background: '#a4d007', transition: 'width 0.3s' }} />
          <div style={{ flex: 1, background: '#c35c2c' }} />
        </div>
      )}

      {/* Metacritic */}
      {data.achievements_count > 0 && (
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 12 }}>
          {data.achievements_count} {t('steam.achievements')}
        </div>
      )}

      {/* Review snippets */}
      {data.reviews.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
          {data.reviews.map((review, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--color-surface-2)', borderRadius: 6, padding: '8px 10px',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{
                  fontSize: 14,
                  color: review.voted_up ? '#a4d007' : '#c35c2c',
                }}>
                  {review.voted_up ? '\u{1F44D}' : '\u{1F44E}'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                  {review.hours_played.toFixed(1)}h played
                </span>
              </div>
              <p style={{
                fontSize: 11, color: 'var(--color-text)', margin: 0,
                lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {review.review_text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
