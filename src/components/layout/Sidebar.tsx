import { useUiStore } from '../../stores/uiStore';
import type { Page } from '../../types';
import cubiLogo from '../../assets/cubi-logo.png';

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'library', label: 'Library', icon: '⊞' },
  { id: 'catalog', label: 'Catalog', icon: '📚' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

export function Sidebar() {
  const { currentPage, navigateTo } = useUiStore();

  return (
    <nav
      style={{
        width: 60,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        gap: 4,
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <img
        src={cubiLogo}
        alt="Cubi"
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          marginBottom: 12,
          objectFit: 'contain',
        }}
      />

      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => navigateTo(item.id)}
          title={item.label}
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            background: currentPage === item.id ? 'var(--color-primary)' : 'transparent',
            color: currentPage === item.id ? '#fff' : 'var(--color-text-muted)',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            if (currentPage !== item.id) {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface-2)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text)';
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage !== item.id) {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)';
            }
          }}
        >
          {item.icon}
        </button>
      ))}
    </nav>
  );
}
