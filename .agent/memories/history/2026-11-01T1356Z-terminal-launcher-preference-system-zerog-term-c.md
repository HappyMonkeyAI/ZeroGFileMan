---
kind: checkpoint
created: 2026-11-01T13:56:41Z
agent: cursor
sha: 6e66342
branch: main
paths: [src/shared/terminal-launcher.ts, src/main/terminal-launch.ts, src/renderer/main.tsx]
verification: {V0: pass, V1: pass, V2: pass, V3: skip, V4: pass}
id: 2026-11-01T1356Z-terminal-launcher-preference-system-zerog-term-c
---
# Checkpoint: Terminal launcher preference: system / ZeroG Term / custom command in Settings.

## Summary

Terminal launcher preference: system / ZeroG Term / custom command in Settings.

## Done

- TerminalPrefs + localStorage
- shell:openTerminal IPC with launcher options
- Settings UI: Terminal + custom command
- ZeroG Term discovery: installed exe → sibling checkout → PATH

## Next

- P4.2 app icon
- P4.4 CI
- Optional Term-side ZEROG_OPEN_CWD deep link

## Blockers

- (none)

## Decisions

- Pass cwd via argv and ZEROG_OPEN_CWD env; Term can honor more richly later
