---
kind: decision
title: FileMan app icon source of truth
tags: [icon, packaging, p4-2]
paths: [build/icon.svg, scripts/render-icon.mjs, package.json]
sha: b21b887
agent: cursor
created: 2026-11-01
updated: 2026-11-01
---
# FileMan app icon source of truth

Icon SoT is build/icon.svg. Regenerated with npm run icon:render (sharp). Commit png+ico so packaging and CI do not require Pillow or on-the-fly render. electron-builder uses build/icon.ico; BrowserWindow loads build/icon when present (dev); packaged Windows uses the exe icon from electron-builder.
