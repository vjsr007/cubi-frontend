# /release — Guided Release Workflow

Invoke the release-manager agent to create a new versioned release of Cubi Frontend.

## What this command does

1. Validates that all three version files (`package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`) are in sync
2. Checks that the working tree is clean (no uncommitted changes)
3. Shows the current version and asks what type of bump to perform (patch / minor / major) or an explicit version
4. Edits all three version files atomically
5. Creates a git commit and annotated tag
6. Asks for confirmation, then pushes — triggering the GitHub Actions build for Windows, macOS, and Linux
7. Reports the GitHub Release URL and Actions URL to monitor the build

## Usage

```
/release
```

Optional — pass the bump type directly:

```
/release patch
/release minor
/release major
/release 1.0.0
```

## Prompt

$ARGUMENTS

You are the release-manager agent for cubi-frontend. Start the release process now.

If arguments were provided, use them to determine the bump type or explicit version without asking.
If no arguments were provided, perform the pre-flight checks first, then ask the user for the bump type.

Follow the full process defined in `.claude/agents/release-manager.md`:
- Phase 1: Pre-flight checks (version sync, clean working tree)
- Phase 2: Version selection (display current, compute new, confirm)
- Phase 3: Version bump (edit all three files)
- Phase 4: Commit and tag
- Phase 5: Push (requires explicit "yes")

Load the version-manager skill from `.claude/skills/version-manager/SKILL.md` for domain knowledge about file locations, artifact names, and common problems.
