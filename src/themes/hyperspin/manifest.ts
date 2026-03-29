import { registerTheme } from '../registry';
import { HyperSpinTheme } from './index';

registerTheme({
  id: 'hyperspin',
  nameKey: 'themes.hyperspinName',
  descKey: 'themes.hyperspinDesc',
  Component: HyperSpinTheme,
});
