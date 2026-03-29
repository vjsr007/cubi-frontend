# REQ-014 — Release Management & CI/CD Build System

## Status
`DRAFT`

## Summary
Automated multi-platform build and release pipeline that produces distributable installers for Windows, macOS, and Linux whenever a new version is tagged. Includes a versioning workflow, GitHub Actions CI/CD, and tooling for the development team (Claude agents + skills) to manage releases consistently.

## Motivation
Currently the project has no automated build pipeline. Releases must be built manually per platform, which is error-prone and requires each platform's toolchain locally. There is no standard process for bumping versions across the three version files (`package.json`, `Cargo.toml`, `tauri.conf.json`), creating changelogs, or publishing GitHub Releases with downloadable installers.

## Goals
1. **Multi-platform builds** — Produce native installers for Windows (`.msi`), macOS Intel (`.dmg`), macOS ARM (`.dmg`), and Linux (`.AppImage`, `.deb`) from a single tag push.
2. **Automated GitHub Release** — Installers are automatically uploaded to a GitHub Release with a generated release body.
3. **Version consistency** — Single source of truth for version; all three version files stay in sync.
4. **Developer tooling** — A `release-manager` Claude agent and `version-manager` skill guide the team through the release process without forgetting steps.
5. **README download links** — The README prominently links to the latest release for each platform.

## Non-Goals
- Code signing (macOS notarization, Windows EV certificate) — future work
- Auto-update via Tauri updater — future work
- Publishing to package managers (winget, Homebrew, AUR) — future work
- CHANGELOG auto-generation from commits — future work

## Acceptance Criteria
- [ ] Pushing a tag `vX.Y.Z` triggers a GitHub Actions workflow that builds all platforms in parallel
- [ ] The workflow uploads `.msi`, `.dmg` (x64 + arm64), `.AppImage`, and `.deb` to the GitHub Release
- [ ] A `release-manager` agent exists that can bump versions, commit, tag, and push
- [ ] A `version-manager` skill provides domain knowledge about the release process
- [ ] The README has a Download section with platform-specific badges/links
- [ ] A `/release` slash command guides the user through the release process

## Linked Specs
- DES-014 — Release Management Design
