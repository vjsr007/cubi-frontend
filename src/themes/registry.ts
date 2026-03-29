import type { ComponentType } from 'react';

/** Contract every theme must satisfy to be registered. */
export interface ThemeManifest {
  /** Unique stable identifier — stored in config */
  id: string;
  /** i18n key for the display name, e.g. 'themes.defaultName' */
  nameKey: string;
  /** i18n key for the short description */
  descKey: string;
  /** Root component — receives no props; reads stores directly */
  Component: ComponentType;
}

const _registry = new Map<string, ThemeManifest>();

/** Register a theme. Call this from each theme's manifest.ts. */
export function registerTheme(manifest: ThemeManifest): void {
  _registry.set(manifest.id, manifest);
}

/** Return registered theme by id, falling back to the first registered. */
export function getTheme(id: string): ThemeManifest {
  return _registry.get(id) ?? _registry.values().next().value!;
}

/** Return all registered themes in registration order. */
export function getAllThemes(): ThemeManifest[] {
  return [..._registry.values()];
}
