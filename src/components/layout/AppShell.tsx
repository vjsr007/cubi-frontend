import { useEffect } from 'react';
import { useConfigStore } from '../../stores/configStore';
import { useUiStore } from '../../stores/uiStore';
import { Sidebar } from './Sidebar';
import { Toast } from '../common/Toast';
import { LibraryPage } from '../../pages/LibraryPage';
import { SettingsPage } from '../../pages/SettingsPage';
import { GameDetailPage } from '../../pages/GameDetailPage';

export function AppShell() {
  const { loadConfig, config } = useConfigStore();
  const { currentPage, navigateTo } = useUiStore();

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Redirect to settings on first run (no data root)
  useEffect(() => {
    if (config !== null && !config.paths.data_root && currentPage !== 'settings') {
      navigateTo('settings');
    }
  }, [config, currentPage, navigateTo]);

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {currentPage === 'library' && <LibraryPage />}
        {currentPage === 'settings' && <SettingsPage />}
        {currentPage === 'game-detail' && <GameDetailPage />}
      </main>
      <Toast />
    </div>
  );
}
