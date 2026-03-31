import { useEffect } from 'react';
import { useLibraryStore } from '../stores/libraryStore';
import { useConfigStore } from '../stores/configStore';
import { useUiStore } from '../stores/uiStore';
import { useI18nStore } from '../stores/i18nStore';
import { SystemList } from '../components/library/SystemList';
import { GameGrid } from '../components/library/GameGrid';
import { GameList } from '../components/library/GameList';
import { FilterBar } from '../components/library/FilterBar';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export function LibraryPage() {
  const { systems, loadSystems, isScanning, scanProgress, scanLibrary, viewMode } = useLibraryStore();
  const { config } = useConfigStore();
  const { navigateTo, showToast } = useUiStore();
  const { t } = useI18nStore();

  useEffect(() => {
    loadSystems();
  }, []);

  const handleScan = async () => {
    if (!config?.paths.data_root) {
      navigateTo('settings');
      return;
    }
    try {
      await scanLibrary(config.paths.data_root);
      showToast('Scan complete!', 'success');
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  if (isScanning) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <LoadingSpinner size="lg" />
          <p style={{ marginTop: 16, color: 'var(--color-text)', fontSize: 16 }}>{scanProgress}</p>
          <p style={{ marginTop: 4, color: 'var(--color-text-muted)', fontSize: 13 }}>{t('library.scanningRoms')}</p>
        </div>
      </div>
    );
  }

  if (systems.length === 0) {
    const hasRoot = !!config?.paths.data_root;
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 72, marginBottom: 20 }}>🕹️</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 8px' }}>
            {t('library.noGamesYet')}
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            {hasRoot
              ? t('library.noRomsAt').replace('{path}', config!.paths.data_root)
              : t('library.setRomPath')}
          </p>
          <button
            onClick={hasRoot ? handleScan : () => navigateTo('settings')}
            style={{
              background: 'var(--color-primary)', color: '#fff', border: 'none',
              borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {hasRoot ? t('library.scanNow') : t('library.openSettings')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <SystemList />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <FilterBar />
        {viewMode === 'list' ? <GameList /> : <GameGrid />}
      </div>
    </div>
  );
}
