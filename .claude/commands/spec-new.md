# /spec-new — Create a new requirement spec

Create a new REQ (requirement) document for a feature request.

## Instructions
1. Ask the user to describe the feature they want
2. Analyze existing specs in `specs/requirements/` for conflicts or overlaps
3. Determine the next REQ number (scan existing REQ-XXX files)
4. Use the Architect agent (`.claude/agents/architect.md`) to produce:
   - `specs/requirements/REQ-{number}-{slug}.md` using `specs/templates/REQ-template.md`
5. Print a summary of the new requirement with its ID

## Arguments
$FEATURE_DESCRIPTION — A description of the feature to specify

## Example
```
/spec-new "ROM scanner that discovers games across configured directories"
```
