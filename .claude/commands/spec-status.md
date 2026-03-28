# /spec-status — Show the status of all specs and tasks

Display a dashboard of all specs, their status, and progress.

## Instructions
1. Scan `specs/requirements/` for all REQ documents
2. Scan `specs/design/` for all DES documents
3. Scan `specs/tasks/` for all TASK documents
4. Parse the status field from each document's YAML frontmatter
5. Output a formatted status table:

```
## Spec Status Dashboard

### Requirements
| ID | Title | Status | DES | Tasks |
|----|-------|--------|-----|-------|
| REQ-001 | ROM Scanner | APPROVED | DES-001 | 4/4 ✓ |
| REQ-002 | Game Library UI | IN_REVIEW | DES-002 | 2/6 |

### Active Tasks  
| ID | Title | Status | Assigned |
|----|-------|--------|----------|
| TASK-002-03 | Grid component | IN_PROGRESS | — |
| TASK-002-04 | List component | NOT_STARTED | — |

### Summary
- Requirements: 2 total, 1 approved, 1 in review
- Designs: 2 total, 1 complete, 1 in progress
- Tasks: 10 total, 6 done, 1 in progress, 3 not started
- Progress: 60%
```
