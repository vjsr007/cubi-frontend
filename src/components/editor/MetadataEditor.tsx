import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/invoke';
import { useI18nStore } from '../../stores/i18nStore';
import { useUiStore } from '../../stores/uiStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { TagEditor } from './TagEditor';
import { MediaSlot } from './MediaSlot';
import { YouTubeSearch } from './YouTubeSearch';
import type { GameInfo, GameMedia } from '../../types';
import type { GameInfoPatch } from '../../types/editor';

interface Props {
  game: GameInfo;
  media: GameMedia | null;
}

const fieldStyle: React.CSSProperties = {
  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
  borderRadius: 6, padding: '6px 10px', fontSize: 13, color: 'var(--color-text)',
  outline: 'none', width: '100%', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'block',
};

export function MetadataEditor({ game, media }: Props) {
  const { t } = useI18nStore();
  const { showToast } = useUiStore();
  const queryClient = useQueryClient();

  // Draft state for text fields
  const [draft, setDraft] = useState<GameInfoPatch>({
    title: game.title,
    description: game.description ?? '',
    developer: game.developer ?? '',
    publisher: game.publisher ?? '',
    year: game.year ?? '',
    genre: game.genre ?? '',
    players: game.players,
    rating: game.rating,
    tags: game.tags ?? [],
    website: game.website ?? '',
  });

  const [saving, setSaving] = useState(false);

  const updateField = useCallback(<K extends keyof GameInfoPatch>(key: K, value: GameInfoPatch[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.updateGameMetadata(game.id, draft);
      // Update zustand store with new game data
      useLibraryStore.setState((state) => ({
        games: state.games.map((g) => g.id === updated.id ? updated : g),
      }));
      showToast(t('editor.importSuccess'), 'success');
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMediaUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['gameMedia', game.id] });
    // Also refresh game data from DB since media paths are stored in game record
    api.getGame(game.id).then((updated) => {
      if (updated) {
        useLibraryStore.setState((state) => ({
          games: state.games.map((g) => g.id === updated.id ? updated : g),
        }));
      }
    });
  };

  const handleMediaError = (msg: string) => {
    showToast(msg, 'error');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Text Metadata ── */}
      <section>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 12px', borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>
          {t('editor.editMode')}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Title - full width */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>{t('editor.title')}</label>
            <input
              value={draft.title ?? ''}
              onChange={(e) => updateField('title', e.target.value)}
              style={fieldStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>{t('editor.developer')}</label>
            <input
              value={draft.developer ?? ''}
              onChange={(e) => updateField('developer', e.target.value)}
              style={fieldStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>{t('editor.publisher')}</label>
            <input
              value={draft.publisher ?? ''}
              onChange={(e) => updateField('publisher', e.target.value)}
              style={fieldStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>{t('editor.year')}</label>
            <input
              value={draft.year ?? ''}
              onChange={(e) => updateField('year', e.target.value)}
              style={fieldStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>{t('editor.genre')}</label>
            <input
              value={draft.genre ?? ''}
              onChange={(e) => updateField('genre', e.target.value)}
              style={fieldStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>{t('editor.players')}</label>
            <input
              type="number"
              min={1}
              max={16}
              value={draft.players ?? 1}
              onChange={(e) => updateField('players', parseInt(e.target.value) || 1)}
              style={fieldStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>{t('editor.rating')} ({((draft.rating ?? 0) * 10).toFixed(0)}%)</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={draft.rating ?? 0}
              onChange={(e) => updateField('rating', parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--color-primary)' }}
            />
          </div>

          {/* Website - full width */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>{t('editor.website')}</label>
            <input
              value={draft.website ?? ''}
              onChange={(e) => updateField('website', e.target.value)}
              placeholder="https://..."
              style={fieldStyle}
            />
          </div>

          {/* Description - full width */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>{t('editor.description')}</label>
            <textarea
              value={draft.description ?? ''}
              onChange={(e) => updateField('description', e.target.value)}
              rows={4}
              style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          {/* Tags - full width */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>{t('editor.tags')}</label>
            <TagEditor
              tags={(draft.tags as string[]) ?? []}
              onChange={(tags) => updateField('tags', tags)}
            />
          </div>
        </div>

        {/* Save button */}
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: 'var(--color-primary)', color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 24px', fontSize: 13, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            {saving && (
              <div style={{
                width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite',
              }} />
            )}
            {saving ? t('editor.saving') : t('editor.save')}
          </button>
        </div>
      </section>

      {/* ── Media Gallery ── */}
      <section>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 12px', borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>
          {t('editor.mediaGallery')}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <MediaSlot
            gameId={game.id} mediaType="box_art" label={t('editor.boxArt')}
            currentPath={media?.box_art ?? game.box_art ?? null}
            onUpdate={handleMediaUpdate} onError={handleMediaError}
          />
          <MediaSlot
            gameId={game.id} mediaType="hero_art" label={t('editor.heroArt')}
            currentPath={game.hero_art ?? null}
            onUpdate={handleMediaUpdate} onError={handleMediaError}
          />
          <MediaSlot
            gameId={game.id} mediaType="logo" label={t('editor.logo')}
            currentPath={game.logo ?? null}
            onUpdate={handleMediaUpdate} onError={handleMediaError}
          />
          <MediaSlot
            gameId={game.id} mediaType="background_art" label={t('editor.backgroundArt')}
            currentPath={game.background_art ?? null}
            onUpdate={handleMediaUpdate} onError={handleMediaError}
          />
          <MediaSlot
            gameId={game.id} mediaType="screenshot" label={t('editor.screenshots')}
            currentPath={media?.screenshot ?? null}
            onUpdate={handleMediaUpdate} onError={handleMediaError}
          />
          <MediaSlot
            gameId={game.id} mediaType="video" label={t('editor.video')}
            currentPath={media?.video ?? game.trailer_local ?? null}
            onUpdate={handleMediaUpdate} onError={handleMediaError}
          />
        </div>
      </section>

      {/* ── YouTube Search & Download ── */}
      <section>
        <YouTubeSearch
          gameId={game.id}
          gameTitle={game.title}
          onDownloaded={handleMediaUpdate}
          onError={handleMediaError}
        />
      </section>
    </div>
  );
}
