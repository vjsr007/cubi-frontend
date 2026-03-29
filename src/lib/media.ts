import { convertFileSrc } from '@tauri-apps/api/core';

/**
 * Converts a media path to a displayable image src.
 * - Returns null if path is falsy.
 * - Returns the URL unchanged if it is already an HTTP(S) URL
 *   (e.g. Steam CDN, SteamGridDB) — calling convertFileSrc on these
 *   would produce a broken asset:// URL.
 * - Otherwise delegates to convertFileSrc for local file paths.
 */
export function toImageSrc(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return convertFileSrc(path);
}
