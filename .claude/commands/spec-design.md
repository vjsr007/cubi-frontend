# /spec-design — Create a design document from a requirement

Take an existing REQ and produce a DES (design) document with architecture, data models, and API contracts.

## Instructions
1. Read the specified REQ document from `specs/requirements/`
2. Analyze the existing codebase and other DES documents for integration points
3. Determine the next DES number
4. Use the Architect agent (`.claude/agents/architect.md`) to produce:
   - `specs/design/DES-{number}-{slug}.md` using `specs/templates/DES-template.md`
5. Automatically generate TASK breakdown documents in `specs/tasks/`
6. Print summary of DES and all generated TASKs

## Arguments
$REQ_ID — The requirement ID (e.g., REQ-001) to design a solution for

## Example
```
/spec-design REQ-001
```
