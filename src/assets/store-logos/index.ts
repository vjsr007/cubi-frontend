import steamSvg   from './steam.svg';
import epicSvg    from './epic.svg';
import gogSvg     from './gog.svg';
import eaSvg      from './ea.svg';
import xboxSvg    from './xbox.svg';

export const STORE_LOGOS: Record<string, string> = {
  steam: steamSvg,
  epic:  epicSvg,
  gog:   gogSvg,
  ea:    eaSvg,
  xbox:  xboxSvg,
};

export type StoreId = keyof typeof STORE_LOGOS;
