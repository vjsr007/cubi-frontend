# /spec-review — Review an implementation against its spec

Review recently implemented code against its TASK spec for quality, compliance, and correctness.

## Instructions
1. Read the specified TASK document and its parent DES
2. Identify all files changed/created for this task
3. Use the Reviewer agent (`.claude/agents/reviewer.md`) to:
   - Check spec compliance (all acceptance criteria met)
   - Run code quality checks (conventions from CLAUDE.md)
   - Run security checks (path traversal, SQL injection, etc.)
   - Run test suite and report results
   - Check Tauri IPC type alignment
4. Output a structured review report
5. If APPROVE: update TASK status to REVIEWED
6. If REQUEST_CHANGES: list specific changes needed

## Arguments
$TASK_ID — The task ID (e.g., TASK-001-01) to review

## Example
```
/spec-review TASK-001-01
```
