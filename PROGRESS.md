# PROGRESS

## Current

Code-review hardening merged (#1, #2). Open check: builtin Whisper model download under the narrowed CSP `connect-src` (ADR-0005) — if it fails, allow the host named in the console CSP error.

## Delivered

- Commander core through P4 (icon/CI) and P3.3/P3.4 (transcript drawer, column sort)
- Terminal launcher prefs; FileMan passes `--cwd` for ZeroG Term
- Thumbnails render again (CSP was missing `img-src data:`)
- Moves across drives (EXDEV fallback), case-only renames, name validation at prompt + main
- Thumbnails use the async OS thumbnailer (Windows/macOS)
- Server speech requests made by main; key never reaches the renderer; CSP `connect-src` narrowed (ADR-0005)
- Right-click context menu on entries and empty listing space (native menu; `src/shared/context-menu.ts`)
- Security: filenames can no longer inject cmd.exe syntax via Open with / terminal launchers; dropped files and foreign pages cannot reach `window.fileman`

## Next

- Later: D5 Pro Commander deck / themes
- Optional: SFTP pane

## Blockers

None.
