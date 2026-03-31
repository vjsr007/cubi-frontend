import { useRef, useEffect, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';

interface VideoPreviewProps {
  videoPath: string;
  playing?: boolean;
  showControls?: boolean;
  style?: React.CSSProperties;
}

export function VideoPreview({ videoPath, playing = true, showControls = false, style }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [ready, setReady] = useState(false);
  const src = convertFileSrc(videoPath);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [playing]);

  useEffect(() => {
    return () => {
      const v = videoRef.current;
      if (v) { v.pause(); v.src = ''; }
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
      <video
        ref={videoRef}
        src={src}
        autoPlay={playing}
        muted={muted}
        loop
        playsInline
        controls={showControls}
        onCanPlay={() => setReady(true)}
        onError={() => setReady(false)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: ready ? 1 : 0,
          transition: 'opacity 0.4s',
        }}
      />
      {!showControls && (
        <button
          onClick={() => setMuted((m) => !m)}
          title={muted ? 'Unmute' : 'Mute'}
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 6,
            color: '#fff',
            width: 28,
            height: 28,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5,
          }}
        >
          {muted ? '\u{1F507}' : '\u{1F50A}'}
        </button>
      )}
    </div>
  );
}
