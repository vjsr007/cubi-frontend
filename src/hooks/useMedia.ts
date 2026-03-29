import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/invoke';
import type { GameMedia, SystemMedia } from '../types';

/**
 * Get game media. If local media is empty, auto-downloads from Libretro thumbnails.
 * `enabled` can be set to false to skip fetching (e.g., off-screen cards).
 */
export function useGameMedia(gameId: string | null, enabled = true) {
  return useQuery<GameMedia>({
    queryKey: ['game-media', gameId],
    queryFn: async () => {
      const local = await api.getGameMedia(gameId!);
      const hasMedia = local.box_art || local.screenshot || local.video || local.mix_image;
      if (hasMedia) return local;
      // Auto-download from Libretro if nothing is available locally
      try {
        return await api.downloadGameMedia(gameId!);
      } catch {
        return local;
      }
    },
    enabled: !!gameId && enabled,
    staleTime: 1000 * 60 * 60, // 1 hour — recheck after session
    retry: false,
  });
}

export function useSystemMedia(systemId: string | null) {
  return useQuery<SystemMedia>({
    queryKey: ['system-media', systemId],
    queryFn: () => api.getSystemMedia(systemId!),
    enabled: !!systemId,
    staleTime: Infinity,
    retry: false,
  });
}

/** Pick the best static image to display for a game, in priority order */
export function bestImage(media: GameMedia | null | undefined): string | null {
  if (!media) return null;
  return (
    media.box_art ??
    media.mix_image ??
    media.screenshot ??
    media.title_screen ??
    media.fan_art ??
    media.wheel ??
    null
  );
}
