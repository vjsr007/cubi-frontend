import type { ComponentType } from 'react';
import { DefaultTheme } from './default';
import { HyperSpinTheme } from './hyperspin';

export interface ThemeLayout {
  id: string;
  name: string;
  description: string;
  Component: ComponentType;
}

export const THEMES: ThemeLayout[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Clean sidebar with game grid',
    Component: DefaultTheme,
  },
  {
    id: 'hyperspin',
    name: 'HyperSpin',
    description: 'Classic spinning wheel frontend',
    Component: HyperSpinTheme,
  },
];

export function getTheme(id: string): ThemeLayout {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
