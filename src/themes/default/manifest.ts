import { registerTheme } from '../registry';
import { DefaultTheme } from './index';

registerTheme({
  id: 'default',
  nameKey: 'themes.defaultName',
  descKey: 'themes.defaultDesc',
  Component: DefaultTheme,
});
