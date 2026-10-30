# 2026-10-30 — Google Stitch Pro Commander dark UI

## Source

Google Stitch HTML mockup + screenshot (`assets/image-3e7ecba3-…` in Cursor project assets).

## Cherry-pick

- Deck palette: `#070b12` / `#0d1320` / `#131b2c` / `#1e2b42`, cyan accent `#06b6d4`
- Dual-pane commander density: active/target badges, breadcrumbs, filter, mono listing
- Grouped master toolbar (nav / CRUD / clipboard / launchers)
- Transcript & action bus drawer + status bar
- JetBrains Mono for paths/listings; Inter for chrome

## Avoid / adapt

- Fake macOS traffic lights on Windows (keep Electron native menu)
- Fake “Native Rust/Async” engine badge and invented CPU/RAM meters
- Tailwind CDN / Phosphor CDN in production Electron — translate to local CSS + existing Icon set
- “v2.0 Pro” marketing chrome — keep product name ZeroG FileMan; version can stay 0.1 until release
