# DES-014 — Release Management & CI/CD Build System

## Status
`APPROVED`

## Linked Requirement
REQ-014 — Release Management & CI/CD Build System

## Overview
The release system is composed of four parts:
1. **GitHub Actions workflow** (`.github/workflows/release.yml`) — triggered by `v*` tags, builds 4 platform targets in parallel using `tauri-apps/tauri-action`, uploads artifacts to GitHub Release
2. **Version bump script** (manual + agent-guided) — updates `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json` atomically, then commits + tags
3. **Claude release-manager agent** — orchestrates the full release ritual interactively
4. **Claude version-manager skill** — domain knowledge injected when performing version or release tasks

---

## Architecture

### 1. GitHub Actions Workflow

**File:** `.github/workflows/release.yml`

**Trigger:** `push` on tags matching `v[0-9]+.[0-9]+.[0-9]+*`

**Matrix strategy:**

| Runner | Rust target | Output artifacts |
|---|---|---|
| `windows-latest` | `x86_64-pc-windows-msvc` | `.msi`, `.exe` (NSIS) |
| `macos-latest` | `x86_64-apple-darwin` | `.dmg` (Intel) |
| `macos-latest` | `aarch64-apple-darwin` | `.dmg` (Apple Silicon) |
| `ubuntu-22.04` | `x86_64-unknown-linux-gnu` | `.AppImage`, `.deb` |

**Steps per job:**
1. `actions/checkout@v4`
2. (Ubuntu only) Install WebKit2GTK + libappindicator3 + librsvg2
3. `actions/setup-node@v4` (LTS)
4. `dtolnay/rust-toolchain@stable` with correct cross-compile targets
5. `swatinem/rust-cache@v2` (keyed on `src-tauri/Cargo.lock`)
6. `npm ci`
7. `tauri-apps/tauri-action@v0` — builds + creates/updates GitHub Release

**Release metadata:**
```
releaseName: "Cubi Frontend v__VERSION__"
releaseBody: auto-generated list of artifacts + install instructions
releaseDraft: false
prerelease: false
```

### 2. Version Bump Process

Three files must stay in sync — all must have the same `version` value:

| File | Field |
|---|---|
| `package.json` | `"version": "X.Y.Z"` |
| `src-tauri/Cargo.toml` | `version = "X.Y.Z"` under `[package]` |
| `src-tauri/tauri.conf.json` | `"version": "X.Y.Z"` |

**Bump steps:**
1. Determine new version (semver: major/minor/patch)
2. Edit all three files
3. `git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json`
4. `git commit -m "chore(release): bump version to vX.Y.Z [REQ-014]"`
5. `git tag vX.Y.Z`
6. `git push origin main --tags`

### 3. release-manager Agent

**File:** `.claude/agents/release-manager.md`

**Responsibilities:**
- Determine the current version from `tauri.conf.json`
- Propose the next version based on user input (major/minor/patch)
- Validate that all three version files are currently in sync
- Perform the bump atomically (read → edit → commit → tag)
- Confirm before pushing (push triggers CI build)
- Report the GitHub Release URL after the tag is pushed

**Guardrails:**
- Never push without explicit user confirmation
- Abort if there are uncommitted changes in the working tree
- Abort if the proposed tag already exists remotely

### 4. version-manager Skill

**File:** `.claude/skills/version-manager/SKILL.md`

Provides:
- Knowledge of which files contain the version
- Semver rules for this project (patch = bug fix, minor = new feature, major = breaking change)
- Git tag format: `vX.Y.Z`
- CI/CD trigger: tag push automatically starts the build matrix

### 5. README Download Section

Added immediately after the project description, before Features:

```markdown
## Download

| Platform | Installer |
|---|---|
| Windows | [📥 Download .msi](https://github.com/vjsr007/cubi-frontend/releases/latest) |
| macOS (Apple Silicon) | [📥 Download .dmg](https://github.com/vjsr007/cubi-frontend/releases/latest) |
| macOS (Intel) | [📥 Download .dmg](https://github.com/vjsr007/cubi-frontend/releases/latest) |
| Linux | [📥 Download .AppImage](https://github.com/vjsr007/cubi-frontend/releases/latest) |

> Latest release badge and changelogs: [Releases page](https://github.com/vjsr007/cubi-frontend/releases)
```

---

## Task Breakdown

| Task | Description |
|---|---|
| TASK-014-01 | Create `.github/workflows/release.yml` multiplatform CI/CD workflow |
| TASK-014-02 | Create `version-manager` skill (`SKILL.md`) |
| TASK-014-03 | Create `release-manager` agent (`release-manager.md`) |
| TASK-014-04 | Update `README.md` with Download section and version badge |
| TASK-014-05 | Create `/release` slash command (`release.md`) |

---

## Security Considerations
- The workflow uses `GITHUB_TOKEN` (auto-provisioned) with `contents: write` — no PAT required
- No secrets are stored beyond `GITHUB_TOKEN`
- Build artifacts are not signed in this version (tracked in REQ-015 future)

## Testing Strategy
- Verify workflow syntax with `actionlint` (can run locally)
- Dry-run: create a `v0.0.0-test` pre-release tag, verify all 4 matrix jobs succeed
- Verify artifact names match expected patterns
