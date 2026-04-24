import { useState, useEffect } from 'react';
import { useLibraryStore } from '../stores/libraryStore';
import { useConfigStore } from '../stores/configStore';
import { useUiStore } from '../stores/uiStore';
import { useI18nStore } from '../stores/i18nStore';
import { SystemList } from '../components/library/SystemList';
import { GameGrid } from '../components/library/GameGrid';
import { GameList } from '../components/library/GameList';
import { FilterBar } from '../components/library/FilterBar';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { SystemWikiPanel } from '../components/wiki/SystemWikiPanel';
import { ArcadeButton } from '../components/arcade/ArcadeButton';

export function LibraryPage() {
  const { systems, selectedSystemId, loadSystems, isScanning, scanProgress, scanLibrary, viewMode } = useLibraryStore();
  const { config } = useConfigStore();
  const { navigateTo, showToast } = useUiStore();
  const { t } = useI18nStore();
  const [wikiSystemId, setWikiSystemId] = useState<string | null>(null);

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
          <ArcadeButton
            variant={hasRoot ? 'cyan' : 'magenta'}
            onClick={hasRoot ? handleScan : () => navigateTo('settings')}
            pulse
          >
            {hasRoot ? t('library.scanNow') : t('library.openSettings')}
          </ArcadeButton>
        </div>
      </div>
    );
  }

  const wikiSystem = wikiSystemId ? systems.find((s) => s.id === wikiSystemId) : null;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', position: 'relative' }}>
      <SystemList />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <FilterBar onShowWiki={selectedSystemId && selectedSystemId !== '__all__' ? () => setWikiSystemId(selectedSystemId) : undefined} />
        {viewMode === 'list' ? <GameList /> : <GameGrid />}
      </div>
      {wikiSystemId && wikiSystem && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}
          onClick={() => setWikiSystemId(null)}
        >
          <div
            style={{
              width: '90%', maxWidth: 800, maxHeight: '90%',
              borderRadius: 16, overflow: 'auto',
              background: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <SystemWikiPanel
              systemId={wikiSystemId}
              systemName={wikiSystem.name}
              onClose={() => setWikiSystemId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
