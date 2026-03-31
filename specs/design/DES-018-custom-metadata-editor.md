---
id: DES-018
title: "Custom Game Metadata Editor"
status: APPROVED
req: REQ-018
author: "vjsr007"
created: 2026-03-30
updated: 2026-03-30
tags: [metadata, ui, media, backend]
---

# DES-018: Custom Game Metadata Editor

## Overview
Add a metadata editing system to GameDetailPage allowing users to manually edit text fields, upload/import images, and download YouTube videos for any game. Leverages existing `GameInfoPatch` + `patch_game()` DB infrastructure for text updates, adds new Tauri commands for media import (local file copy, URL download, YouTube/yt-dlp download), and a new editor UI panel that slides into the detail page.

## Parent Requirement
- **REQ**: [REQ-018 — Custom Game Metadata Editor](../requirements/REQ-018-custom-metadata-editor.md)

## Architecture Decision

### Approach
Extend the existing GameDetailPage with an "Edit Mode" toggle. When active, text fields become editable inputs and media slots show upload/replace controls. All changes are staged locally and saved on explicit "Save" action via the existing `patch_game()` DB method. Media files are copied/downloaded to the app data folder using new Tauri commands.

### Alternatives Considered
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Edit mode in GameDetailPage | Minimal new pages, familiar context | Page gets more complex | **Selected** |
| Separate MetadataEditorPage | Clean separation | Extra navigation, duplicated layout | Rejected |
| Modal dialog editor | Non-destructive | Limited space for media previews | Rejected |

## Data Models

### Rust — New Commands (no new models needed)

