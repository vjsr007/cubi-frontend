---
id: DES-009
title: "System Logos Integration"
status: APPROVED
req: REQ-009
author: "copilot"
created: 2026-03-28
updated: 2026-03-28
tags: [ui, theme, media]
---

# DES-009: System Logos Integration

## Overview
Download SVG system logos from the CC0-licensed `canvas-es-de` theme repository, bundle them as static assets via Vite's import system, and create a `SystemLogo` component that replaces text labels in both the Default and HyperSpin themes.

## Parent Requirement
- **REQ**: [REQ-009 — System Logos](../requirements/REQ-009-system-logos.md)

## Architecture Decision

### Approach
Bundle SVGs as static imports in a barrel module (`src/assets/system-logos/index.ts`). A `SystemLogo` component maps `systemId` → SVG URL and renders an `<img>` tag with CSS filters for theme adaptability. Text fallback for unknown systems.

### Alternatives Considered
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Static imports via barrel module | Build-time bundled, tree-shakeable, typed, fast | Adds ~200KB to bundle | **Selected** |
| Runtime fetch from GitHub CDN | Zero bundle size | Network-dependent, slow, offline-broken | Rejected |
| Inline SVG React components | Full CSS control, currentColor | 40+ component files, large bundle | Rejected |
| Tauri asset protocol from data folder | User-configurable | Requires file management, complex | Rejected |

## File Structure

```
src/assets/system-logos/
├── index.ts                  # Barrel: exports Record<string, string> mapping systemId → URL
├── nes.svg
├── snes.svg
├── n64.svg
├── gb.svg
├── gbc.svg
├── gba.svg
├── nds.svg
├── gamecube.svg              # Downloaded as gc.svg, renamed
├── wii.svg
├── wiiu.svg
├── switch.svg
├── ps1.svg                   # Downloaded as psx.svg, renamed
├── ps2.svg
├── ps3.svg
├── psp.svg
├── psvita.svg
├── ps4.svg
├── genesis.svg
├── mastersystem.svg
├── saturn.svg
├── dreamcast.svg
├── xbox.svg
├── xbox360.svg
├── arcade.svg
├── 3ds.svg                   # Downloaded as n3ds.svg, renamed
├── gamegear.svg
├── atari2600.svg
├── atari5200.svg
├── atari7800.svg
├── pcengine.svg
├── neogeo.svg
├── ngpc.svg
├── mame.svg
├── fbneo.svg
├── sg1000.svg                # Downloaded as sg-1000.svg, renamed
├── colecovision.svg
├── intellivision.svg
├── wswan.svg                 # Downloaded as wonderswan.svg, renamed
└── wswanc.svg                # Downloaded as wonderswancolor.svg, renamed

src/components/common/
└── SystemLogo.tsx            # Reusable component
```

## Component Design

### SystemLogo Component
```tsx
interface SystemLogoProps {
  systemId: string;
  size?: number;          // height in px (width auto)
  className?: string;
  fallbackText?: string;  // shown if no logo
  style?: React.CSSProperties;
}

export function SystemLogo({ systemId, size = 32, fallbackText, style }: SystemLogoProps) {
  const logoUrl = SYSTEM_LOGOS[systemId];
  if (!logoUrl) {
    return <span>{fallbackText ?? systemId.toUpperCase()}</span>;
  }
  return (
    <img
      src={logoUrl}
      alt={`${systemId} logo`}
      style={{ height: size, width: 'auto', ...style }}
      draggable={false}
    />
  );
}
```

## Integration Points

### 1. Default Theme — SystemList Sidebar
Replace the colored dot + text with a small logo (20px height) + game count. Keep text name as secondary.

### 2. HyperSpin Theme — WheelCarousel
Replace the text `<span>` inside `OvalBadge` with `<SystemLogo>` (28px). The oval badge background stays; the logo fills the center.

### 3. HyperSpin Theme — PreviewPanel
Show the system logo (48px) in the info area below the CRT frame when in system-selection mode, replacing or supplementing the `<h2>` system name.

## CSS Strategy
SVG logos from canvas-es-de are typically white or light-colored on transparent backgrounds. Apply:
- Default theme (dark): `filter: brightness(0.9)` — subtle dimming
- Default theme (active): `filter: brightness(1)` — full brightness
- HyperSpin (focused): `filter: drop-shadow(0 0 8px rgba(243,156,18,0.6))` — glow effect
- HyperSpin (unfocused): `filter: brightness(0.6)` — dimmed

## Task Breakdown
| Task | Description | Estimate |
|------|-------------|----------|
| TASK-009-01 | Download SVGs + create barrel module | S |
| TASK-009-02 | Create SystemLogo component | S |
| TASK-009-03 | Integrate into Default theme SystemList | S |
| TASK-009-04 | Integrate into HyperSpin WheelCarousel + PreviewPanel | M |
