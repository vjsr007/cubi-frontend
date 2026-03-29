import { useEffect } from 'react';
import { useConfigStore } from '../../stores/configStore';
import { useUiStore } from '../../stores/uiStore';
import { getTheme } from '../../themes';

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

  if (config === null) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d0d' }}>
        <div style={{ color: '#555', fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  const theme = getTheme(config.general.theme);
  return <theme.Component />;
}
