import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useConfigStore } from '../stores/configStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useUiStore } from '../stores/uiStore';
import { useI18nStore } from '../stores/i18nStore';
import { api } from '../lib/invoke';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { getAllThemes } from '../themes';
import { SUPPORTED_LANGUAGES } from '../i18n';

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  color: 'var(--color-text)',
  outline: 'none',
};

const btnStyle: React.CSSProperties = {
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  padding: '8px 14px',
  fontSize: 13,
  color: 'var(--color-text)',
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
};

export function SettingsPage() {
  const { config, loadConfig, saveConfig } = useConfigStore();
  const { scanLibrary, isScanning, scanProgress } = useLibraryStore();
  const { showToast, navigateTo } = useUiStore();
  const { t, locale, setLocale } = useI18nStore();

  const [dataRoot, setDataRoot] = useState('');
  const [emudeckPath, setEmudeckPath] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fullscreen, setFullscreen] = useState(true);

  useEffect(() => {
    if (config) {
      setDataRoot(config.paths.data_root);
      setEmudeckPath(config.paths.emudeck_path);
      setFullscreen(config.general.fullscreen ?? true);
    }
  }, [config]);

  const handleFullscreenToggle = async (value: boolean) => {
    if (!config) return;
    setFullscreen(value);
    try {
      await api.setFullscreen(value);
      await saveConfig({ ...config, general: { ...config.general, fullscreen: value } });
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const browse = async (setter: (v: string) => void) => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected && typeof selected === 'string') setter(selected);
    } catch { /* cancelled */ }
  };

  const handleDetect = async () => {
    setDetecting(true);
    try {
      const found = await api.detectEmudeck();
      if (found) {
        setEmudeckPath(found);
        showToast(`EmuDeck found: ${found}`, 'success');
      } else {
        showToast('EmuDeck not found automatically. Set path manually.', 'info');
      }
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setDetecting(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    try {
      await saveConfig({ ...config, paths: { data_root: dataRoot, emudeck_path: emudeckPath } });
      setSaved(true);
      showToast(t('settings.saved'), 'success');
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const handleScanNow = async () => {
    if (!dataRoot) {
      showToast('Please set a data root folder first', 'error');
      return;
    }
    await handleSave();
    try {
      await scanLibrary(dataRoot);
      showToast(`Scan complete! Go to Library to browse games.`, 'success');
      navigateTo('library');
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const handleLanguage = async (code: string) => {
    if (!config) return;
    setLocale(code);
    await saveConfig({ ...config, general: { ...config.general, language: code } });
  };

  if (!config) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <LoadingSpinner size="lg" message="Loading settings..." />
      </div>
    );
  }

  const sectionStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    borderRadius: 12,
    border: '1px solid var(--color-border)',
    padding: 24,
    marginBottom: 24,
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    marginTop: 0,
    marginBottom: 16,
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', height: '100%' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)', marginTop: 0, marginBottom: 32 }}>
          {t('settings.title')}
        </h1>

        {/* Language */}
        <section style={sectionStyle}>
          <p style={sectionLabel}>{t('settings.language')}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const active = locale === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleLanguage(lang.code)}
                  style={{
                    background: active ? 'var(--color-primary)' : 'var(--color-surface-2)',
                    border: active ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                    borderRadius: 10,
                    padding: '8px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{lang.flag}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: active ? '#fff' : 'var(--color-text)' }}>
                    {lang.native}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ROM Library */}
        <section style={sectionStyle}>
          <p style={sectionLabel}>ROM Library</p>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--color-text)', marginBottom: 4 }}>
            {t('settings.dataRoot')}
          </label>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 0, marginBottom: 10 }}>
            Root folder containing your ROMs (e.g., E:\Emulation). Must have a <code style={{ background: 'var(--color-surface-3)', padding: '1px 4px', borderRadius: 3 }}>roms/</code> subfolder.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={dataRoot}
              onChange={(e) => setDataRoot(e.target.value)}
              placeholder="e.g. E:\Emulation"
              style={inputStyle}
            />
            <button onClick={() => browse(setDataRoot)} style={btnStyle}>{t('settings.browse')}</button>
          </div>
          {dataRoot && (
            <p style={{ fontSize: 12, color: 'var(--color-success)', marginTop: 8, marginBottom: 0 }}>
              ✓ ROMs expected at: {dataRoot}/roms/
            </p>
          )}
        </section>

        {/* Emulators */}
        <section style={sectionStyle}>
          <p style={sectionLabel}>Emulators</p>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--color-text)', marginBottom: 4 }}>
            {t('settings.emudeckPath')}
          </label>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 0, marginBottom: 10 }}>
            Path to EmuDeck's Emulators folder. Auto-detected if EmuDeck is installed.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              type="text"
              value={emudeckPath}
              onChange={(e) => setEmudeckPath(e.target.value)}
              placeholder="e.g. C:\...\AppData\Roaming\emudeck\Emulators"
              style={inputStyle}
            />
            <button onClick={() => browse(setEmudeckPath)} style={btnStyle}>{t('settings.browse')}</button>
          </div>
          <button
            onClick={handleDetect}
            disabled={detecting}
            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 13, padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {detecting ? <LoadingSpinner size="sm" /> : '🔍'}
            {t('settings.detectEmuDeck')}
          </button>
        </section>

        {/* Display */}
        <section style={sectionStyle}>
          <p style={sectionLabel}>Pantalla</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)', marginBottom: 2 }}>
                Pantalla completa
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Iniciar en pantalla completa. Presiona <kbd style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', borderRadius: 4, padding: '0 5px', fontSize: 11 }}>F11</kbd> para alternar en cualquier momento.
              </div>
            </div>
            <button
              onClick={() => handleFullscreenToggle(!fullscreen)}
              style={{
                width: 52,
                height: 28,
                borderRadius: 14,
                border: 'none',
                background: fullscreen ? 'var(--color-primary)' : 'var(--color-surface-3)',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s',
                flexShrink: 0,
                marginLeft: 24,
              }}
            >
              <span style={{
                position: 'absolute',
                top: 3,
                left: fullscreen ? 26 : 3,
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }} />
            </button>
          </div>
        </section>

        {/* Theme */}
        <section style={sectionStyle}>
          <p style={sectionLabel}>{t('settings.theme')}</p>          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {getAllThemes().map((theme) => {
              const active = (config.general.theme || 'default') === theme.id;
              const themeName = t(theme.nameKey);
              return (
                <button
                  key={theme.id}
                  onClick={async () => {
                    await saveConfig({ ...config, general: { ...config.general, theme: theme.id } });
                    showToast(`Theme: ${themeName}`, 'success');
                  }}
                  style={{
                    background: active ? 'var(--color-primary)' : 'var(--color-surface-2)',
                    border: active ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                    borderRadius: 10,
                    padding: '12px 20px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    minWidth: 160,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: active ? '#fff' : 'var(--color-text)', marginBottom: 4 }}>
                    {themeName}
                  </div>
                  <div style={{ fontSize: 12, color: active ? 'rgba(255,255,255,0.75)' : 'var(--color-text-muted)' }}>
                    {t(theme.descKey)}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleSave}
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {saved ? `✓ ${t('settings.saved')}` : t('settings.save')}
          </button>
          <button
            onClick={handleScanNow}
            disabled={isScanning || !dataRoot}
            style={{
              ...btnStyle,
              borderRadius: 10,
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 500,
              opacity: isScanning || !dataRoot ? 0.5 : 1,
              cursor: isScanning || !dataRoot ? 'not-allowed' : 'pointer',
            }}
          >
            {isScanning ? scanProgress : t('settings.scanLibrary')}
          </button>
          <button
            type="button"
            onClick={() => navigateTo('emulator-config')}
            style={{
              ...btnStyle,
              borderRadius: 10,
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            🎮 Emulator Settings
          </button>
          <button
            type="button"
            onClick={() => navigateTo('scraper')}
            style={{
              ...btnStyle,
              borderRadius: 10,
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            🕹️ {t('scraper.title')}
          </button>
          <button
            type="button"
            onClick={() => navigateTo('pc-games')}
            style={{
              ...btnStyle,
              borderRadius: 10,
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            🖥️ PC Games
          </button>
          <button
            type="button"
            onClick={() => navigateTo('rom-paths')}
            style={{
              ...btnStyle,
              borderRadius: 10,
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            📁 ROM Paths
          </button>
          <button
            type="button"
            onClick={() => navigateTo('input-mapping')}
            style={{
              ...btnStyle,
              borderRadius: 10,
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            🕹️ Input Mapping
          </button>
        </div>
      </div>
    </div>
  );
}
