````skill
---
name: theme-engine
description: Skill for implementing a theming system with CSS custom properties, layout variants (grid/list/carousel), CRT effects, animations, and color scheme management. Designed for a gamepad-first emulator frontend UI.
version: "1.0.0"
metadata:
  author: cubi-frontend team
  domain: retro-gaming
  language: typescript
  framework: "React 19 + Tailwind CSS 4 + Framer Motion 11"
---

# Theme Engine Skill

## Purpose
Guide the implementation of a flexible theming system for cubi-frontend, including CSS custom properties, layout variants, animations, CRT/retro effects, and user-customizable color schemes — all optimized for TV/gamepad usage.

## Architecture Overview

### Theme System Layers
```
1. Color Tokens (CSS custom properties)
2. Layout Variants (Grid / List / Carousel / Cover)
3. Animation Presets (transitions, hover effects)
4. Visual Effects (CRT scanlines, glow, vignette)
5. Typography Scale (TV-readable sizes)
6. User Preferences (persisted in SQLite/TOML)
```

---

## Color Theme System

### CSS Custom Properties (Tailwind CSS 4)

```css
/* src/styles/themes/default.css */
@theme {
  /* Surface hierarchy */
  --color-surface-0: #0a0a0f;       /* App background */
  --color-surface-50: #12121a;      /* Card background */
  --color-surface-100: #1a1a25;     /* Elevated surface */
  --color-surface-200: #24243a;     /* Active surface */
  --color-surface-300: #2e2e45;     /* Hover surface */
  
  /* Primary accent (customizable per theme) */
  --color-primary-400: #818cf8;     /* Light primary */
  --color-primary-500: #6366f1;     /* Default primary */
  --color-primary-600: #4f46e5;     /* Dark primary */
  
  /* Text hierarchy */
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;
  
  /* Focus ring (critical for gamepad navigation) */
  --color-focus-ring: #818cf8;
  --focus-ring-width: 3px;
  --focus-ring-offset: 2px;
  
  /* Semantic colors */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  
  /* Spacing scale (TV-optimized: larger than desktop) */
  --spacing-card-gap: 1rem;
  --spacing-section-gap: 2rem;
  --spacing-page-padding: 2.5rem;
  
  /* Border radius */
  --radius-card: 0.75rem;
  --radius-button: 0.5rem;
  --radius-badge: 9999px;
  
  /* Transition defaults */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 400ms ease;
}
```

### Predefined Themes
```typescript
// src/themes/presets.ts
export interface ThemePreset {
  id: string;
  name: string;
  colors: Record<string, string>;
  effects?: ThemeEffects;
}

export const themes: ThemePreset[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    colors: {
      '--color-surface-0': '#0a0a0f',
      '--color-primary-500': '#6366f1',
      '--color-focus-ring': '#818cf8',
    },
  },
  {
    id: 'retro-amber',
    name: 'Retro Amber',
    colors: {
      '--color-surface-0': '#0d0800',
      '--color-primary-500': '#f59e0b',
      '--color-text-primary': '#fde68a',
      '--color-focus-ring': '#f59e0b',
    },
  },
  {
    id: 'nintendo-red',
    name: 'Nintendo Red',
    colors: {
      '--color-surface-0': '#0f0a0a',
      '--color-primary-500': '#dc2626',
      '--color-focus-ring': '#f87171',
    },
  },
  {
    id: 'sega-blue',
    name: 'SEGA Blue',
    colors: {
      '--color-surface-0': '#0a0a12',
      '--color-primary-500': '#2563eb',
      '--color-focus-ring': '#60a5fa',
    },
  },
  {
    id: 'playstation',
    name: 'PlayStation',
    colors: {
      '--color-surface-0': '#00003c',
      '--color-primary-500': '#003087',
      '--color-focus-ring': '#0070d1',
    },
  },
  {
    id: 'oled-black',
    name: 'OLED Black',
    colors: {
      '--color-surface-0': '#000000',
      '--color-surface-50': '#0a0a0a',
      '--color-primary-500': '#ffffff',
      '--color-focus-ring': '#ffffff',
    },
  },
];
```

