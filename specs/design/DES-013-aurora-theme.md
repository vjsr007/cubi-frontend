# DES-013 — Aurora Xbox 360 Theme Design

## Status: APPROVED
## Linked REQ: REQ-013
## Date: 2026-03-29
## Updated: 2026-03-30 — Two-view navigation, Xbox wallpaper, larger boxes

---

## 1. Architecture Overview

```
src/themes/aurora/
├── index.tsx              ← Main theme component (AuroraTheme)
├── manifest.ts            ← Theme registry registration
├── aurora.css             ← Theme-specific keyframe animations
├── AuroraBokeh.tsx        ← Animated bokeh background layer
├── AuroraBox3D.tsx        ← Single 3D Xbox 360 game case
├── AuroraCarousel.tsx     ← CoverFlow 3D carousel for games
├── AuroraHUD.tsx          ← Top-left user info overlay + info bar + ticker
├── AuroraSystemBox.tsx    ← Single 3D case for a console system
└── AuroraSystemCarousel.tsx ← CoverFlow carousel for system selection
```

**Background asset:** `public/xbox-bg.jpg` (Xbox/Forza dark wallpaper, 1920×1080)

---

## 2. Visual Layout

### View 1 — Systems CoverFlow
```
┌───────────────────────────────────────────────────────────────────┐
│ [Avatar] Player 1           CUBI               [system name]     │
│ ○  37361/2259                                                     │
│                                                                   │
│       ╔══╗   ╔══╗  ╔═══════════════════╗  ╔══╗   ╔══╗          │
│       ║PS║   ║GC║  ║  XBOX 360  ▓▓▓▓  ║  ║N64║  ║GBA║          │
│       ║  ║   ║  ║  ║   [SYSTEM LOGO]   ║  ║  ║  ║   ║          │
│       ╚══╝   ╚══╝  ║       XBOX 360    ║  ╚══╝  ╚═══╝          │
│                     ║       [52 games]  ║                         │
│                     ╚═══════════════════╝                         │
│                        Xbox 360  ·  3 of 12                       │
├───────────────────────────────────────────────────────────────────│
│  SYSTEMS  ·  ← → Navigate   A Select                             │
└───────────────────────────────────────────────────────────────────┘
```

### View 2 — Games CoverFlow (after selecting a system)
```
┌───────────────────────────────────────────────────────────────────┐
│ [Avatar] Player 1           CUBI               [system name]     │
│ ○  37361/2259        ‹ Xbox 360 (back button)                    │
│                                                                   │
│    ╔══╗  ╔══╗  ╔══╗ ╔══════════════════╗ ╔══╗  ╔══╗  ╔══╗      │
│    ║  ║  ║  ║  ║  ║ ║  XBOX 360 ████  ║ ║  ║  ║  ║  ║  ║      │
│    ║  ║  ║  ║  ║  ║ ║                  ║ ║  ║  ║  ║  ║  ║      │
│    ║  ║  ║  ║  ║  ║ ║   [BOX ART]      ║ ║  ║  ║  ║  ║  ║      │
│    ╚══╝  ╚══╝  ╚══╝ ╚══════════════════╝ ╚══╝  ╚══╝  ╚══╝      │
│                         Halo 3                                    │
│                          7 de 172                                 │
├───────────────────────────────────────────────────────────────────│
│  XBOX 360  ·  ← → Navigate   A Launch   B Back                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Specifications

### 3.1 AuroraTheme (`index.tsx`)

**Navigation model — two views:**
```
SYSTEMS VIEW  →  (Enter / A button)  →  GAMES VIEW
GAMES VIEW    →  (B / Backspace)     →  SYSTEMS VIEW
Either view   →  (Escape / Start)    →  SETTINGS overlay
```

**State:**
```typescript
type AuroraView = 'systems' | 'games';
const [view, setView]               = useState<AuroraView>('systems');
const [systemIndex, setSystemIndex] = useState(0);
const [gameIndex, setGameIndex]     = useState(0);
```

**Key functions:**
- `navigateItem(delta: -1 | 1)` — cycles systems or games depending on `view`
- `enterGames()` — `setView('games'); setGameIndex(0); playEnter()`
- `backToSystems()` — `setView('systems'); playTick()`
- `handleLaunch()` — calls `launchGame(game.id)` when in games view

**Responsibilities:**
- Load systems on mount via `useLibraryStore()`
- Render `AuroraSystemCarousel` when `view === 'systems'`
- Render `AuroraCarousel` when `view === 'games'`
- Poll gamepad: axis/d-pad → navigate; A → select/launch; B → back; Start → settings
- Pass `systems`, `games`, `gameIndex`, `systemIndex` down to subcomponents
- Render overlay (SettingsPage) when `currentPage === 'settings'`

**Background:**
```
- Layer 0: public/xbox-bg.jpg (backgroundSize: cover, backgroundPosition: center)
- Layer 1: Dark gradient overlay rgba(10,0,22,0.80)→rgba(12,0,18,0.72)→rgba(8,0,16,0.84)
- Layer 2: AuroraBokeh animated blobs
- Layer 3: Radial glow (center boost)
- Layer 20: HUD / info bar overlays (pointerEvents: none)
- Layer 22: Back-to-systems button (games view only)
```

**Layout:**
```jsx
<div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#0a0004' }}>
  <AuroraBokeh />                    {/* z-index: 0 */}
  <AuroraHUD systemIndex games />    {/* z-index: 10, position: absolute */}
  <AuroraCarousel ... />             {/* z-index: 5, center */}
  <CenterGlow />                     {/* radial gradient overlay, z-index: 1 */}
  <BottomBar title count />          {/* z-index: 10, position: absolute */}
  {currentPage === 'settings' && <SettingsOverlay />}
  <Toast />
