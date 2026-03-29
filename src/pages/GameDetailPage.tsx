import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useUiStore } from '../stores/uiStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useI18nStore } from '../stores/i18nStore';
import { useGameMedia } from '../hooks/useMedia';
import { useTranslate } from '../hooks/useTranslate';
import { GameBoxCase } from '../components/library/GameBoxCase';
import { VideoPreview } from '../components/media/VideoPreview';
import { SystemLogo } from '../components/common/SystemLogo';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export function GameDetailPage() {
  const { selectedGameId, navigateTo, showToast } = useUiStore();
  const { launchGame, games, toggleFavorite } = useLibraryStore();
  const { t } = useI18nStore();
  const [boxFlipped, setBoxFlipped] = useState(false);

  const game = games.find((g) => g.id === selectedGameId);
  const { data: media, isLoading: mediaLoading } = useGameMedia(game?.id ?? null);

  const { translate, toggleOriginal, isLoading: translating, canTranslate,
          isTranslated, showingOriginal, getField } = useTranslate(game?.id ?? '', {
    description: game?.description,
    genre: game?.genre,
    developer: game?.developer,
    publisher: game?.publisher,
  });

  const handleLaunch = useCallback(() => {
    if (game) launchGame(game.id).catch((err) => showToast(String(err), 'error'));
  }, [game, launchGame, showToast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); navigateTo('library'); }
      if (e.key === 'Enter') { e.preventDefault(); handleLaunch(); }
      if (e.key === ' ') { e.preventDefault(); setBoxFlipped((f) => !f); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleLaunch, navigateTo]);

  if (!game) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <LoadingSpinner size="lg" message={t('common.loading')} />
      </div>
    );
  }

  const hasVideo = !!media?.video;
  const description = getField('description');
  const genre = getField('genre');
  const developer = getField('developer');
  const publisher = getField('publisher');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      style={{ flex: 1, overflowY: 'auto', height: '100%', background: 'var(--color-background)' }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 32px 48px' }}>
        {/* Back button */}
        <button
          onClick={() => navigateTo('library')}
          style={{
            background: 'none', border: 'none', color: 'var(--color-text-muted)',
            cursor: 'pointer', fontSize: 13, marginBottom: 24, padding: '4px 0',
            display: 'flex', alignItems: 'center', gap: 6, transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)'; }}
        >
          {t('settings.back')}
        </button>

        <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
          {/* ── Left Column: 3D Box + Video ── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}
          >
            <GameBoxCase
              game={game}
              media={media ?? null}
              flipped={boxFlipped}
              onFlip={() => setBoxFlipped((f) => !f)}
              width={280}
              height={380}
              spineWidth={20}
            />
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0, textAlign: 'center', opacity: 0.6 }}>
              {boxFlipped ? t('game.flipToFront') : t('game.flipToFlip')}
            </p>

            {hasVideo && media?.video && (
              <div style={{
                width: 300, aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden',
                border: '1px solid var(--color-border)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              }}>
                <VideoPreview videoPath={media.video} playing={true} />
              </div>
            )}

            {mediaLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 16, height: 16,
                  border: '2px solid var(--color-border)',
                  borderTopColor: 'var(--color-primary)',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                }} />
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{t('common.loading')}</span>
              </div>
            )}
          </motion.div>

          {/* ── Right Column: Metadata ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            style={{ flex: 1, minWidth: 0 }}
          >
            {/* System logo + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <SystemLogo systemId={game.system_id} size={28} fallbackText="" />
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                {game.system_id}
              </span>
            </div>

            <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--color-text)', margin: '0 0 8px', lineHeight: 1.2 }}>
              {game.title}
            </h1>

            {/* Tags row */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {game.year && <Tag>{game.year}</Tag>}
              {genre && <Tag>{genre}</Tag>}
              {developer && <Tag>{developer}</Tag>}
              {publisher && <Tag>{publisher}</Tag>}
              {game.players > 1 && <Tag>{game.players} {t('game.players')}</Tag>}
              {game.favorite && <Tag color="#f59e0b">★ {t('game.favorite')}</Tag>}
            </div>

            {/* Description */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {t('game.description')}
                </span>

                {/* Translate / Original toggle buttons */}
                {canTranslate && !isTranslated && (
                  <button
                    onClick={translate}
                    disabled={translating}
                    style={{
                      background: 'none', border: '1px solid var(--color-border)',
                      borderRadius: 6, padding: '2px 10px', fontSize: 11,
                      color: 'var(--color-text-muted)', cursor: translating ? 'default' : 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      transition: 'border-color 0.15s, color 0.15s',
                      opacity: translating ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) => { if (!translating) { const b = e.currentTarget; b.style.borderColor = 'var(--color-primary)'; b.style.color = 'var(--color-primary)'; } }}
                    onMouseLeave={(e) => { const b = e.currentTarget; b.style.borderColor = 'var(--color-border)'; b.style.color = 'var(--color-text-muted)'; }}
                  >
                    {translating ? (
                      <>
                        <div style={{ width: 10, height: 10, border: '1.5px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                        {t('game.translating')}
                      </>
                    ) : (
                      <>🌐 {t('game.translateMetadata')}</>
                    )}
                  </button>
                )}

                {isTranslated && (
                  <button
                    onClick={toggleOriginal}
                    style={{
                      background: showingOriginal ? 'var(--color-surface-2)' : 'none',
                      border: '1px solid var(--color-border)',
                      borderRadius: 6, padding: '2px 10px', fontSize: 11,
                      color: showingOriginal ? 'var(--color-text)' : 'var(--color-text-muted)',
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                      transition: 'all 0.15s',
                    }}
                  >
                    {showingOriginal ? '🌐 Translated' : `📄 ${t('game.showOriginal')}`}
                  </button>
                )}
              </div>

              <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.7, margin: 0, maxWidth: 500 }}>
                {description ?? t('game.noDescription')}
              </p>
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              <StatCard label={t('game.playCount')} value={game.play_count} />
              <StatCard label={t('game.lastPlayed')} value={game.last_played ? new Date(game.last_played).toLocaleDateString() : t('game.neverPlayed')} />
              <StatCard label={t('game.rating')} value={game.rating > 0 ? `${(game.rating * 10).toFixed(0)}%` : '—'} />
            </div>

            {/* Launch button */}
            <button
              onClick={handleLaunch}
              style={{
                background: 'var(--color-primary)', color: '#fff', border: 'none',
                borderRadius: 10, padding: '14px 36px', fontSize: 16, fontWeight: 700,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10,
                boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
                transition: 'transform 0.1s, box-shadow 0.1s', marginBottom: 24,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.03)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 24px rgba(124,58,237,0.45)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(124,58,237,0.3)';
              }}
            >
              ▶ {t('game.launch')}
            </button>

            {/* Favorite toggle */}
            <div style={{ marginBottom: 24 }}>
              <button
                onClick={() => toggleFavorite(game.id)}
                style={{
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer',
                  color: game.favorite ? '#f59e0b' : 'var(--color-text-muted)',
                  display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'border-color 0.15s',
                }}
              >
                {game.favorite ? `★ ${t('game.favorite')}` : `☆ ${t('game.favorite')}`}
              </button>
            </div>

            {/* File info */}
            <div style={{ background: 'var(--color-surface)', borderRadius: 8, border: '1px solid var(--color-border)', padding: '12px 16px' }}>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('game.file')}</p>
              <p style={{ fontSize: 12, color: 'var(--color-text)', fontFamily: 'monospace', margin: '0 0 4px', wordBreak: 'break-all' }}>
                {game.file_name}
              </p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
                {(game.file_size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>

            {/* Keyboard shortcuts hint */}
            <div style={{ marginTop: 20, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <KbdHint keys="Enter" action={t('game.launch')} />
              <KbdHint keys="Space" action={t('game.flipBox')} />
              <KbdHint keys="Esc" action={t('common.back')} />
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Subcomponents ── */

function Tag({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 500,
      color: color ?? 'var(--color-text-muted)',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 6, padding: '3px 10px',
    }}>
      {children}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 8, border: '1px solid var(--color-border)', padding: '10px 14px' }}>
      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </p>
      <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>{value}</p>
    </div>
  );
}

function KbdHint({ keys, action }: { keys: string; action: string }) {
  return (
    <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
      <kbd style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 4, padding: '1px 6px', fontSize: 10, fontFamily: 'monospace',
        color: 'var(--color-text)',
      }}>
        {keys}
      </kbd>
      {action}
    </span>
  );
}
