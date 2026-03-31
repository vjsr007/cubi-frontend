import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { toImageSrc } from '../../lib/media';
import { api } from '../../lib/invoke';
import { useI18nStore } from '../../stores/i18nStore';
import type { EditableMediaType } from '../../types';

interface Props {
  gameId: string;
  mediaType: EditableMediaType;
  label: string;
  currentPath: string | null;
  onUpdate: () => void;
  onError: (msg: string) => void;
}

export function MediaSlot({ gameId, mediaType, label, currentPath, onUpdate, onError }: Props) {
  const [importing, setImporting] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [url, setUrl] = useState('');
  const { t } = useI18nStore();

  const imgSrc = toImageSrc(currentPath);
  const isVideo = mediaType === 'video';

  const handleUpload = async () => {
    const filters = isVideo
      ? [{ name: 'Video', extensions: ['mp4', 'mkv', 'webm', 'avi'] }]
      : [{ name: 'Image', extensions: ['jpg', 'jpeg', 'png', 'webp'] }];
    const path = await open({ filters, multiple: false });
    if (!path) return;

    setImporting(true);
    try {
      await api.importMediaFile(gameId, path, mediaType);
      onUpdate();
    } catch (e) {
      onError(String(e));
    } finally {
      setImporting(false);
    }
  };

  const handleUrlImport = async () => {
    if (!url.trim()) return;
    setImporting(true);
    try {
      await api.importMediaUrl(gameId, url.trim(), mediaType);
      setUrl('');
      setShowUrlInput(false);
      onUpdate();
    } catch (e) {
      onError(String(e));
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteGameMedia(gameId, mediaType);
      onUpdate();
    } catch (e) {
      onError(String(e));
    }
  };

  const btnStyle: React.CSSProperties = {
    background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
    borderRadius: 4, padding: '3px 8px', fontSize: 10, cursor: 'pointer',
    color: 'var(--color-text-muted)', transition: 'border-color 0.15s',
  };

  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>

      {/* Preview */}
      <div style={{
        width: '100%', aspectRatio: isVideo ? '16/9' : '3/4',
        background: 'var(--color-surface-2)', borderRadius: 6, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {currentPath && isVideo ? (
          <video
            src={convertFileSrc(currentPath)}
            controls
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : imgSrc && !isVideo ? (
          <img src={imgSrc} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{t('editor.noMedia')}</span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <button onClick={handleUpload} disabled={importing} style={btnStyle}>
          {importing ? t('editor.importing') : t('editor.uploadFile')}
        </button>
        <button onClick={() => setShowUrlInput(!showUrlInput)} style={btnStyle}>
          {t('editor.importUrl')}
        </button>
        {currentPath && (
          <button onClick={handleDelete} style={{ ...btnStyle, color: '#ef4444' }}>
            {t('editor.deleteMedia')}
          </button>
        )}
      </div>

      {/* URL input */}
      {showUrlInput && (
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleUrlImport(); }}
            placeholder={t('editor.urlPlaceholder')}
            style={{
              flex: 1, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
              borderRadius: 4, padding: '4px 8px', fontSize: 11, color: 'var(--color-text)', outline: 'none',
            }}
          />
          <button onClick={handleUrlImport} disabled={importing} style={btnStyle}>
            {importing ? '...' : 'OK'}
          </button>
        </div>
      )}
    </div>
  );
}
