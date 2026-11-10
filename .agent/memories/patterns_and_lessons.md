# Patterns and lessons

- Prefer greenfield FileMan over forking ZeroG Term (PTY/SSH/MCP weight).
- Dual voice jewels (Navigate / Action) beat single-mic intent classification for v1.
- Demo speech engine lets UI/fuzzy be tested without ASR model download.

## URL.hostname keeps IPv6 brackets

new URL('http://[::1]/').hostname is '[::1]' (brackets kept, also for [0:0:0:0:0:0:0:1]). LOOPBACK_HOSTNAMES in src/shared/endpoints.ts must keep '[::1]'; an Amazon Q review wrongly called it dead code. tests/endpoints.test.ts fails if it is removed.

_claude-code, 2026-11-10, 66ad011; paths: `src/shared/endpoints.ts`_
