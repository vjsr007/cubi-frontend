import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useConfigStore } from '../stores/configStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useUiStore } from '../stores/uiStore';
import { api } from '../lib/invoke';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

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

  const [dataRoot, setDataRoot] = useState('');
  const [emudeckPath, setEmudeckPath] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (config) {
      setDataRoot(config.paths.data_root);
      setEmudeckPath(config.paths.emudeck_path);
    }
  }, [config]);

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
      showToast('Settings saved!', 'success');
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

  return (
    <div style={{ flex: 1, overflowY: 'auto', height: '100%' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)', marginTop: 0, marginBottom: 32 }}>
          Settings
        </h1>

        {/* ROM Library */}
        <section style={sectionStyle}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 0, marginBottom: 16 }}>
            ROM Library
          </p>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--color-text)', marginBottom: 4 }}>
            Data Root Folder
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
            <button onClick={() => browse(setDataRoot)} style={btnStyle}>Browse</button>
          </div>
          {dataRoot && (
            <p style={{ fontSize: 12, color: 'var(--color-success)', marginTop: 8, marginBottom: 0 }}>
              ✓ ROMs expected at: {dataRoot}/roms/
            </p>
          )}
        </section>

        {/* Emulators */}
        <section style={sectionStyle}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 0, marginBottom: 16 }}>
            Emulators
          </p>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--color-text)', marginBottom: 4 }}>
            EmuDeck Emulators Path
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
            <button onClick={() => browse(setEmudeckPath)} style={btnStyle}>Browse</button>
          </div>
          <button
            onClick={handleDetect}
            disabled={detecting}
            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 13, padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {detecting ? <LoadingSpinner size="sm" /> : '🔍'}
            Auto-detect EmuDeck
          </button>
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
            {saved ? '✓ Saved' : 'Save Settings'}
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
            {isScanning ? scanProgress : 'Scan Library Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
