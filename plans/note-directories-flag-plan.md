# Plan: Optional Nested Note Directories

## Goal

Add an environment-variable-controlled feature that allows note titles to include directory paths (for example `work/todo`), stores those notes in subdirectories under `FLATNOTES_PATH`, exposes the full path in URLs and UI title bars, supports renaming across directories, and keeps note-to-note links working.

## Scope and constraints

- Keep existing behavior as default (flat notes only).
- Enable nested directories only when a new flag is set.
- Recursive markdown discovery is required when the flag is enabled.
- `.flatnotes` index directory must never be treated as note content.

## Proposed flag

- Name: `FLATNOTES_NESTED_NOTES` (boolean: `true|false`)
- Default: `false`
- Behavior:
  - `false`: current flat behavior (single directory level)
  - `true`: allow slash-separated note paths and recursive note enumeration

## Implementation plan

### 1) Config and validation plumbing

1. Add `nested_notes` to `GlobalConfig` in `server/global_config.py`, loaded via `get_env(..., cast_bool=True)`.
2. Pass the flag into note storage initialization (either via constructor arg or storage-level env read, keeping current style consistent).
3. Update docs and example configs (`README.md`, docker-compose snippet) with the new variable.

### 2) Backend note path model (file system storage)

Files: `server/notes/file_system/file_system.py`, `server/helpers.py`, `server/notes/models.py`.

1. Split title validation into two modes:
   - flat mode: current filename validation stays.
   - nested mode: validate each path segment as a filename and reject path traversal/unsafe forms (`..`, absolute paths, empty segments).
2. Update `_path_from_title(title)` to map nested titles to nested paths when enabled.
3. Ensure create/update can create missing parent directories before write/move (`os.makedirs(parent, exist_ok=True)`).
4. On rename (`update` with `new_title`), allow moving files between directories and keep duplicate-target protection.
5. Optionally remove now-empty directories after move/delete (safe cleanup step, non-blocking).

### 3) Recursive markdown discovery and index sync

Files: `server/notes/file_system/file_system.py`.

1. Make markdown listing recursive when nested mode is enabled.
   - Use `glob.glob("**/*.md", recursive=True)` rooted at `storage_path`, or `os.walk`.
2. Store and compare filenames as relative paths from `storage_path` (for example `work/todo.md`) so index lookups remain unique.
3. Exclude `.flatnotes/` subtree from discovery.
4. Keep flat mode listing as-is for compatibility/perf.
5. Verify search results return titles without `.md` but with subdirectory prefix (for example `work/todo`).

### 4) API routes that accept slash-containing titles

File: `server/main.py`.

1. Change note routes to path converters so slashes are accepted:
   - `/api/notes/{title:path}` for GET/PATCH/DELETE
2. Update UI route serving path similarly:
   - `/note/{title:path}`
3. Keep existing 400/404/409 behavior by reusing validation and exceptions.

### 5) Frontend routing, API calls, and title display

Files: `client/router.js`, `client/api.js`, `client/views/Note.vue`.

1. Update Vue route to capture nested titles (`/note/:title(.*)` or equivalent catch-all pattern).
2. Ensure API request URLs preserve `/` in titles while encoding other unsafe characters (avoid encoding slashes away).
3. Keep displaying the full note title/path in the header and browser tab title bar.
4. Confirm create/rename navigation uses the new nested title correctly (`router.push/replace` with full path title).

### 6) Note-to-note linking

Files: `client/components/toastui/extendedAutolinks.js`, optionally `client/components/toastui/baseOptions.js`.

1. Ensure wiki links `[[note/path]]` resolve to nested note routes.
2. Add/confirm support for markdown links targeting notes (for example `[text](note/path)` or relative note links) so clicking opens the correct note route.
3. Preserve current external URL/email/tag behaviors.

### 7) Tests and verification

Manual checks (and automated tests if/where available):

1. Flat mode (`FLATNOTES_NESTED_NOTES=false`): existing behavior unchanged.
2. Nested mode (`true`):
   - create `a/b/c` note creates directories + file
   - search finds nested notes (recursive md scan)
   - open note directly via `/note/a/b/c`
   - rename `a/b/c` -> `x/y/z` moves file and creates target dirs
   - delete nested note works
   - links like `[[x/y/z]]` navigate correctly
3. Index sync after move/delete/restart remains consistent.

## Suggested delivery order

1. Backend flag + path validation + recursive scanning.
2. API path converters for slash titles.
3. Frontend route/API updates.
4. Linking enhancements.
5. Docs + verification pass.

## Risk notes

- Encoded slash handling can differ across client/router/server layers; verify end-to-end with real URLs.
- Path validation must explicitly block traversal attempts while allowing normal nested paths.
- Index migration should be safe: existing flat notes should continue to load without rebuild failures.
