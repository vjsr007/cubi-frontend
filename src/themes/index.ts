// Import manifests to trigger self-registration.
// To add a theme: create its folder + manifest.ts, then add one import here.
// To remove a theme: delete its folder and remove the import below.
import './default/manifest';
import './hyperspin/manifest';
import './aurora/manifest';

export { getTheme, getAllThemes, registerTheme } from './registry';
export type { ThemeManifest } from './registry';
