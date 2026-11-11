---
kind: decision
title: Pane drive picker via fs:drives
tags: [drives, p3-6, chrome]
paths: [src/shared/drives.ts, src/main/local-fs.ts, src/renderer/main.tsx]
sha: 87d0973
agent: cursor
created: 2026-11-11
updated: 2026-11-11
---
# Pane drive picker via fs:drives

Windows panes replace the first breadcrumb with a DrivePicker. Main probes A–Z with a 250ms access timeout so empty optical drives do not hang the menu. Shown only when windowsDriveRoot(path) is non-null (UNC stays plain breadcrumbs).
