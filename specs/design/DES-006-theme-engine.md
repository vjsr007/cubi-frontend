# DES-006 — Theme Engine Design

**Status:** APPROVED
**REQ:** REQ-006
**Created:** 2026-03-28

## Architecture Overview

```
src/themes/
├── index.ts                  # ThemeRegistry + ThemeProvider
├── default/
│   └── index.tsx             # Current sidebar+grid layout (wrapped)
└── hyperspin/
    ├── index.tsx             # HyperSpin root layout
    ├── WheelCarousel.tsx     # Spinning oval badges wheel
    ├── PreviewPanel.tsx      # Left panel: TV frame + game preview
    ├── GameWheel.tsx         # Game selection wheel (inside a system)
    └── BottomBar.tsx         # Player 1 | joystick | Select System | Player 2
```

## Theme Interface

```typescript
// src/themes/index.ts
export interface ThemeLayout {
  id: string;
  name: string;
  description: string;
  Component: React.ComponentType;
}

export const THEMES: ThemeLayout[] = [
  { id: 'default', name: 'Default', description: 'Clean sidebar + grid layout', Component: DefaultTheme },
  { id: 'hyperspin', name: 'HyperSpin', description: 'Classic spinning wheel frontend', Component: HyperSpinTheme },
];
```

## Config Change

`config.general.theme: string` — already exists. Values: `"default"` | `"hyperspin"`.

## AppShell Integration

```typescript
// AppShell.tsx — replaces page routing with theme rendering
const theme = THEMES.find(t => t.id === config.general.theme) ?? THEMES[0];
return <theme.Component />;
```

Each theme component manages its own navigation state internally (system selection, game selection, page: systems | games). Themes read from `useLibraryStore` and `useConfigStore`.

---

## HyperSpin Theme Design

### Visual Layout
```
┌─────────────────────────────────────────────────────┐
│  [PREVIEW PANEL - 55%]        [WHEEL - 45%]         │
│                                                     │
│  ┌──────────────────┐    ╭──────────────╮  ← top   │
│  │  [TV/CRT frame]  │    │  CAPCOM      │           │
│  │                  │    ╰──────────────╯           │
│  │  game screenshot │    ╭──────────────╮           │
│  │  or system logo  │    │  TAITO       │           │
│  │                  │  →(╭──────────────╮)← focused │
│  └──────────────────┘    │ ARCADE CLASS │  (large)  │
│                          ╰──────────────╯           │
│  [System Name]           ╭──────────────╮           │
│  [Game Count]            │  GEO         │           │
│                          ╰──────────────╯           │
│                               ↓ bottom              │
├─────────────────────────────────────────────────────┤
│  Player 1    🕹️    Select System    🕹️    Player 2  │
└─────────────────────────────────────────────────────┘
```

### WheelCarousel Component
- Renders `systems` as oval badge pills in a vertical arc on the right
- Selected system is centered + larger (scale 1.3) with glow
- Items above/below are progressively smaller and more transparent (perspective illusion)
- Navigation: ArrowUp/ArrowDown or gamepad D-pad
- Rotation: CSS transform translateY + scale based on distance from center
- Transition: `transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- Max visible items: 7 (3 above, selected, 3 below)
- Each badge: oval shape, gradient metallic fill, system name text, SVG border

### PreviewPanel Component
- Left side, ~55% width
- Shows box art of first game in selected system OR system logo placeholder
- TV/CRT frame: dark metallic border, slight inner shadow, scanline overlay (CSS)
- Below frame: system full name (large, bold) + game count
- Animates image crossfade on system change (opacity transition)

### GameWheel Component (shown when user presses Enter/A on a system)
- Same oval wheel layout but shows games instead of systems
- Left panel shows selected game's box art
- Press Enter/A again = launch game
- Press Escape/B = back to system wheel

### BottomBar Component
- Fixed height ~48px
- Background: dark metallic gradient
- "Player 1" left | 🕹 icon center-left | "Select System" center | 🕹 icon center-right | "Player 2" right
- Text changes contextually: "Select System" → "Select Game" → "Launch Game"

### Styling
- Background: radial gradient from `#3a0a0a` (dark red) to `#0a0a0a` (black)
- Badge fill: linear gradient `#1a1a1a` → `#333` with metallic sheen on hover
- Badge border: `#c0392b` (red) for unfocused, `#f39c12` (gold) for focused
- Font: system-ui bold, uppercase, letter-spacing
- Glow on focused badge: `box-shadow: 0 0 20px rgba(243,156,18,0.6)`
- Scanlines: CSS `repeating-linear-gradient` overlay at 3% opacity

---

## Settings Integration

Add "Themes" section to SettingsPage:
- List of theme cards (name + description + preview thumbnail placeholder)
- Click to select → updates `config.general.theme` → saves config
- Active theme highlighted with border

---

## Task Breakdown

- TASK-006-01: Theme registry + ThemeProvider + AppShell integration
- TASK-006-02: Default theme wrapper (no visual change)
- TASK-006-03: HyperSpin WheelCarousel component
- TASK-006-04: HyperSpin PreviewPanel + BottomBar
- TASK-006-05: HyperSpin GameWheel (game selection inside system)
- TASK-006-06: Theme selector in Settings
