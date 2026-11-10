---
kind: checkpoint
created: 2026-11-10T12:33:18Z
agent: claude-code
sha: 66ad011
branch: main
paths: [PROGRESS.md, SECURITY.md, src/shared/endpoints.ts, index.html]
verification: {V0: pass, V1: pass, V2: pass, V3: pass}
id: 2026-11-10T1233Z-published-zerogfileman-publicly-with-rewritten-h
---
# Checkpoint: Published ZeroGFileMan publicly with rewritten history; added public docs, bund…

## Summary

Published ZeroGFileMan publicly with rewritten history; added public docs, bundled fonts, endpoint warnings; removed SonarCloud

## Done

- History rewritten (personal email only; LAN IP, model hash, home paths scrubbed); old repo renamed/archived as ZeroGFileMan-archive; fresh repo made public
- PR #1 merged: SECURITY.md, CONTRIBUTING.md, README unsigned-build note; private vuln reporting + topics enabled
- PR #2 merged: fonts bundled (@fontsource-variable), CSP font-src 'self', THIRD-PARTY-NOTICES.md; endpointNotices shown in speech settings; [::1] comment after Amazon Q misread
- SonarCloud projects HappyMonkeyAI_ZeroGFileMan2 and HappyMonkeyAI_ZeroGFileMan deleted

## Next

- Check the next PR shows no SonarCloud check; if it does, disable auto-import in the SonarCloud org
- Verify builtin Whisper model download under narrowed CSP connect-src (ADR-0005)

## Blockers

- (none)

## Decisions

- Repo is public under MIT
- Rebase-merge PRs to keep main linear; when stacking, rebase the child onto main before deleting the parent branch (GitHub closes the child otherwise)
