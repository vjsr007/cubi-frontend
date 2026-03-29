import { useState, useEffect } from 'react';
import type { ScraperConfig } from '../types';
import { useI18nStore } from '../stores/i18nStore';
import { useUiStore } from '../stores/uiStore';
import { useScraperStore } from '../stores/scraperStore';
import { useLibraryStore } from '../stores/libraryStore';
import { ScraperList } from '../components/scraper/ScraperList';
import { ScraperForm } from '../components/scraper/ScraperForm';
import { ScrapeJobPanel } from '../components/scraper/ScrapeJobPanel';

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
