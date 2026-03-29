import { registerTheme } from '../registry';
import { AuroraTheme } from './index';

registerTheme({
  id: 'aurora',
  nameKey: 'themes.auroraName',
  descKey: 'themes.auroraDesc',
  Component: AuroraTheme,
});