</div>
```

---

### 3.2 AuroraCarousel (`AuroraCarousel.tsx`)

**Props:**
```typescript
interface AuroraCarouselProps {
  games: GameInfo[];
  focusedIndex: number;
  onNavigate: (delta: -1 | 1) => void;
}
```

**CoverFlow Transform Formula:**
```
For item at position p = index - focusedIndex:

const BOX_W     = 222;   // box width px (200 face + 22 spine)
const GAP       = 68;    // gap between items
const MAX_ANGLE = 62;    // max Y rotation degrees

xOffset  = p * (BOX_W + GAP)
angle    = p === 0 ? 0 : p < 0 ? MAX_ANGLE : -MAX_ANGLE
scale    = max(0.45, 1 - abs(p) * 0.12)
zDepth   = p === 0 ? 80 : -abs(p) * 35
opacity  = max(0.15, 1 - abs(p) * 0.13)
```

**AuroraBox3D sizes passed:** `width=200, height=280, depth=22`

**Container:**
```css
perspective: 900px;
perspective-origin: 50% 50%;
```

**Item wrapper CSS `transform`:**
```
translateX(xOffset px) rotateY(angle deg) scale(scale) translateZ(zDepth px)
```

**Render window:** Only render index range `[focusedIndex - 6, focusedIndex + 6]` for performance.

**Transition:** `all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)`

---

### 3.3 AuroraSystemCarousel (`AuroraSystemCarousel.tsx`)

**Props:**
```typescript
interface AuroraSystemCarouselProps {
  systems: SystemInfo[];
  focusedIndex: number;
  onNavigate: (delta: -1 | 1) => void;
}
```

**CoverFlow formula:** Same as `AuroraCarousel` but with `AuroraSystemBox`:
```
BOX_W = 222, GAP = 68, MAX_ANGLE = 60°
```

**Behavior:** Clicking a non-focused item navigates toward it (+1 or -1 delta).

---

### 3.4 AuroraSystemBox (`AuroraSystemBox.tsx`)

**Props:**
```typescript
interface AuroraSystemBoxProps {
  system: SystemInfo;
  focused: boolean;
  width?: number;  // default 200
  height?: number; // default 280
  depth?: number;  // default 22
}
```

**Front face contents:**
- Top color bar (system accent color, 8px)
- Centered `<SystemLogo>` at 80×80px
- System short name (bold, white)
- Game count badge: `{n} games`

**Left spine:** Vertical system name text on green gradient.

**Focus effect:** Glowing border using system accent color, `aurora-focus-ring` animation.

---

### 3.5 AuroraBox3D (`AuroraBox3D.tsx`)

**Props:**
```typescript
interface AuroraBox3DProps {
  game: GameInfo;
  media?: GameMedia | null;
  focused: boolean;
  width?: number;  // default 135
  height?: number; // default 190
  depth?: number;  // default 16
}
```

**DOM Structure:**
```
<div class="aurora-box-wrapper" style="transformStyle: preserve-3d">
  <!-- Front face: Z = +depth/2 -->
  <div class="aurora-box-front" style="transform: translateZ(8px)">
    <!-- Xbox 360 header (green bar) -->
    <div class="xbox-header">
      <XboxLogo /> XBOX 360
    </div>
    <!-- Box art or placeholder -->
    <img src={boxArt} />
    <!-- Focused: glow ring -->
  </div>

  <!-- Left spine: rotated left -->
  <div class="aurora-box-spine-left" style="
    width: depth;
    height: height;
    transform: rotateY(-90deg) translateZ(depth/2);
    transformOrigin: left center;
    background: xbox-green-gradient;
  ">
    <span style="writingMode: vertical-rl">XBOX 360 · {title}</span>
  </div>

  <!-- Right thin edge (dark) -->
  <div class="aurora-box-edge-right" style="
    width: depth;
    height: height;
    transform: rotateY(90deg);
    transformOrigin: right center;
    background: #0a0a0a;
  " />
