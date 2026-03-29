import nes from './nes.svg';
import snes from './snes.svg';
import n64 from './n64.svg';
import gb from './gb.svg';
import gbc from './gbc.svg';
import gba from './gba.svg';
import nds from './nds.svg';
import gamecube from './gamecube.svg';
import wii from './wii.svg';
import wiiu from './wiiu.svg';
import switchLogo from './switch.svg';
import ps1 from './ps1.svg';
import ps2 from './ps2.svg';
import ps3 from './ps3.svg';
import psp from './psp.svg';
import psvita from './psvita.svg';
import ps4 from './ps4.svg';
import genesis from './genesis.svg';
import mastersystem from './mastersystem.svg';
import saturn from './saturn.svg';
import dreamcast from './dreamcast.svg';
import xbox from './xbox.svg';
import xbox360 from './xbox360.svg';
import arcade from './arcade.svg';
import n3ds from './3ds.svg';
import gamegear from './gamegear.svg';
import atari2600 from './atari2600.svg';
import atari5200 from './atari5200.svg';
import atari7800 from './atari7800.svg';
import pcengine from './pcengine.svg';
import neogeo from './neogeo.svg';
import ngpc from './ngpc.svg';
import mame from './mame.svg';
import fbneo from './fbneo.svg';
import sg1000 from './sg1000.svg';
import colecovision from './colecovision.svg';
import intellivision from './intellivision.svg';
import wswan from './wswan.svg';
import wswanc from './wswanc.svg';

/**
 * Maps system IDs to their SVG logo URLs (Vite static imports).
 * Source: Siddy212/canvas-es-de (CC0 1.0 Universal — public domain)
 */
export const SYSTEM_LOGOS: Record<string, string> = {
  nes,
  snes,
  n64,
  gb,
  gbc,
  gba,
  nds,
  gamecube,
  wii,
  wiiu,
  switch: switchLogo,
  ps1,
  ps2,
  ps3,
  psp,
  psvita,
  ps4,
  genesis,
  mastersystem,
  saturn,
  dreamcast,
  xbox,
  xbox360,
  arcade,
  '3ds': n3ds,
  gamegear,
  atari2600,
  atari5200,
  atari7800,
  pcengine,
  neogeo,
  ngpc,
  mame,
  fbneo,
  sg1000,
  colecovision,
  intellivision,
  wswan,
  wswanc,
};
