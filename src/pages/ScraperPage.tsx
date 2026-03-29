import { useState, useEffect } from 'react';
import type { ScraperConfig } from '../types';
import { useI18nStore } from '../stores/i18nStore';
import { useUiStore } from '../stores/uiStore';
import { useScraperStore } from '../stores/scraperStore';
import { useLibraryStore } from '../stores/libraryStore';
import { ScraperList } from '../components/scraper/ScraperList';
import { ScraperForm } from '../components/scraper/ScraperForm';
import { ScrapeJobPanel } from '../components/scraper/ScrapeJobPanel';
import { api } from '../lib/invoke';

export function ScraperPage() {
  const { t } = useI18nStore();
  const { navigateTo } = useUiStore();
  const { scrapers, loading, loadScrapers, addScraper, updateScraper, deleteScraper } = useScraperStore();
  const { systems, loadSystems } = useLibraryStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<ScraperConfig | null | 'new'>('null');
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
    if (editingForm && editingForm !== 'null') {
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

  const [importStatus, setImportStatus] = useState<string | null>(null);

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

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'var(--color-bg)', color: 'var(--color-text)',
      fontFamily: 'var(--font-body, system-ui, sans-serif)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
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
        <div style={{ flex: 1 }} />
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
      </div>

      {/* Body: two-panel layout */}
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
              initial={editingForm !== 'null' ? editingForm : null}
              onSave={handleFormSave}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <ScrapeJobPanel selectedScraper={selectedScraper} />
          )}
        </div>
      </div>
    </div>
  );
}
