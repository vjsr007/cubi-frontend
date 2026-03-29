import { Sidebar } from '../../components/layout/Sidebar';
import { Toast } from '../../components/common/Toast';
import { LibraryPage } from '../../pages/LibraryPage';
import { SettingsPage } from '../../pages/SettingsPage';
import { GameDetailPage } from '../../pages/GameDetailPage';
import { ScraperPage } from '../../pages/ScraperPage';
import { PcGamesPage } from '../../pages/PcGamesPage';
import { EmulatorConfigPage } from '../../pages/EmulatorConfigPage';
import { RomPathsPage } from '../../pages/RomPathsPage';
import { InputMappingPage } from '../../pages/InputMappingPage';
import { useUiStore } from '../../stores/uiStore';

export function DefaultTheme() {
  const currentPage = useUiStore((s) => s.currentPage);

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {currentPage === 'library'          && <LibraryPage />}
        {currentPage === 'settings'         && <SettingsPage />}
        {currentPage === 'game-detail'      && <GameDetailPage />}
        {currentPage === 'scraper'          && <ScraperPage />}
        {currentPage === 'pc-games'         && <PcGamesPage />}
        {currentPage === 'emulator-config'  && <EmulatorConfigPage />}
        {currentPage === 'rom-paths'         && <RomPathsPage />}
        {currentPage === 'input-mapping'    && <InputMappingPage />}
      </main>
      <Toast />
    </div>
  );
}
