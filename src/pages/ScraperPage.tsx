import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { ScraperConfig, ScrapeProgress, ScrapeResult } from '../types';
import { useI18nStore } from '../stores/i18nStore';
import { useUiStore } from '../stores/uiStore';
import { useScraperStore } from '../stores/scraperStore';
import { useLibraryStore } from '../stores/libraryStore';
import { ScraperList } from '../components/scraper/ScraperList';
import { ScraperForm } from '../components/scraper/ScraperForm';
import { ScrapeJobPanel } from '../components/scraper/ScrapeJobPanel';
import { PcScraperSettings } from '../components/pc_scraper/PcScraperSettings';
import { api } from '../lib/invoke';

type Tab = 'scrapers' | 'pc_games';

export function ScraperPage() {
  const { t } = useI18nStore();
  const { navigateTo } = useUiStore();
  const { scrapers, loading, loadScrapers, addScraper, updateScraper, deleteScraper } = useScraperStore();
  const { systems, loadSystems } = useLibraryStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<ScraperConfig | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadScrapers();
    if (systems.length === 0) loadSystems();
  }, []);

  const selectedScraper = scrapers.find((s) => s.id === selectedId) ?? null;

  const handleEdit = (s: ScraperConfig) => {
    setEditingForm(s);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingForm(null);
    setShowForm(true);
  };

  const handleFormSave = async (s: ScraperConfig) => {
    if (editingForm !== null) {
      await updateScraper(s);
    } else {
      await addScraper(s);
      setSelectedId(s.id);
    }
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await deleteScraper(id);
    if (selectedId === id) setSelectedId(null);
  };

  const handleToggle = async (s: ScraperConfig) => {
    await updateScraper(s);
  };

  const [activeTab, setActiveTab] = useState<Tab>('scrapers');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // "Rellenar todo" — bulk scrape all missing metadata + art in one click
  const [fillRunning, setFillRunning] = useState(false);
  const [fillProgress, setFillProgress] = useState<ScrapeProgress | null>(null);
  const [fillResult, setFillResult] = useState<ScrapeResult | null>(null);

  useEffect(() => {
    const unlisten = listen<ScrapeProgress>('scrape-progress', (e) => {
      setFillProgress(e.payload);
      if (e.payload.done) setFillRunning(false);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  const handleFillAll = async () => {
    const best = scrapers.find((s) => s.enabled && s.id === 'screenscraper')
      ?? scrapers.find((s) => s.enabled && s.id === 'thegamesdb')
      ?? scrapers.find((s) => s.enabled);
    if (!best) return;
    setFillRunning(true);
    setFillResult(null);
    setFillProgress(null);
    try {
      const result = await api.runScrapeJob({
        scraper_id: best.id,
        filter: 'missing_only',
        overwrite: false,
      });
      setFillResult(result);
    } catch (e) {
      setFillResult({ scraped: 0, skipped: 0, errors: 1, messages: [String(e)] });
    } finally {
      setFillRunning(false);
    }
  };

  const handleFillCancel = async () => {
    try { await api.cancelScrapeJob(); } catch {}
  };

  const handleImportEsde = async () => {
    setImportStatus('Buscando configuración de ES-DE...');
    try {
      const creds = await api.importEsdeCredentials();
      // Apply credentials to the ScreenScraper entry in the DB
      const ss = scrapers.find((s) => s.id === 'screenscraper');
      if (ss) {
        const updated = {
          ...ss,
          username: creds.screenscraper_username ?? ss.username,
          password: creds.screenscraper_password ?? ss.password,
        };
        await updateScraper(updated);
        const parts: string[] = [];
        if (creds.screenscraper_username) parts.push(`usuario: ${creds.screenscraper_username}`);
        if (creds.screenscraper_password) parts.push('contraseña importada');
        if (creds.active_scraper) parts.push(`scraper activo en ES-DE: ${creds.active_scraper}`);
        setImportStatus(parts.length > 0
          ? `✅ Importado — ${parts.join(', ')}`
          : '⚠️ ES-DE encontrado pero las credenciales están vacías');
      } else {
        setImportStatus('⚠️ Scraper ScreenScraper no encontrado en la lista');
      }
    } catch (err) {
      setImportStatus(`❌ ${err}`);
    }
  };

  const tabBtnStyle = (tab: Tab): React.CSSProperties => ({
    padding: '6px 18px', borderRadius: 20, fontSize: 13, fontWeight: 600,
    border: 'none', cursor: 'pointer',
    background: activeTab === tab ? 'var(--color-primary)' : 'transparent',
    color: activeTab === tab ? '#fff' : 'var(--color-text-muted)',
  });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'var(--color-bg)', color: 'var(--color-text)',
      fontFamily: 'var(--font-body, system-ui, sans-serif)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, rowGap: 8, padding: '14px 20px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
      }}>
        <button
          onClick={() => navigateTo('settings')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-text-muted)', padding: 0 }}
        >
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{t('scraper.title')}</h1>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 16, background: 'var(--color-surface-2)', borderRadius: 24, padding: 3 }}>
          <button style={tabBtnStyle('scrapers')} onClick={() => setActiveTab('scrapers')}>Emuladores</button>
          <button style={tabBtnStyle('pc_games')} onClick={() => setActiveTab('pc_games')}>PC Games</button>
        </div>

        <div style={{ flex: 1 }} />

        {activeTab === 'scrapers' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <button
              onClick={handleImportEsde}
              title="Importar credenciales desde EmulationStation / ES-DE"
              style={{
                background: 'var(--color-surface-2)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              📥 Importar desde ES-DE
            </button>
            {importStatus && (
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', maxWidth: 340, textAlign: 'right' }}>
                {importStatus}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Rellenar todo — quick-fill banner */}
      {activeTab === 'scrapers' && (
        <div style={{
          margin: '12px 20px 0',
          borderRadius: 14,
          padding: '14px 20px',
          background: 'linear-gradient(135deg, rgba(124,58,237,.18) 0%, rgba(0,240,255,.08) 100%)',
          border: '1px solid rgba(124,58,237,.35)',
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#c4a8ff' }}>
              ✨ Rellenar todo
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
              Busca automáticamente metadata y portadas para todos los juegos que faltan — usa el mejor scraper disponible.
            </p>
          </div>

          {/* Progress inline */}
          {(fillRunning || fillProgress) && (
            <div style={{ flex: 2, minWidth: 220 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fillProgress?.game_title || 'Iniciando…'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                  {fillProgress ? `${fillProgress.current}/${fillProgress.total}` : ''}
                </span>
              </div>
              <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: 6, height: 6, overflow: 'hidden' }}>
                <div style={{
                  background: 'linear-gradient(90deg, #7c3aed, #00f0ff)',
                  height: '100%',
                  width: fillProgress && fillProgress.total > 0
                    ? `${Math.round((fillProgress.current / fillProgress.total) * 100)}%`
                    : '0%',
                  transition: 'width .3s',
                }} />
              </div>
            </div>
          )}

          {/* Result summary */}
          {fillResult && !fillRunning && (
            <div style={{ fontSize: 12, display: 'flex', gap: 12 }}>
              <span style={{ color: '#22c55e' }}>↑ {fillResult.scraped} scrapeados</span>
              <span style={{ color: 'var(--color-text-muted)' }}>⏭ {fillResult.skipped} omitidos</span>
              {fillResult.errors > 0 && <span style={{ color: '#ef4444' }}>⚠ {fillResult.errors} errores</span>}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleFillAll}
              disabled={fillRunning || scrapers.filter((s) => s.enabled).length === 0}
              style={{
                background: fillRunning ? 'rgba(124,58,237,.3)' : 'linear-gradient(135deg, #7c3aed, #9333ea)',
                color: '#fff', border: 'none', borderRadius: 10,
                padding: '9px 20px', fontSize: 13, fontWeight: 700,
                cursor: fillRunning ? 'not-allowed' : 'pointer',
                opacity: fillRunning ? 0.7 : 1,
                boxShadow: fillRunning ? 'none' : '0 0 16px rgba(124,58,237,.5)',
                whiteSpace: 'nowrap',
              }}
            >
              {fillRunning ? '⏳ Rellenando…' : '🚀 Rellenar todo'}
            </button>
            {fillRunning && (
              <button
                onClick={handleFillCancel}
                style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 14px', fontSize: 13, cursor: 'pointer' }}
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Body */}
      {activeTab === 'scrapers' ? (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left: Scraper list */}
          <div style={{
            width: 300, minWidth: 260, borderRight: '1px solid var(--color-border)',
            padding: 16, background: 'var(--color-surface)', overflowY: 'auto',
          }}>
            {loading ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{t('common.loading')}</p>
            ) : (
              <ScraperList
                scrapers={scrapers}
                selectedId={selectedId}
                onSelect={(id) => { setSelectedId(id); setShowForm(false); }}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
                onAdd={handleAdd}
              />
            )}
          </div>

          {/* Right: Form OR job panel */}
          <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
            {showForm ? (
              <ScraperForm
                initial={editingForm}
                onSave={handleFormSave}
                onCancel={() => setShowForm(false)}
              />
            ) : (
              <ScrapeJobPanel selectedScraper={selectedScraper} />
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          <PcScraperSettings />
        </div>
      )}
    </div>
  );
}
