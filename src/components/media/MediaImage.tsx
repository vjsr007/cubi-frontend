import { useState, useRef, useEffect } from 'react';
import { toImageSrc } from '../../lib/media';

interface MediaImageProps {
  path: string | null | undefined;
  alt?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
  lazy?: boolean;
}

export function MediaImage({ path, alt = '', style, fallback, lazy = true }: MediaImageProps) {
  const [error, setError] = useState(false);
  const [visible, setVisible] = useState(!lazy);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lazy) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { rootMargin: '300px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [lazy]);

  // Reset error when path changes
  useEffect(() => { setError(false); }, [path]);

  const src = !error ? toImageSrc(path) : null;

  if (!src) {
    return <div ref={ref} style={style}>{fallback ?? null}</div>;
  }

  return (
    <div ref={ref} style={{ ...style, overflow: 'hidden' }}>
      {visible && (
        <img
          src={src}
          alt={alt}
          onError={() => setError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
        />
      )}
    </div>
  );
}