### Theme Application
```typescript
// src/stores/themeStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  activeThemeId: string;
  layoutVariant: LayoutVariant;
  effectsEnabled: boolean;
  crtEnabled: boolean;
  animationsReduced: boolean;
  
  setTheme: (id: string) => void;
  setLayout: (layout: LayoutVariant) => void;
  toggleEffects: () => void;
  toggleCrt: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      activeThemeId: 'midnight',
      layoutVariant: 'grid',
      effectsEnabled: true,
      crtEnabled: false,
      animationsReduced: false,
      
      setTheme: (id) => {
        const theme = themes.find(t => t.id === id);
        if (!theme) return;
        
        // Apply CSS custom properties to :root
        const root = document.documentElement;
        for (const [key, value] of Object.entries(theme.colors)) {
          root.style.setProperty(key, value);
        }
        
        set({ activeThemeId: id });
      },
      
      setLayout: (layout) => set({ layoutVariant: layout }),
      toggleEffects: () => set((s) => ({ effectsEnabled: !s.effectsEnabled })),
      toggleCrt: () => set((s) => ({ crtEnabled: !s.crtEnabled })),
    }),
    { name: 'cubi-theme' }
  )
);
```

---

## Layout Variants

### Variant Types
```typescript
type LayoutVariant = 'grid' | 'list' | 'carousel' | 'cover';
```

### Grid Layout
```tsx
// Classic grid of box art thumbnails
function GridLayout({ games }: { games: GameEntry[] }) {
  return (
    <div
      className="grid gap-(--spacing-card-gap) p-(--spacing-page-padding)"
      style={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
      }}
    >
      {games.map((game) => (
        <GameCard key={game.id} game={game} variant="grid" />
      ))}
    </div>
  );
}
```

### List Layout
```tsx
// Horizontal list with details panel
function ListLayout({ games }: { games: GameEntry[] }) {
  const [selected, setSelected] = useState(0);
  
  return (
    <div className="flex h-full">
      {/* Left: scrollable list */}
      <div className="w-1/3 overflow-y-auto">
        {games.map((game, i) => (
          <ListItem
            key={game.id}
            game={game}
            isSelected={i === selected}
            onFocus={() => setSelected(i)}
          />
        ))}
      </div>
      {/* Right: detail panel with media */}
      <div className="flex-1 p-8">
        <GameDetail game={games[selected]} />
      </div>
    </div>
  );
}
```

### Carousel Layout
```tsx
// Horizontal scroll with center focus
import { motion, useMotionValue, useTransform } from 'framer-motion';

function CarouselLayout({ games }: { games: GameEntry[] }) {
  const [current, setCurrent] = useState(0);
  
  return (
    <div className="flex items-center h-full overflow-hidden">
      <motion.div
        className="flex gap-6 items-center"
        animate={{ x: -(current * 280) + (window.innerWidth / 2 - 140) }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {games.map((game, i) => (
          <motion.div
            key={game.id}
            animate={{
              scale: i === current ? 1.2 : 0.85,
              opacity: Math.abs(i - current) > 3 ? 0 : 1,
              zIndex: i === current ? 10 : 0,
            }}
            className="shrink-0 w-[240px]"
          >
            <GameCard game={game} variant="carousel" />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
```

### Cover Flow Layout
```tsx
// 3D perspective cover flow (like Apple's old Cover Flow)
function CoverLayout({ games }: { games: GameEntry[] }) {
  const [index, setIndex] = useState(0);
  
  return (
    <div className="perspective-[1000px] h-full flex items-center justify-center">
      {games.map((game, i) => {
        const offset = i - index;
        return (
          <motion.div
            key={game.id}
            className="absolute w-[280px] h-[400px]"
            animate={{
              rotateY: offset * -45,
              x: offset * 200,
              z: offset === 0 ? 100 : -Math.abs(offset) * 100,
              opacity: Math.abs(offset) > 4 ? 0 : 1,
            }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            <GameCard game={game} variant="cover" />
          </motion.div>
        );
      })}
    </div>
  );
}
```

---

## Animation System

### Framer Motion Presets
```typescript
// src/lib/animations.ts
import { Variants } from 'framer-motion';

export const cardEntry: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.03, duration: 0.3, ease: 'easeOut' },
  }),
};

export const focusScale: Variants = {
  idle: { scale: 1, boxShadow: 'none' },
  focused: {
    scale: 1.08,
    boxShadow: '0 0 0 3px var(--color-focus-ring), 0 8px 32px rgba(0,0,0,0.5)',
    transition: { type: 'spring', stiffness: 400, damping: 20 },
  },
};

export const slideIn: Variants = {
  initial: { x: 100, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.3 } },
  exit: { x: -100, opacity: 0, transition: { duration: 0.2 } },
};

export const pageTransition: Variants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, scale: 1.02, transition: { duration: 0.2 } },
};
```

