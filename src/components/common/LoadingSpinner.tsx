interface Props {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export function LoadingSpinner({ size = 'md', message }: Props) {
  const dim = { sm: 16, md: 32, lg: 48 }[size];
  const border = size === 'lg' ? 3 : 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          width: dim,
          height: dim,
          borderRadius: '50%',
          border: `${border}px solid var(--color-surface-3)`,
          borderTopColor: 'var(--color-primary)',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      {message && (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>{message}</p>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
