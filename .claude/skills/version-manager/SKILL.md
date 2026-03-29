---
name: version-manager
description: Domain knowledge for managing versions and releases in cubi-frontend — which files to update, semver conventions, git tagging, and CI/CD trigger mechanics
---

# Version Manager — Domain Knowledge

## Version Files

Cubi Frontend maintains the version in **three files simultaneously**. All three MUST match before creating a release tag.

### 1. `package.json` (root)
```json
{
  "version": "X.Y.Z"
}
```

### 2. `src-tauri/Cargo.toml`
```toml
[package]
version = "X.Y.Z"
```
> Only the `[package]` section — do not edit workspace or dependency versions.

### 3. `src-tauri/tauri.conf.json`
```json
{
  "version": "X.Y.Z"
}
```
> This is the version shown in the About dialog and used by `tauri-action` to name release artifacts.

---

## Semver Conventions for This Project

| Bump | When to use | Example |
|---|---|---|
| **patch** | Bug fixes, typos, minor UI tweaks that don't add features | `0.1.0` → `0.1.1` |
| **minor** | New features (new theme, new emulator support, new settings screen) | `0.1.0` → `0.2.0` |
| **major** | Breaking changes — config file format changes, data migration required | `0.1.0` → `1.0.0` |

Pre-release tags use the format `vX.Y.Z-beta.N` or `vX.Y.Z-rc.N`. The release workflow marks these as pre-releases automatically (detected by the `-` character in the tag name).

---

## Git Tag Format

Tags MUST follow this format exactly:

```
vX.Y.Z
```

Examples: `v0.1.0`, `v0.2.0`, `v1.0.0`, `v0.1.1`, `v0.2.0-beta.1`

The leading `v` is required — the GitHub Actions workflow trigger matches `v[0-9]+.[0-9]+.[0-9]+*`.

---

## Release Workflow Trigger

**Pushing a tag triggers the CI/CD build.** No manual workflow dispatch needed.

```bash
git push origin main --tags
# or just push the tag:
git push origin vX.Y.Z
```

The `.github/workflows/release.yml` workflow then:
1. Runs 4 parallel jobs (Windows, macOS x64, macOS arm64, Linux)
2. Builds the Tauri app for each platform
3. Creates/updates the GitHub Release at `https://github.com/vjsr007/cubi-frontend/releases/tag/vX.Y.Z`
4. Uploads artifacts: `.msi`, `.dmg` (×2), `.AppImage`, `.deb`

---

## Version Bump Procedure

### Step 1 — Check current state
```bash
git status               # Must be clean (no uncommitted changes)
git log --oneline -5     # Verify you're on main and up to date
```

### Step 2 — Determine new version
Read current version from any of the three files (they should match). Decide: patch / minor / major.

### Step 3 — Edit all three files
Update `version` in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`.

### Step 4 — Commit the version bump
```bash
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "chore(release): bump version to vX.Y.Z [REQ-014]"
```

### Step 5 — Create and push the tag
```bash
git tag vX.Y.Z
git push origin main --tags
```

### Step 6 — Monitor the build
Go to: `https://github.com/vjsr007/cubi-frontend/actions`
Expected build time: ~15–25 minutes (all 4 platforms in parallel).

### Step 7 — Verify the release
Go to: `https://github.com/vjsr007/cubi-frontend/releases/tag/vX.Y.Z`
Confirm all 5+ artifacts are present.

---

## Artifact Names (expected output)

After a successful build of `vX.Y.Z`:

| Platform | Expected files |
|---|---|
| Windows | `Cubi Frontend_X.Y.Z_x64_en-US.msi`, `Cubi Frontend_X.Y.Z_x64-setup.exe` |
| macOS Intel | `Cubi Frontend_X.Y.Z_x64.dmg` |
| macOS ARM | `Cubi Frontend_X.Y.Z_aarch64.dmg` |
| Linux | `cubi-frontend_X.Y.Z_amd64.AppImage`, `cubi-frontend_X.Y.Z_amd64.deb` |

---

## Common Problems

| Problem | Solution |
|---|---|
| Tag already exists | `git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z` — then re-tag |
| Version files out of sync | Read all three, pick the correct version, edit the outlier(s), re-commit |
| Build fails on Linux | Usually missing system deps — check the `apt-get install` step in the workflow |
| macOS arm64 build fails | Ensure `aarch64-apple-darwin` target is listed in `dtolnay/rust-toolchain` |
