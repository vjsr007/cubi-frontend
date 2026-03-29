# REQ-013 — Aurora Xbox 360 Theme

## Status: APPROVED
## Author: vjsr007
## Date: 2026-03-29

---

## 1. Background

Aurora is the most popular custom dashboard for modified Xbox 360 consoles. Its iconic interface features a horizontal CoverFlow-style 3D carousel of game boxes rendered as physical Xbox 360 cases, set against a dark maroon bokeh background. This requirement specifies replicating that visual experience for the cubi-frontend theme engine using existing game metadata and media.

## 2. Goals

- G1: Implement an "Aurora" theme selectable from Settings
- G2: Render game boxes as 3D Xbox 360 cases in a CoverFlow carousel
- G3: Display bokeh-style animated background (dark maroon/magenta)
- G4: Show user HUD (top-left) and game title/count (bottom center)
- G5: Support full gamepad navigation (Left/Right = games, LB/RB = systems)
- G6: Use scraped box art on the front face of each 3D box
- G7: Show Xbox 360 green spine and header branding on each case

## 3. Non-Goals

- NOT recreating Aurora's achievement tracking or marketplace integration
- NOT network features (friends, downloads)
- NOT full Xbox 360 UI look-alike — inspired-by, not pixel-perfect clone

## 4. Functional Requirements

### FR-001: Theme Registration
The Aurora theme MUST be registered in the theme registry and appear in Settings theme picker.

### FR-002: CoverFlow 3D Carousel
- Display game boxes in a 3D CoverFlow layout (horizontal arc)
- Center box: frontal, largest, highest Z, fully lit
- Side boxes: rotated on Y axis (±50–65°), smaller, darker with depth
- Minimum 9 visible items (4 on each side + center)
- Smooth CSS transition (transform + opacity) on navigation

### FR-003: 3D Box Art Rendering
- Each box MUST be rendered as a 3D cuboid with:
  - Front face: Xbox 360 green header bar + scraped box art (or placeholder)
  - Left spine: green gradient with "XBOX 360" text + game title
  - Right spine (optional): dark edge
- Xbox 360 proportions: ~135:190 (W:H), spine depth ~16px

### FR-004: Background
- Base: near-black maroon (#1a0010 to #0d0005)
- Animated bokeh circles: semi-transparent warm reds/magentas/pinks
- Subtle radial glow behind center carousel area

### FR-005: User HUD (top-left)
- Avatar placeholder (pixel-art style or generic icon)
- Player name from config (default "Player 1")
- Two scores with `/` separator (total_plays / total_games styled as gamerscore)

### FR-006: System Selector (top center / overlay)
- Show current system name with Xbox 360 logo
- LB/RB buttons (or Q/E) navigate between systems
- Visual system name display near top

### FR-007: Info Bar (bottom center)
- Game title of currently focused box
- "N de Total" count (e.g. "7 de 172")
- Subtle glow under title text

### FR-008: Ticker (bottom strip)
- Static or slowly scrolling ticker showing system name and controls hint
- Style: thin dark strip at very bottom edge

### FR-009: Gamepad Navigation
- Left stick / D-pad left-right: navigate carousel
- Left/Right bumper (buttons 4/5): cycle systems
- A button (button 0): launch game
- B button (button 1): back to systems
- Start/Select: open settings
- Keyboard fallback: ←/→ arrows, Q/E systems, Enter launch, Esc settings

### FR-010: Settings Overlay
- Pressing Settings opens the SettingsPage as an overlay (same pattern as HyperSpin theme)
- Aurora styling: dark overlay with Xbox 360 branding accent color

## 5. Visual Acceptance Criteria

- [ ] Bokeh background visible with warmly-colored light blobs
- [ ] Center box is clearly the largest, most visible
- [ ] Carousel animates smoothly (no janky cuts) on left/right navigation
- [ ] Box art appears on front face of 3D boxes
- [ ] Green Xbox spine visible on side-rotated boxes
- [ ] Game title updates when focus changes
- [ ] System name visible at top
- [ ] "N de Total" count accurate
