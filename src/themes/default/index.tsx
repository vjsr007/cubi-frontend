import { Sidebar } from '../../components/layout/Sidebar';
import { Toast } from '../../components/common/Toast';
import { LibraryPage } from '../../pages/LibraryPage';
import { SettingsPage } from '../../pages/SettingsPage';
import { GameDetailPage } from '../../pages/GameDetailPage';
import { useUiStore } from '../../stores/uiStore';

export function DefaultTheme() {
  const currentPage = useUiStore((s) => s.currentPage);

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