</div>
```

**Xbox green colors:**
```
primary:  #107c10  (Microsoft Xbox green)
dark:     #0a5a0a
light:    #52b043
spine gradient: linear-gradient(90deg, #0a5a0a, #107c10, #0a5a0a)
```

**Focus effect (center box):**
- Box shadow: `0 0 40px rgba(16, 124, 16, 0.6), 0 0 80px rgba(16, 124, 16, 0.3)`
- Slightly increased brightness via filter

**Placeholder (no box art):**
- Dark background with system color
- Game title in white, centered
- System icon via `<SystemLogo />`

---

### 3.4 AuroraBokeh (`AuroraBokeh.tsx`)

**Implementation:** Pure CSS, no external libraries.

**Blobs (7 total):**
```
Blob positions and sizes (as % of viewport):
1. left:5%,  top:20%, size:300px, color: rgba(180,20,60,0.15),  animation: drift1 8s
2. left:15%, top:60%, size:200px, color: rgba(220,30,80,0.12),  animation: drift2 12s
3. left:40%, top:10%, size:400px, color: rgba(160,10,40,0.1),   animation: drift3 15s
4. left:60%, top:70%, size:250px, color: rgba(200,40,100,0.12), animation: drift1 10s
5. left:80%, top:30%, size:350px, color: rgba(180,20,60,0.13),  animation: drift2 9s
6. left:90%, top:75%, size:200px, color: rgba(240,60,120,0.1),  animation: drift3 14s
7. left:50%, top:50%, size:500px, color: rgba(140,5,30,0.08),   animation: drift1 20s
```

**Keyframes (aurora.css):**
```css
@keyframes aurora-drift1 {
  0%, 100% { transform: translate(0,0) scale(1); }
  33%       { transform: translate(30px, -20px) scale(1.05); }
  66%       { transform: translate(-20px, 15px) scale(0.97); }
}
@keyframes aurora-drift2 {
  0%, 100% { transform: translate(0,0) scale(1); }
  50%       { transform: translate(-40px, 25px) scale(1.08); }
}
@keyframes aurora-drift3 {
  0%, 100% { transform: translate(0,0) scale(1); }
  25%       { transform: translate(20px, 30px) scale(0.95); }
  75%       { transform: translate(-30px, -10px) scale(1.03); }
}
```

Each blob: `position: absolute`, `border-radius: 50%`, `filter: blur(60px)`, `pointer-events: none`

---

### 3.5 AuroraHUD (`AuroraHUD.tsx`)

**Top-left panel:**
```
[Avatar Icon 48px]  Username
                    Score1 / Score2
```

- Avatar: `<div>` with grid-pattern ghost icon (SVG) or colored circle with initials
- Username: from `config.general.username ?? 'Player 1'`  
- Score1 = total play_count across all games, Score2 = total games in system
- Colors: white text, dim secondary

**Top-right area:**
- Current system full name

**Bottom ticker:**
```
▌ XBOX 360  ◀ LB  |  RB ▶   ←/→ Navigate   A Launch   Start Settings ▐
```
Static or scrolling, very thin (28px), dark background, small white/gray text, green accents.

---

## 4. Data Flow

```
useLibraryStore() ─→ systems[], games[], loadSystems(), selectSystem(), launchGame()
useUiStore()      ─→ currentPage, navigateTo(), showToast()
useConfigStore()  ─→ config.general.theme, config.general.language
useGameMedia(id)  ─→ GameMedia { box_art, video, ... }   (per-box lazy loading)
```

**Game media loading strategy:**
- Each AuroraBox3D visible in window calls `useGameMedia(game.id)`
- This hook already handles lazy loading and caching via React Query
- Only load media for `[focusedIndex - 4, focusedIndex + 4]` to avoid 100s simultaneous calls

---

## 5. Performance Considerations

- Render only 13 items (focusedIndex ± 6)
- CSS `will-change: transform` on carousel items
- `contain: layout style paint` on bokeh layer
- Debounce gamepad navigation: 150ms
- `requestAnimationFrame` for gamepad polling, not `setInterval`

---

## 6. Theme Registration

```typescript
// src/themes/aurora/manifest.ts
import { registerTheme } from '../registry';
import { AuroraTheme } from './index';

registerTheme({
  id: 'aurora',
  nameKey: 'themes.auroraName',
  descKey: 'themes.auroraDesc',
  Component: AuroraTheme,
});
```

```typescript
// src/themes/index.ts — add:
import './aurora/manifest';
```

---

## 7. i18n Keys Required

Add to all locale files:
```json
"themes": {
  "auroraName": "Aurora",
  "auroraDesc": "Xbox 360 Aurora dashboard style with 3D cover flow carousel"
}
```
