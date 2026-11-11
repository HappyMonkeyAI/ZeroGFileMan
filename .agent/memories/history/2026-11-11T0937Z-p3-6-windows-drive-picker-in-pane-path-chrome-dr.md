---
kind: checkpoint
created: 2026-11-11T09:37:36Z
agent: cursor
sha: 87d0973
branch: main
paths: [src/shared/drives.ts, src/main/local-fs.ts, src/renderer/main.tsx, src/renderer/styles.css]
verification: {V0: pass, V1: pass, V2: pass, V3: skip, V4: skip}
id: 2026-11-11T0937Z-p3-6-windows-drive-picker-in-pane-path-chrome-dr
---
# Checkpoint: P3.6 Windows drive picker in pane path chrome (dropdown next to drive letter).

## Summary

P3.6 Windows drive picker in pane path chrome (dropdown next to drive letter).

## Done

- fs:drives IPC lists mounted A–Z roots with timeout
- DrivePicker beside breadcrumbs; navigates to selected root
- Unit tests for drive path helpers; CI green

## Next

- Manual smoke of drive dropdown in app
- Later D5 deck / SFTP

## Blockers

- (none)

## Decisions

- (none)
