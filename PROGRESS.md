# PROGRESS

## Current

Review hardening (branch `fix/review-critical-ipc-spawn`): no `shell: true` launches (`src/main/safe-spawn.ts`), window/IPC locked to the app's own page (`src/main/app-origin.ts`), file-op failures reported in the transcript (`src/shared/file-op.ts`). V3 manual smoke pending.

## Delivered

- Commander core through P4 (icon/CI) and P3.3/P3.4 (transcript drawer, column sort)
- Terminal launcher prefs; FileMan passes `--cwd` for ZeroG Term
- Security: filenames can no longer inject cmd.exe syntax via Open with / terminal launchers; dropped files and foreign pages cannot reach `window.fileman`

## Next

- Review follow-ups: cross-drive move (EXDEV), case-only rename on Windows, entry-name validation, async thumbnails, move speech key use into main
- Later: D5 Pro Commander deck / themes
- Optional: SFTP pane

## Blockers

None.
