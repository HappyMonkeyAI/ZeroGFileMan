# PROGRESS

## Current

File-type associations with auto-detected local apps (Settings → File apps), plus the in-app name dialog (New Folder / New File / Rename / favorite naming) and Explorer-style drag-drop inside and between panes, on top of the drive picker, per-pane refresh, and multi-select (Ctrl/Shift/Ctrl+A) with batch copy/cut/paste/F5/F6/delete.

Public on GitHub since 2026-11-10 (HappyMonkeyAI/ZeroGFileMan, MIT). The history was rewritten before publishing: personal email only, no LAN IPs or home paths. The pre-public history and code-review PRs #1–#3 are in the archived private repo `HappyMonkeyAI/ZeroGFileMan-archive`. PR numbers in this repo restart at #1.

Open check: builtin Whisper model download under the narrowed CSP `connect-src` (ADR-0005). If it fails, allow the host named in the console CSP error.

## Delivered

- Commander core through P4 (icon/CI) and P3.3/P3.4 (transcript drawer, column sort)
- Terminal launcher prefs; FileMan passes `--cwd` for ZeroG Term
- Thumbnails render again (CSP was missing `img-src data:`)
- Moves across drives (EXDEV fallback), case-only renames, name validation at prompt + main
- Thumbnails use the async OS thumbnailer (Windows/macOS)
- Server speech requests made by main; key never reaches the renderer; CSP `connect-src` narrowed (ADR-0005)
- Right-click context menu on entries and empty listing space
- Security: filenames can no longer inject cmd.exe syntax via Open with / terminal launchers; dropped files and foreign pages cannot reach `window.fileman`
- Public release prep (#1): SECURITY.md (private vulnerability reporting enabled), CONTRIBUTING.md, README unsigned-build/SmartScreen note, repo topics
- Fonts bundled via `@fontsource-variable/*`, no Google Fonts; CSP `font-src 'self'`; OFL text in THIRD-PARTY-NOTICES.md, shipped in the package (#2)
- Speech settings show endpoint warnings under Server URL: invalid URL, key over plain http off-machine, speech leaving the machine (`endpointNotices`, #2)
- SonarCloud removed for this repo: both FileMan projects deleted in the happymonkeyai SonarCloud org; the org-wide GitHub app is unchanged
- Per-pane Windows drive dropdown (`fs:drives` / path chrome)
- Per-pane refresh pill; multi-select with batch clipboard and F5/F6/delete
- Consent-based app updates from GitHub releases: startup/manual checks, in-place updates for NSIS installs, release-page notifications for portable builds, and a tag-driven Windows release workflow
- Update service covered by 27 tests; `npm run typecheck`, `npm test` (164 tests), and `npm run build` pass
- Final Windows NSIS and portable artifacts rebuilt successfully as separate targets after the combined package command timed out
- Favorites polish: the global picker now has explicit rename/remove controls, and the path action toggles between Add and Remove while preserving the existing `favorites.json` model
- File-type associations: the development store is scanned for apps declaring `build.fileAssociations` (unpacked exe → portable → dev Electron fallback); Settings → File apps lists detected apps, sets a default app per extension, and adds custom programs with a `{file}` argument template; Open/double-click and the right-click menu honor the associations through the injection-safe spawner (25 new tests; 213 total)
- Review follow-ups merged with PRs #4/#5: favorite paths compare case-sensitively on POSIX, prerelease tags need a hyphen after the patch version, and app launches accept extension-less executables on macOS/Linux (217 tests); released as v0.3.0
- In-app name dialog replaces `window.prompt` (Electron never implements it): New Folder, New File type/name, Rename (F2) and favorite naming now work in both panes; inline validation, Esc/Cancel aborts, new folders land selected
- Explorer-style drag-drop inside and between panes: drag = move, Ctrl = copy, Shift = force move, cross-drive defaults to copy; targets are folder rows/tiles, pane background, ".." and breadcrumbs; whole-selection drag; both panes refresh and the transcript logs each op; same-folder moves and drops into a folder's own subtree are no-ops
- Name dialog + drag-drop rules covered by 24 new tests (188 total); `npm run ci` passes; verified in a real hidden Electron window against a temp filesystem: 14/14 UI checks (dialog in the right pane, invalid-name error, Esc cancel, F2 rename, cross-pane move, Ctrl copy, folder-row drop, same-folder no-op)
- Native-app detection: projects without Electron associations can declare a `zerogapp.json` manifest (`name`, `version`, `extensions`, `launch.command`/`args`/`cwd`); relative commands resolve against the project dir, missing executables are skipped, `package.json` associations still win; the Rust sister apps ZeroG Edit / ZeroG Play use this (8 new tests; 225 total)

## Next

- Confirm the next PR shows no SonarCloud check. If one appears, SonarCloud is auto-importing new repos; turn that off in the SonarCloud org settings.
- Later: D5 Pro Commander deck / themes
- Optional: SFTP pane
- Open check: builtin Whisper model download under narrowed CSP if it fails in practice

## Blockers

None.
