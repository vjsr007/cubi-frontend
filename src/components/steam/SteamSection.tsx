import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/invoke';
import { useI18nStore } from '../../stores/i18nStore';
import { useUiStore } from '../../stores/uiStore';
import { SteamReviews } from './SteamReviews';
import { SteamInfo } from './SteamInfo';
import { SteamSearchModal } from './SteamSearchModal';
import type { GameInfo } from '../../types';
import type { SteamGameData } from '../../types/steam';

interface Props {
  game: GameInfo;
}

export function SteamSection({ game }: Props) {
  const { t } = useI18nStore();
  const { showToast } = useUiStore();
  const queryClient = useQueryClient();
  const [showSearch, setShowSearch] = useState(false);
  const [linking, setLinking] = useState(false);

  const { data: steamData, isLoading, refetch } = useQuery<SteamGameData | null>({
    queryKey: ['steam-data', game.id],
    queryFn: () => api.fetchSteamData(game.id),
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: false,
  });

  const handleLink = async (appId: number) => {
    setShowSearch(false);
    setLinking(true);
    try {
      await api.linkSteamGame(game.id, appId);
      queryClient.invalidateQueries({ queryKey: ['steam-data', game.id] });
      showToast(t('steam.linked'), 'success');
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setLinking(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await api.refreshSteamData(game.id);
      queryClient.invalidateQueries({ queryKey: ['steam-data', game.id] });
      showToast(t('steam.refreshed'), 'success');
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const btnStyle: React.CSSProperties = {
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: 6, padding: '6px 12px', fontSize: 11, fontWeight: 600,
    cursor: 'pointer', color: 'var(--color-text-muted)',
    display: 'inline-flex', alignItems: 'center', gap: 4,
    transition: 'border-color 0.15s',
  };

  if (isLoading || linking) {
    return (
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 14, height: 14, border: '2px solid var(--color-border)',
          borderTopColor: 'var(--color-primary)', borderRadius: '50%',
          animation: 'spin 0.6s linear infinite',
        }} />
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
          {linking ? t('steam.linking') : t('steam.loading')}
        </span>
      </div>
    );
  }

  if (!steamData) {
    return (
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          {t('steam.noData')}
        </span>
        <button onClick={() => setShowSearch(true)} style={btnStyle}>
          {t('steam.findOnSteam')}
        </button>
        {showSearch && (
          <SteamSearchModal
            gameTitle={game.title}
            onLink={handleLink}
            onClose={() => setShowSearch(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header with refresh */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        <button onClick={handleRefresh} style={btnStyle}>
          {t('steam.refresh')}
        </button>
      </div>

      <SteamReviews data={steamData} />
      <SteamInfo data={steamData} />

      {showSearch && (
        <SteamSearchModal
          gameTitle={game.title}
          onLink={handleLink}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}
