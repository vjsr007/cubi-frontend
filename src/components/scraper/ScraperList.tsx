import { useState } from 'react';
import type { ScraperConfig } from '../../types';
import { useI18nStore } from '../../stores/i18nStore';

interface Props {
  scrapers: ScraperConfig[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (s: ScraperConfig) => void;
  onDelete: (id: string) => void;
  onToggle: (s: ScraperConfig) => void;
  onAdd: () => void;
}

const SUPPORT_ICONS: Record<string, string> = {
  box_art: '🖼',
  screenshot: '📷',
  video: '🎬',
  metadata: '📝',
  wheel: '🎡',
  fanart: '🎨',
  marquee: '📺',
};

export function ScraperList({ scrapers, selectedId, onSelect, onEdit, onDelete, onToggle, onAdd }: Props) {
  const { t } = useI18nStore();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      onDelete(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
          {t('scraper.scrapers')}
        </h3>
        <button
          onClick={onAdd}
          style={{
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + {t('scraper.addScraper')}
        </button>
      </div>

      {scrapers.length === 0 && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, textAlign: 'center', marginTop: 32 }}>
          {t('scraper.noScrapers')}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1 }}>
        {[...scrapers].sort((a, b) => a.priority - b.priority).map((s) => {
          const isSelected = s.id === selectedId;
          return (
            <div
              key={s.id}
              onClick={() => onSelect(s.id)}
              style={{
                background: isSelected ? 'var(--color-primary)' : 'var(--color-surface-2)',
                border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: 10,
                padding: '10px 14px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                opacity: s.enabled ? 1 : 0.55,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#fff' : 'var(--color-text)' }}>
                      {s.name}
                    </span>
                    <span style={{
                      fontSize: 10,
                      background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--color-surface-3)',
                      color: isSelected ? '#fff' : 'var(--color-text-muted)',
                      borderRadius: 4,
                      padding: '1px 5px',
                    }}>
                      #{s.priority}
                    </span>
                    {s.requires_credentials && (
                      <span style={{ fontSize: 10, color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)' }}>
                        🔑
                      </span>
                    )}
                  </div>
                  <div style={{ marginTop: 3, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {s.supports.map((cap) => (
                      <span key={cap} title={cap} style={{ fontSize: 12 }}>
                        {SUPPORT_ICONS[cap] ?? cap}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {/* Toggle enabled */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggle({ ...s, enabled: !s.enabled }); }}
                    title={t('scraper.enabled')}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 2,
                    }}
                  >
                    {s.enabled ? '✅' : '⬜'}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(s); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 2, color: isSelected ? '#fff' : 'var(--color-text-muted)' }}
                  >
                    ✏️
                  </button>

                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                    title={confirmDelete === s.id ? t('scraper.confirmDelete') : t('scraper.deleteScraper')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 2 }}
                  >
                    {confirmDelete === s.id ? '⚠️' : '🗑️'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
