---
kind: decision
title: Per-pane listing prefs shape
tags: [listing, sort, p3-4]
paths: [src/renderer/listing-prefs.ts, src/shared/listing-sort.ts]
sha: 28d0d3d
agent: cursor
created: 2026-11-01
updated: 2026-11-01
---
# Per-pane listing prefs shape

Listing localStorage key zerogfileman.listing is now { left, right } each with mode/scale/sortKey/sortDir. Legacy flat { mode, scale } upgrades to both panes. Sort always keeps directories/symlinks first.
