import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { ScraperConfig, ScrapeFilter, ScrapeJob, ScrapeProgress, ScrapeResult } from '../../types';
import { useI18nStore } from '../../stores/i18nStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { useScraperStore } from '../../stores/scraperStore';
import { api } from '../../lib/invoke';

interface Props {
  selectedScraper: ScraperConfig | null;
}

export function ScrapeJobPanel({ selectedScraper }: Props) {
  const { t } = useI18nStore();
  const { systems } = useLibraryStore();
  const { jobRunning, setJobRunning, progress, setProgress, lastResult, setLastResult, setError } = useScraperStore();

  const [systemId, setSystemId] = useState<string>('');
  const [filter, setFilter] = useState<ScrapeFilter>('all');
  const [overwrite, setOverwrite] = useState(false);

  // Listen for real-time scrape progress from Tauri
  useEffect(() => {
    const unlisten = listen<ScrapeProgress>('scrape-progress', (event) => {
      setProgress(event.payload);
      if (event.payload.done) {
        setJobRunning(false);
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [setProgress, setJobRunning]);

  const handleRun = async () => {
    if (!selectedScraper) return;
    const job: ScrapeJob = {
      scraper_id: selectedScraper.id,
      system_id: systemId || undefined,
      filter,
      overwrite,
    };
    setJobRunning(true);
    setLastResult(null);
    setProgress(null);
    try {
      const result = await api.runScrapeJob(job);
      setLastResult(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setJobRunning(false);
    }
  };

  const handleCancel = async () => {
    try { await api.cancelScrapeJob(); } catch {}
  };

  const filterOptions: { value: ScrapeFilter; label: string }[] = [
    { value: 'all',          label: t('scraper.filterAll') },
    { value: 'images_only',  label: t('scraper.filterImages') },
    { value: 'videos_only',  label: t('scraper.filterVideos') },
    { value: 'metadata_only',label: t('scraper.filterMetadata') },
    { value: 'missing_only', label: t('scraper.filterMissing') },
  ];

  const sel: React.CSSProperties = {
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    padding: '7px 10px',
    fontSize: 13,
    color: 'var(--color-text)',
    outline: 'none',
    width: '100%',
  };

  const pct = progress && progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {!selectedScraper && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
          ← {t('scraper.selectScraper')}
        </p>
      )}

      {selectedScraper && (
        <>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('scraper.selectScraper')}
            </p>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-primary)' }}>
              {selectedScraper.name}
            </div>
            {selectedScraper.requires_credentials && !selectedScraper.username && (
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#f59e0b' }}>
                ⚠️ {selectedScraper.credential_hint}
              </p>
            )}
          </div>

          {/* System selector */}
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('scraper.selectSystem')}
            </p>
            <select style={sel} value={systemId} onChange={(e) => setSystemId(e.target.value)}>
              <option value="">{t('scraper.allSystems')}</option>
              {systems.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.game_count})</option>
              ))}
            </select>
          </div>

          {/* Filter */}
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Filter
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filterOptions.map((opt) => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="radio" name="filter" value={opt.value} checked={filter === opt.value} onChange={() => setFilter(opt.value)} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Overwrite */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
            {t('scraper.overwrite')}
          </label>

          {/* Run / Cancel */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleRun}
              disabled={jobRunning}
              style={{
                flex: 1,
                background: 'var(--color-primary)', color: '#fff', border: 'none',
                borderRadius: 10, padding: '10px', fontSize: 14, fontWeight: 700,
                cursor: jobRunning ? 'not-allowed' : 'pointer',
                opacity: jobRunning ? 0.6 : 1,
              }}
            >
              {jobRunning ? t('scraper.jobRunning') : t('scraper.runScrape')}
            </button>
            {jobRunning && (
              <button
                onClick={handleCancel}
                style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, cursor: 'pointer' }}
              >
                {t('scraper.cancelScrape')}
              </button>
            )}
          </div>

          {/* Progress */}
          {(jobRunning || progress) && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {progress?.game_title || t('scraper.jobRunning')}
                </span>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {progress ? `${progress.current}/${progress.total}` : ''}
                </span>
              </div>
              <div style={{ background: 'var(--color-surface-2)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                <div style={{ background: 'var(--color-primary)', height: '100%', width: `${pct}%`, transition: 'width 0.3s' }} />
              </div>
            </div>
          )}

          {/* Result */}
          {lastResult && (
            <div style={{ background: 'var(--color-surface-2)', borderRadius: 10, padding: 14 }}>
              <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, color: 'var(--color-text)' }}>
                ✅ {t('scraper.done')}
              </p>
              <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                <span style={{ color: '#22c55e' }}>↑ {lastResult.scraped} {t('scraper.scraped')}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>⏭ {lastResult.skipped} {t('scraper.skipped')}</span>
                {lastResult.errors > 0 && (
                  <span style={{ color: '#ef4444' }}>⚠ {lastResult.errors} {t('scraper.errors')}</span>
                )}
              </div>
              {lastResult.messages.length > 0 && (
                <div style={{ marginTop: 8, maxHeight: 120, overflowY: 'auto' }}>
                  {lastResult.messages.map((m, i) => (
                    <p key={i} style={{ margin: '2px 0', fontSize: 11, color: m.startsWith('ERROR') ? '#ef4444' : 'var(--color-text-muted)' }}>
                      {m}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
