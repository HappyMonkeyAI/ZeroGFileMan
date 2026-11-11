# PROGRESS

## Current

Drive picker, per-pane refresh, and multi-select (Ctrl/Shift/Ctrl+A) with batch copy/cut/paste/F5/F6/delete.

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

## Next

- Confirm the next PR shows no SonarCloud check. If one appears, SonarCloud is auto-importing new repos; turn that off in the SonarCloud org settings.
- Later: D5 Pro Commander deck / themes
- Optional: SFTP pane
- Open check: builtin Whisper model download under narrowed CSP if it fails in practice

## Blockers

None.
