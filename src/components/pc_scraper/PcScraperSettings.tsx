import { useState, useEffect } from 'react';
import type { PcMetadataConfig, PcToolsStatus, PcScrapeResult, PcScrapeProgress } from '../../types';
import { api } from '../../lib/invoke';
import { listen } from '@tauri-apps/api/event';

const ALL_SOURCES = [
  { id: 'steam_store', label: 'Steam Store', hint: 'Free, no key needed' },
  { id: 'igdb', label: 'IGDB', hint: 'Requires Twitch client ID + secret' },
  { id: 'steamgriddb', label: 'SteamGridDB', hint: 'Hero, logo & background art' },
  { id: 'mobygames', label: 'MobyGames', hint: 'Requires API key' },
  { id: 'pcgamingwiki', label: 'PCGamingWiki', hint: 'Free, no key needed' },
  { id: 'youtube', label: 'YouTube', hint: 'Trailer search (key optional)' },
  { id: 'web_scraper', label: 'Web Scraper', hint: 'Official site scraping' },
];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', borderRadius: 6,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface-2)',
  color: 'var(--color-text)', fontSize: 13,
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600,
  color: 'var(--color-text-muted)',
  marginBottom: 4, display: 'block',
};

export function PcScraperSettings() {
  const [config, setConfig] = useState<PcMetadataConfig | null>(null);
  const [tools, setTools] = useState<PcToolsStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<PcScrapeProgress | null>(null);
  const [results, setResults] = useState<PcScrapeResult[]>([]);

  useEffect(() => {
    api.getPcMetadataConfig().then(setConfig).catch(() => {});
    api.checkPcScraperTools().then(setTools).catch(() => {});
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    listen<PcScrapeProgress>('pc_scrape_progress', (event) => {
      setProgress(event.payload);
      if (event.payload.done) setRunning(false);
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, []);

  if (!config) return (
    <div style={{ padding: 32, color: 'var(--color-text-muted)', fontSize: 14 }}>
      Cargando configuración...
    </div>
  );

  const toggleSource = (id: string) => {
    setConfig((c) => {
      if (!c) return c;
      const enabled = c.enabled_sources.includes(id)
        ? c.enabled_sources.filter((s) => s !== id)
        : [...c.enabled_sources, id];
      return { ...c, enabled_sources: enabled };
    });
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await api.savePcMetadataConfig(config);
      setSaveMsg('✅ Guardado');
    } catch (e) {
      setSaveMsg(`❌ ${e}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRunAll = async () => {
    setRunning(true);
    setResults([]);
    setProgress(null);
    try {
      const res = await api.runPcMetadataJob();
      setResults(res);
    } catch (e) {
      setSaveMsg(`❌ ${e}`);
      setRunning(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 700 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>PC Metadata Scraper</h2>

      {/* Tools status */}
      {tools && (
        <div style={{
          display: 'flex', gap: 12, flexWrap: 'wrap',
          padding: '10px 14px', borderRadius: 8,
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          fontSize: 12,
        }}>
          <span>
            {tools.ytdlp_available ? '✅' : '⚠️'} yt-dlp
            {tools.ytdlp_path && <span style={{ color: 'var(--color-text-muted)', marginLeft: 4 }}>{tools.ytdlp_path}</span>}
            {!tools.ytdlp_available && <span style={{ color: 'var(--color-text-muted)', marginLeft: 4 }}>— no encontrado (descarga de trailers desactivada)</span>}
          </span>
          <span>
            {tools.chrome_available ? '✅' : '⚠️'} Chrome
            {!tools.chrome_available && <span style={{ color: 'var(--color-text-muted)', marginLeft: 4 }}>— no encontrado (scraper headless desactivado)</span>}
          </span>
        </div>
      )}

      {/* API Keys */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>API Keys</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>IGDB Client ID</label>
            <input style={inputStyle} type="text" placeholder="Twitch client_id"
              value={config.igdb_client_id ?? ''}
              onChange={(e) => setConfig({ ...config, igdb_client_id: e.target.value || undefined })}
            />
          </div>
          <div>
            <label style={labelStyle}>IGDB Client Secret</label>
            <input style={inputStyle} type="password" placeholder="Twitch client_secret"
              value={config.igdb_client_secret ?? ''}
              onChange={(e) => setConfig({ ...config, igdb_client_secret: e.target.value || undefined })}
            />
          </div>
          <div>
            <label style={labelStyle}>SteamGridDB API Key</label>
            <input style={inputStyle} type="password" placeholder="steamgriddb.com API key"
              value={config.steamgriddb_api_key ?? ''}
              onChange={(e) => setConfig({ ...config, steamgriddb_api_key: e.target.value || undefined })}
            />
          </div>
          <div>
            <label style={labelStyle}>MobyGames API Key</label>
            <input style={inputStyle} type="password" placeholder="mobygames.com API key"
              value={config.mobygames_api_key ?? ''}
              onChange={(e) => setConfig({ ...config, mobygames_api_key: e.target.value || undefined })}
            />
          </div>
          <div>
            <label style={labelStyle}>YouTube Data API Key (opcional)</label>
            <input style={inputStyle} type="password" placeholder="Google Cloud API key"
              value={config.youtube_api_key ?? ''}
              onChange={(e) => setConfig({ ...config, youtube_api_key: e.target.value || undefined })}
            />
          </div>
        </div>
      </section>

      {/* Sources */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Fuentes Activas</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ALL_SOURCES.map((src) => {
            const active = config.enabled_sources.includes(src.id);
            return (
              <button
                key={src.id}
                title={src.hint}
                onClick={() => toggleSource(src.id)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', border: '1px solid var(--color-border)',
                  background: active ? 'var(--color-primary)' : 'var(--color-surface-2)',
                  color: active ? '#fff' : 'var(--color-text-muted)',
                }}
              >
                {src.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Options */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Opciones</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
          <input type="range" min={1} max={10} value={config.max_screenshots}
            onChange={(e) => setConfig({ ...config, max_screenshots: Number(e.target.value) })}
          />
          <span>Screenshots: {config.max_screenshots}</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
          <input type="checkbox" checked={config.download_trailers}
            onChange={(e) => setConfig({ ...config, download_trailers: e.target.checked })}
          />
          Descargar trailers con yt-dlp
          {!tools?.ytdlp_available && <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>(yt-dlp no instalado)</span>}
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
          <input type="checkbox" checked={config.use_headless_browser}
            onChange={(e) => setConfig({ ...config, use_headless_browser: e.target.checked })}
          />
          Usar Chrome headless para scraping
          {!tools?.chrome_available && <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>(Chrome no instalado)</span>}
        </label>
      </section>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
            background: 'var(--color-primary)', color: '#fff',
            border: 'none', cursor: 'pointer',
          }}
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        <button
          onClick={handleRunAll}
          disabled={running}
          style={{
            padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
            background: running ? 'var(--color-surface-2)' : 'var(--color-accent, #22c55e)',
            color: running ? 'var(--color-text-muted)' : '#fff',
            border: 'none', cursor: running ? 'not-allowed' : 'pointer',
          }}
        >
          {running ? 'Ejecutando...' : '▶ Enriquecer todos los juegos PC'}
        </button>
        {saveMsg && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{saveMsg}</span>}
      </div>

      {/* Progress */}
      {progress && !progress.done && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          fontSize: 13,
        }}>
          <div style={{ marginBottom: 6, fontWeight: 600 }}>
            {progress.game_title}
            <span style={{ color: 'var(--color-text-muted)', marginLeft: 8, fontSize: 11 }}>— {progress.source}</span>
          </div>
          <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 2 }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: 'var(--color-primary)',
              width: `${Math.round((progress.current / progress.total) * 100)}%`,
              transition: 'width 0.3s',
            }} />
          </div>
          <div style={{ marginTop: 4, fontSize: 11, color: 'var(--color-text-muted)' }}>
            {progress.current} / {progress.total}
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Resultados ({results.filter((r) => r.ok).length}/{results.length} OK)
          </h3>
          <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {results.map((r) => (
              <div key={r.game_id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '4px 8px', borderRadius: 4, fontSize: 12,
                background: r.ok ? 'transparent' : 'rgba(239,68,68,0.08)',
              }}>
                <span>{r.ok ? '✅' : '❌'}</span>
                <span style={{ flex: 1 }}>{r.title}</span>
                {r.ok && <span style={{ color: 'var(--color-text-muted)' }}>{r.fields_updated} campos</span>}
                {!r.ok && <span style={{ color: '#ef4444' }}>{r.error}</span>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
