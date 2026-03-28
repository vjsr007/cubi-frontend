# /spec-implement — Implement a task from specs

Take a TASK document and implement it following the spec, writing code and tests.

## Instructions
1. Read the specified TASK document from `specs/tasks/`
2. Read the parent DES document for architectural context
3. Read CLAUDE.md for conventions
4. Use the Implementor agent (`.claude/agents/implementor.md`) to:
   - Write failing tests first
   - Implement the minimum code to satisfy acceptance criteria
   - Run tests to verify
5. Update the TASK document status to DONE
6. Prepare a git commit with the conventional message format

## Arguments
$TASK_ID — The task ID (e.g., TASK-001-01) to implement

## Example
```
/spec-implement TASK-001-01
```
