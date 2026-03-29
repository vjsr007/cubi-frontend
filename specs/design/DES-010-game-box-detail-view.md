---
id: DES-010
title: "Game Box 3D Detail View"
status: APPROVED
req: REQ-010
author: "copilot"
created: 2026-03-28
updated: 2026-03-28
tags: [ui, theme, media]
---

# DES-010: Game Box 3D Detail View

## Overview
Build a 3D CSS game box case component that displays front/back cover art with a flip animation, integrated into a redesigned GameDetailPage with video preview, metadata, and launch controls. Also improve GameCard image fallback chain.

## Parent Requirement
- **REQ**: [REQ-010 — Game Box 3D Detail View](../requirements/REQ-010-game-box-detail-view.md)

## Architecture Decision

### Approach
Pure CSS 3D transforms with React state for flip toggle. No external 3D library needed — CSS `perspective`, `rotateY`, `backface-visibility: hidden` handle the flip. Framer Motion for entrance animations. Media loaded via existing `useGameMedia` hook.

### Alternatives Considered
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| CSS 3D transforms | GPU-accelerated, no deps, lightweight | Limited to rectangular shapes | **Selected** |
| Three.js/R3F | True 3D, lighting effects | Overkill for a box flip, heavy bundle | Rejected |
| Framer Motion 3D | Unified animation API | Still CSS transforms under hood, extra API | Rejected — use Framer only for entrance |

## UI Design

### Layout (Desktop)
```
┌──────────────────────────────────────────────────────┐
│ ← Back to Library                                     │
├──────────────────────────────────────────────────────┤
│                                                       │
│   ┌─────────────────┐    ┌──────────────────────┐    │
│   │                 │    │ Title                  │    │
│   │   3D Game Box   │    │ Year · Genre · Dev    │    │
│   │   (click flip)  │    │                       │    │
│   │                 │    │ Description...         │    │
│   │                 │    │                       │    │
│   │  spine │ front  │    │ ┌──────┬──────┬──────┐│    │
│   │        │        │    │ │Plays │Last  │Rating││    │
│   │        │        │    │ │Count │Played│      ││    │
│   │        │        │    │ └──────┴──────┴──────┘│    │
│   └─────────────────┘    │                       │    │
│                          │ ▶ Launch Game          │    │
│   ┌─────────────────┐    │                       │    │
│   │  Video Preview   │    │ File: name.rom       │    │
│   │  (if available)  │    │ Size: 123 MB         │    │
│   └─────────────────┘    └──────────────────────┘    │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### 3D Box Structure
```
CSS perspective container (800px)
└── Box wrapper (preserve-3d, transition: rotateY)
    ├── Front face (box_art image, backface-visibility: hidden)
    ├── Back face (back_cover or metadata, rotateY(180deg))
    ├── Spine left (thin side, rotateY(-90deg), translateZ)
    └── Spine right (thin side, rotateY(90deg), translateZ)
```

### Box Dimensions
- Box face: 280px × 380px (≈ 3:4 aspect ratio, like a game case)
- Spine width: 20px (typical DVD/game case spine)
- Perspective: 1000px from parent container

### Flip Interaction
- Click anywhere on the box → toggle flip state
- Flip: `transform: rotateY(180deg)` with `transition: 0.6s ease-in-out`
- Visual hint: subtle hover shadow change + cursor pointer

### Fallback Strategy
| Media | Available | Fallback |
|-------|-----------|----------|
| box_art | Yes | Show on front face |
| box_art | No | Styled placeholder with title + system logo |
| back_cover | Yes | Show on back face |
| back_cover | No | Dark panel with metadata (description, details) |
| video | Yes | Auto-playing video preview below box |
| video | No | Hide video section entirely |

## Component Tree
```
GameDetailPage (rebuilt)
├── BackButton
├── DetailLayout (flex row)
│   ├── LeftColumn
│   │   ├── GameBoxCase (new component)
│   │   │   ├── BoxFront (box_art or placeholder)
│   │   │   ├── BoxBack (back_cover or metadata)
│   │   │   ├── BoxSpineLeft
│   │   │   └── BoxSpineRight
│   │   └── VideoPreview (conditionally shown)
│   └── RightColumn
│       ├── GameTitle + Subtitle
│       ├── Description
│       ├── StatsGrid (play count, last played, rating)
│       ├── LaunchButton
│       └── FileInfo
└── KeyboardHandler (Escape, Enter, Space)
```

## File Structure
```
New/modified files:
├── src/components/library/GameBoxCase.tsx   # NEW — 3D box component
├── src/pages/GameDetailPage.tsx             # MODIFY — complete rewrite
├── src/components/library/GameCard.tsx      # MODIFY — improve fallback chain
```

## Task Breakdown
| Task ID | Title | Estimate | Dependencies |
|---------|-------|----------|--------------|
| TASK-010-01 | Create GameBoxCase 3D component | M | — |
| TASK-010-02 | Rebuild GameDetailPage with box + video + metadata | M | TASK-010-01 |
| TASK-010-03 | Improve GameCard fallback chain | S | — |

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| CSS 3D not smooth on some GPUs | Medium | Use `will-change: transform`, test with devtools |
| Back cover rarely available | Low | Always show metadata fallback, looks good without image |
| Video autoplay blocked | Low | Muted autoplay is allowed; existing VideoPreview handles this |

## Testing Strategy
- **Unit tests**: GameBoxCase renders front/back, toggles flip state
- **Manual tests**: Click to flip, keyboard shortcuts, media fallbacks, launch button
