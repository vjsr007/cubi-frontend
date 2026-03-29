import { useState, useEffect } from 'react';
import type { ScraperConfig } from '../../types';
import { useI18nStore } from '../../stores/i18nStore';

interface Props {
  initial?: ScraperConfig | null;
  onSave: (s: ScraperConfig) => void;
  onCancel: () => void;
}

const ALL_SUPPORTS = ['box_art', 'screenshot', 'video', 'metadata', 'wheel', 'fanart', 'marquee'];

const BLANK: ScraperConfig = {
  id: '',
  name: '',
  url: '',
  enabled: true,
  priority: 10,
  supports: ['metadata', 'box_art'],
  requires_credentials: false,
};

export function ScraperForm({ initial, onSave, onCancel }: Props) {
  const { t } = useI18nStore();
  const [form, setForm] = useState<ScraperConfig>(initial ?? BLANK);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    setForm(initial ?? BLANK);
  }, [initial]);

  const set = (patch: Partial<ScraperConfig>) => setForm((f) => ({ ...f, ...patch }));

  const toggleSupport = (cap: string) => {
    set({
      supports: form.supports.includes(cap)
        ? form.supports.filter((s) => s !== cap)
        : [...form.supports, cap],
    });
  };

  const handleSave = () => {
    if (!form.id.trim() || !form.name.trim() || !form.url.trim()) return;
    onSave(form);
  };

  const inp: React.CSSProperties = {
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    padding: '7px 10px',
    fontSize: 13,
    color: 'var(--color-text)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: 'var(--color-text-muted)',
    marginBottom: 3,
    display: 'block',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };

  const isEdit = !!initial;

  return (
    <div>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
        {isEdit ? t('scraper.editScraper') : t('scraper.addScraper')}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle}>{t('scraper.name')} *</label>
            <input style={inp} value={form.name} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>ID *</label>
            <input
              style={{ ...inp, opacity: isEdit ? 0.6 : 1 }}
              value={form.id}
              onChange={(e) => set({ id: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              readOnly={isEdit}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>{t('scraper.url')} *</label>
          <input style={inp} value={form.url} onChange={(e) => set({ url: e.target.value })} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle}>{t('scraper.apiKey')}</label>
            <input style={inp} value={form.api_key ?? ''} onChange={(e) => set({ api_key: e.target.value || undefined })} />
          </div>
          <div>
            <label style={labelStyle}>{t('scraper.priority')}</label>
            <input style={inp} type="number" min={1} max={99} value={form.priority} onChange={(e) => set({ priority: parseInt(e.target.value) || 1 })} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle}>{t('scraper.username')}</label>
            <input style={inp} value={form.username ?? ''} onChange={(e) => set({ username: e.target.value || undefined })} />
          </div>
          <div>
            <label style={labelStyle}>{t('scraper.password')}</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inp, paddingRight: 36 }}
                type={showPass ? 'text' : 'password'}
                value={form.password ?? ''}
                onChange={(e) => set({ password: e.target.value || undefined })}
              />
              <button
                onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
        </div>

        <div>
          <label style={labelStyle}>{t('scraper.supports')}</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ALL_SUPPORTS.map((cap) => {
              const active = form.supports.includes(cap);
              return (
                <button
                  key={cap}
                  onClick={() => toggleSupport(cap)}
                  style={{
                    background: active ? 'var(--color-primary)' : 'var(--color-surface-2)',
                    color: active ? '#fff' : 'var(--color-text-muted)',
                    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  {cap}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={form.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
            {t('scraper.enabled')}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={form.requires_credentials} onChange={(e) => set({ requires_credentials: e.target.checked })} />
            {t('scraper.requiresCredentials')}
          </label>
        </div>

        {form.credential_hint !== undefined && (
          <div>
            <label style={labelStyle}>{t('scraper.credentialHint')}</label>
            <input style={inp} value={form.credential_hint ?? ''} onChange={(e) => set({ credential_hint: e.target.value || undefined })} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 18px', fontSize: 13, cursor: 'pointer', color: 'var(--color-text)' }}
        >
          {t('scraper.cancel')}
        </button>
        <button
          onClick={handleSave}
          disabled={!form.id.trim() || !form.name.trim() || !form.url.trim()}
          style={{
            background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8,
            padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            opacity: (!form.id.trim() || !form.name.trim() || !form.url.trim()) ? 0.5 : 1,
          }}
        >
          {t('scraper.save')}
        </button>
      </div>
    </div>
  );
}
