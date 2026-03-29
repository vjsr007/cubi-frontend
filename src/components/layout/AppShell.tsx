import { useEffect } from 'react';
import { useConfigStore } from '../../stores/configStore';
import { useUiStore } from '../../stores/uiStore';
import { useI18nStore } from '../../stores/i18nStore';
import { getTheme } from '../../themes';

export function AppShell() {
  const { loadConfig, config } = useConfigStore();
  const { currentPage, navigateTo } = useUiStore();
  const setLocale = useI18nStore((s) => s.setLocale);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Sync locale from config
  useEffect(() => {
    if (config?.general.language) {
      setLocale(config.general.language);
    }
  }, [config?.general.language, setLocale]);

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

  const manifest = getTheme(config.general.theme);
  return <manifest.Component />;
}