Reuses existing `GameInfoPatch` for text updates. New structs for media operations:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaImportResult {
    pub saved_path: String,       // Local path where file was saved
    pub media_type: String,       // "box_art", "hero_art", etc.
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YoutubeSearchResult {
    pub video_id: String,
    pub title: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoDownloadProgress {
    pub game_id: String,
    pub status: String,           // "downloading", "encoding", "done", "error"
    pub progress_pct: Option<f32>,
    pub error: Option<String>,
}
```

### TypeScript — New Types

```typescript
export interface MediaImportResult {
  saved_path: string;
  media_type: string;
}

export interface YoutubeSearchResult {
  video_id: string;
  title: string;
  url: string;
}
```

## API Design (Tauri Commands)

### Command: `update_game_metadata`
Save text field changes to database.
```rust
#[tauri::command]
pub async fn update_game_metadata(
    db: State<'_, Database>,
    game_id: String,
    patch: GameInfoPatch,
) -> Result<GameInfo, String>
```

### Command: `import_media_file`
Copy a local file to the app media folder and return the saved path.
```rust
#[tauri::command]
pub async fn import_media_file(
    app: AppHandle,
    db: State<'_, Database>,
    game_id: String,
    source_path: String,
    media_type: String,       // "box_art" | "hero_art" | "logo" | "background_art" | "screenshot" | "fan_art" | "video"
) -> Result<MediaImportResult, String>
```

### Command: `import_media_url`
Download an image/video from a URL and save to app media folder.
```rust
#[tauri::command]
pub async fn import_media_url(
    app: AppHandle,
    db: State<'_, Database>,
    game_id: String,
    url: String,
    media_type: String,
) -> Result<MediaImportResult, String>
```

### Command: `delete_game_media`
Delete a specific media file for a game.
```rust
#[tauri::command]
pub async fn delete_game_media(
    app: AppHandle,
    db: State<'_, Database>,
    game_id: String,
    media_type: String,
) -> Result<(), String>
```

### Command: `search_youtube`
Search YouTube for game trailers/gameplay.
```rust
#[tauri::command]
pub async fn search_youtube(
    query: String,
) -> Result<Vec<YoutubeSearchResult>, String>
```

### Command: `download_youtube_video`
Download and encode a YouTube video as game trailer.
```rust
#[tauri::command]
pub async fn download_youtube_video(
    app: AppHandle,
    db: State<'_, Database>,
    game_id: String,
    youtube_url: String,
) -> Result<MediaImportResult, String>
```

## UI Design

### Edit Mode Layout
```
┌─────────────────────────────────────────────────────────┐
│ ← Back                              [Edit ✏️] [Save 💾] │
├───────────────┬─────────────────────────────────────────┤
│               │  System: SNES                           │
│  [3D Box]     │  Title: [__editable input__________]    │
│  [Replace]    │  Year: [____] Genre: [____________]     │
│  [Delete]     │  Developer: [__________]                │
│               │  Publisher: [__________]                 │
│  [Video]      │  Players: [_] Rating: [___]             │
│  [Replace]    │  Tags: [chip input with + button]       │
│  [YouTube🔍]  │                                         │
│               │  Description:                           │
│               │  [__multiline textarea_____________]    │
│               │  [________________________________]    │
│               │                                         │
│               │  ── Media Gallery ──                    │
│               │  [Hero Art] [Logo] [Background]         │
│               │  [+ Upload] [+ URL] [🗑️ Delete]        │
│               │                                         │
│               │  Screenshots: [img1] [img2] [+ Add]    │
└───────────────┴─────────────────────────────────────────┘
```

### Component Tree
```
GameDetailPage
├── EditToggleButton          (new)
├── GameBoxCase
│   └── MediaSlotOverlay      (new — replace/delete controls in edit mode)
├── MetadataEditor            (new — replaces read-only fields in edit mode)
│   ├── TextFieldEditor       (input/textarea per field)
│   ├── TagEditor             (chip input for tags)
│   └── RatingEditor          (slider or numeric input)
├── MediaGallery              (new — grid of media slots)
│   ├── MediaSlot             (new — image preview + upload/URL/delete actions)
│   └── AddMediaButton        (new — opens file picker or URL dialog)
├── VideoManager              (new — video preview + YouTube search/download)
│   ├── YouTubeSearch         (new — search bar + results list)
│   └── DownloadProgress      (new — progress indicator during download)
└── SaveBar                   (new — Save / Cancel / Discard buttons)
```

### Gamepad Navigation Flow
Edit mode is primarily mouse/keyboard. Gamepad users press Start/Menu button to toggle edit mode. In edit mode, spatial navigation moves between input fields. A (confirm) opens file pickers/dropdowns, B (back) cancels edit mode.

## File Structure
```
New/modified files:
├── src-tauri/src/commands/metadata_editor.rs     (NEW — 6 Tauri commands)
├── src-tauri/src/services/media_import_service.rs (NEW — file copy, URL download, cleanup)
├── src-tauri/src/lib.rs                          (MODIFY — register new commands)
├── src/components/editor/MetadataEditor.tsx       (NEW — text fields editor)
├── src/components/editor/MediaGallery.tsx          (NEW — media slots grid)
├── src/components/editor/MediaSlot.tsx             (NEW — single media slot with actions)
├── src/components/editor/VideoManager.tsx           (NEW — video + YouTube integration)
├── src/components/editor/YouTubeSearch.tsx          (NEW — search + results)
├── src/components/editor/TagEditor.tsx              (NEW — chip-based tag input)
├── src/components/editor/SaveBar.tsx                (NEW — save/cancel floating bar)
├── src/pages/GameDetailPage.tsx                    (MODIFY — add edit mode toggle)
├── src/lib/invoke.ts                               (MODIFY — add new API calls)
├── src/types/index.ts                              (MODIFY — add new interfaces)
├── src/hooks/useMedia.ts                           (MODIFY — cache invalidation on edit)
├── src/i18n/locales/*.ts                           (MODIFY — add editor i18n keys)
```

## Task Breakdown
| Task ID | Title | Estimate | Dependencies |
|---------|-------|----------|--------------|
| TASK-018-01 | Backend: Tauri commands for metadata + media editing | L | — |
| TASK-018-02 | Backend: Media import service (file copy, URL download) | M | TASK-018-01 |
| TASK-018-03 | Backend: YouTube search + download commands | M | TASK-018-01 |
| TASK-018-04 | Frontend: MetadataEditor + SaveBar components | L | TASK-018-01 |
| TASK-018-05 | Frontend: MediaGallery + MediaSlot + image upload/URL | L | TASK-018-02 |
| TASK-018-06 | Frontend: VideoManager + YouTubeSearch | M | TASK-018-03 |
| TASK-018-07 | Integration: Edit mode in GameDetailPage, i18n, testing | M | TASK-018-04,05,06 |

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| yt-dlp not installed | Medium | Show clear message, provide install link, disable YouTube features gracefully |
| Large file uploads (20MB+) | Low | Validate file size before copy, show progress |
| URL download fails (404, timeout) | Medium | Timeout at 30s, clear error toast, no partial files |
| Concurrent edits (scraper + user) | Low | User edits always win — save overwrites scraper data |

## Testing Strategy
- **Unit tests (Rust)**: Test media_import_service file copy, URL validation, path generation
- **Unit tests (TS)**: Test MetadataEditor state management, form validation
- **Integration tests**: Test full flow: edit field → save → reload → verify persistence
- **Manual tests**: Upload image, import from URL, YouTube search + download, verify in UI