### Game Card Component
```tsx
import { motion } from 'framer-motion';

function GameCard({ game, variant }: { game: GameEntry; variant: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <motion.div
      ref={ref}
      tabIndex={0}
      role="button"
      variants={focusScale}
      animate={isFocused ? 'focused' : 'idle'}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className="rounded-(--radius-card) bg-(--color-surface-50) overflow-hidden
                 outline-none cursor-pointer group"
    >
      {/* Box art with lazy loading */}
      <div className="aspect-[3/4] relative overflow-hidden">
        <GameMediaImage
          gamePath={game.rom_path}
          mediaType="box2dfront"
          fallback={<SystemPlaceholder systemId={game.system_id} />}
        />
        {/* Video preview on hover/focus */}
        {isFocused && game.hasVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="absolute inset-0"
          >
            <VideoPreview videoPath={game.videoPath} />
          </motion.div>
        )}
      </div>
      
      {/* Game title */}
      <div className="p-2">
        <span className="text-sm text-(--color-text-primary) truncate block">
          {game.name}
        </span>
      </div>
    </motion.div>
  );
}
```

---

## CRT / Retro Effects

### CSS-based CRT Scanlines
```css
/* src/styles/effects/crt.css */
.crt-effect {
  position: relative;
}

.crt-effect::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15) 0px,
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 3px
  );
  mix-blend-mode: multiply;
}

/* Vignette overlay */
.crt-vignette::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9998;
  background: radial-gradient(
    ellipse at center,
    transparent 60%,
    rgba(0, 0, 0, 0.4) 100%
  );
}

/* Screen curvature (subtle) */
.crt-curve {
  border-radius: 12px;
  box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.3);
}

/* RGB pixel grid */
.crt-rgb::after {
  background-image:
    repeating-linear-gradient(
      90deg,
      rgba(255, 0, 0, 0.03) 0px,
      rgba(0, 255, 0, 0.03) 1px,
      rgba(0, 0, 255, 0.03) 2px,
      transparent 3px
    ),
    repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.1) 0px,
      transparent 1px,
      transparent 2px
    );
}
```

### CRT Toggle Component
```tsx
function CRTOverlay() {
  const { crtEnabled } = useThemeStore();
  
  if (!crtEnabled) return null;
  
  return (
    <div className="crt-effect crt-vignette" aria-hidden="true" />
  );
}
```

---

## Typography Scale (TV-Optimized)

```css
@theme {
  --text-xs: 0.875rem;     /* 14px - badges, metadata */
  --text-sm: 1rem;         /* 16px - secondary text */
  --text-base: 1.125rem;   /* 18px - body (larger for TV) */
  --text-lg: 1.5rem;       /* 24px - game titles */
  --text-xl: 2rem;         /* 32px - section headers */
  --text-2xl: 2.5rem;      /* 40px - system names */
  --text-3xl: 3.5rem;      /* 56px - hero text */
}
```

---

## Responsive Breakpoints

```css
/* TV-first design: largest screens are primary target */
@theme {
  /* Number of columns in grid view */
  --grid-cols-sm: 3;    /* < 1024px */
  --grid-cols-md: 5;    /* 1024–1440px */
  --grid-cols-lg: 7;    /* 1440–1920px */
  --grid-cols-xl: 9;    /* 1920–2560px */
  --grid-cols-2xl: 12;  /* 2560px+ (4K) */
}
```

---

## Key Design Rules

1. **TV-first design** — All text must be readable from 3m/10ft distance
2. **Focus ring is sacred** — Every interactive element needs a visible focus indicator for gamepad nav
3. **Dark themes only** — Emulator frontends are always dark (TV, ambient lighting)
4. **CSS custom properties for everything** — Themes change via property updates, not class swaps
5. **Reduced motion support** — Respect `prefers-reduced-motion` for accessibility
6. **Video on hover/focus** — Auto-play video snaps after 0.8s delay on focus
7. **CRT effect is optional** — Performance impact, must be toggleable
8. **Layout persistence** — Remember user's chosen layout per system
9. **Smooth transitions** — Spring-based animations feel more natural on TV
10. **No white backgrounds** — Ever. Surface hierarchy from near-black upward.
````
