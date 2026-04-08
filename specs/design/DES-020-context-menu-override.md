---
id: DES-020
title: "Context Menu Override Design"
status: APPROVED
req: REQ-020
author: designer
created: 2026-03-30
updated: 2026-03-30
tags: [frontend, ux, input-handling]
---

# DES-020: Context Menu Override Design

## Overview
Disable the default HTML context menu globally and replace it with either nothing (simple approach) or a game-centric custom context menu (enhanced approach). Start with simple, upgrade if time permits.

## Simple Approach (Recommended First Phase)

### Implementation
1. Add global `contextmenu` event listener
2. Call `event.preventDefault()` on all right-click events
3. No visual feedback (menu just doesn't appear)

### React/TypeScript Code
```tsx
// App.tsx or dedicated hook
useEffect(() => {
  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };
  
  document.addEventListener('contextmenu', handleContextMenu, false);
  
  return () => {
    document.removeEventListener('contextmenu', handleContextMenu, false);
  };
}, []);
```

### Special Cases to Preserve
- **Text Input Fields**: Allow right-click → copy/paste in text inputs and search bars
- **Ctrl+C/Ctrl+V**: Continue to work everywhere (native keyboard shortcuts, unaffected)

## Enhanced Approach (Phase 2, Optional)

### Custom Context Menu Component
If desired, create a game-specific context menu that appears on right-click:

```tsx
interface ContextMenuOption {
  label: string;
  icon?: string;
  action: () => void;
  divider?: boolean;
}

// Example options for game cards
const gameContextMenu: ContextMenuOption[] = [
  { label: "Play", action: launchGame },
  { label: "Edit Details", action: openEditDialog },
  { divider: true },
  { label: "View in Folder", action: openGameFolder },
  { label: "Delete", action: deleteGameWithConfirm },
  { label: "Rescan Metadata", action: rescanGameMetadata },
];
```

### Menu Positioning
- Appear at mouse cursor position
- Adjust if near screen edge
- Close on click outside, ESC key, or after selection
- Gamepad: Right-trigger on game card shows menu, arrow keys navigate, enter selects

## Component Implementation

### `useContextMenuDisable.ts` (Hook)
```typescript
export function useContextMenuDisable(allowInInputs = true) {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Optional: Allow context menu in text inputs
      if (allowInInputs && isTextInput(e.target as HTMLElement)) {
        return;
      }
      e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu, false);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, false);
    };
  }, [allowInInputs]);
}

function isTextInput(element: HTMLElement): boolean {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element.contentEditable === 'true'
  );
}
```

### Usage in App
```tsx
// App.tsx
function App() {
  useContextMenuDisable(true); // Allow in text inputs
  
  return (
    // ... app content
  );
}
```

## File Changes

| File | Change | Complexity |
|------|--------|-----------|
| `src/App.tsx` | Add useContextMenuDisable hook | XS |
| `src/hooks/useContextMenuDisable.ts` | Create hook | XS |
| `src/components/common/ContextMenu.tsx` | Optional: Create custom menu component | S |
| `src/stores/uiStore.ts` | Optional: Add context menu state | XS |

## Browser Compatibility
- All modern browsers supported (Chrome, Firefox, Safari, Edge)
- IE not supported (acceptable for Tauri desktop app)

## Testing Checklist
- [ ] Right-click on game card → no browser menu appears
- [ ] Right-click in library view → no browser menu appears
- [ ] Right-click on text input → copy/paste still works (or browser menu appears)
- [ ] Ctrl+C/Ctrl+V work in all text fields
- [ ] No performance degradation with event listener

## Task Breakdown
| Task ID | Title | Est. |
|---------|-------|-----|
| TASK-020-01 | Create useContextMenuDisable hook | XS |
| TASK-020-02 | Integrate hook into App.tsx | XS |
| TASK-020-03 | Test context menu override | XS |
| TASK-020-04A | (Optional) Create custom menu component | S |
| TASK-020-04B | (Optional) Add menu positioning logic | S |
| TASK-020-04C | (Optional) Add gamepad menu navigation | M |
