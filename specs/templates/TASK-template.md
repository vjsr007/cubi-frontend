---
id: TASK-XXX-YY
title: "[Task Title]"
status: NOT_STARTED  # NOT_STARTED → IN_PROGRESS → DONE → REVIEWED
des: DES-XXX  # Parent design
req: REQ-XXX  # Root requirement
author: "[author]"
created: YYYY-MM-DD
updated: YYYY-MM-DD
estimate: S  # S (< 1hr) | M (1-4hr) | L (4-8hr) | XL (> 8hr)
depends_on: []  # [TASK-XXX-YY, ...]
tags: [rust, typescript, ui, api, db, test]
---

# TASK-XXX-YY: [Task Title]

## Context
Brief description of what this task accomplishes within the larger design.

## Parent Design
- **DES**: [DES-XXX — Title](../design/DES-XXX-slug.md)

## Acceptance Criteria
- [ ] [Specific, testable criterion with clear pass/fail]
- [ ] [Specific, testable criterion with clear pass/fail]
- [ ] [Specific, testable criterion with clear pass/fail]

## Implementation Notes
Guidance for the implementor — suggested approach, relevant code patterns, gotchas.

### Files to Create/Modify
| File | Action | Description |
|------|--------|-------------|
| `src-tauri/src/...` | CREATE | New module for ... |
| `src/components/...` | MODIFY | Add ... to ... |

### Key Code Patterns
```rust
// Example pattern to follow
```

## Test Plan
| Test | Type | Description |
|------|------|-------------|
| `test_feature_happy_path` | Unit | Verifies normal operation |
| `test_feature_error_case` | Unit | Verifies error handling |
| `test_feature_edge_case` | Unit | Verifies edge case |

## Definition of Done
- [ ] All acceptance criteria pass
- [ ] Tests written and passing
- [ ] No compiler warnings (Rust) or lint errors (TypeScript)
- [ ] CLAUDE.md conventions followed
- [ ] Committed with message: `feat(module): description [TASK-XXX-YY]`

---

## Completion Log
<!-- Filled by implementor upon completion -->
**Completed**: YYYY-MM-DD  
**Files changed**: 
- `path/to/file.rs` — description of change
**Notes**: Any relevant implementation decisions
**Review**: [TASK-XXX-YY reviewed](link to review)
