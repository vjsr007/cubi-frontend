---
id: DES-XXX
title: "[Design Title]"
status: DRAFT  # DRAFT → IN_REVIEW → APPROVED → IMPLEMENTED
req: REQ-XXX  # Parent requirement
author: "[author]"
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [scanner, ui, backend, gamepad, theme, metadata, launcher]
---

# DES-XXX: [Design Title]

## Overview
Brief summary of the design approach and key decisions.

## Parent Requirement
- **REQ**: [REQ-XXX — Title](../requirements/REQ-XXX-slug.md)

## Architecture Decision

### Approach
Describe the chosen approach and why.

### Alternatives Considered
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Option A | ... | ... | **Selected** |
| Option B | ... | ... | Rejected |

## Data Models

### Rust (src-tauri)
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelName {
    pub id: String,
    pub field: Type,
}
```

### TypeScript (src)
```typescript
export interface ModelName {
  id: string;
  field: Type;
}
```

## API Design (Tauri Commands)

### Command: `command_name`
```rust
#[tauri::command]
async fn command_name(param: Type) -> Result<ReturnType, String> {
    // ...
}
```
**Frontend invocation:**
```typescript
const result = await invoke<ReturnType>('command_name', { param: value });
```

## Database Schema (if applicable)
```sql
CREATE TABLE IF NOT EXISTS table_name (
    id TEXT PRIMARY KEY,
    field TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
```

## UI Design (if applicable)

### Layout
```
┌─────────────────────────────────────┐
│ [Header / Navigation]               │
├────────┬────────────────────────────┤
│ Sidebar│ Main Content Area          │
│        │                            │
│        │                            │
└────────┴────────────────────────────┘
```

### Component Tree
```
PageComponent
├── HeaderComponent
├── FilterBar
│   ├── SystemSelector
│   └── SearchInput
└── ContentArea
    ├── GameGrid / GameList
    │   └── GameCard (repeated)
    └── Pagination / VirtualScroll
```

### Gamepad Navigation Flow
Describe how the user navigates with a gamepad.

## File Structure
```
New/modified files:
├── src-tauri/src/commands/feature.rs
├── src-tauri/src/services/feature_service.rs
├── src-tauri/src/models/feature_model.rs
├── src/components/feature/FeatureComponent.tsx
├── src/hooks/useFeature.ts
└── src/types/feature.ts
```

## Task Breakdown
| Task ID | Title | Estimate | Dependencies |
|---------|-------|----------|--------------|
| TASK-XXX-01 | [Task title] | S/M/L | — |
| TASK-XXX-02 | [Task title] | S/M/L | TASK-XXX-01 |
| TASK-XXX-03 | [Task title] | S/M/L | TASK-XXX-01 |

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| [Risk description] | High/Medium/Low | [How to mitigate] |

## Testing Strategy
- **Unit tests**: [What to unit test]
- **Integration tests**: [What to integration test]
- **Manual tests**: [How to manually verify]
