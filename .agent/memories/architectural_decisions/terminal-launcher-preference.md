---
kind: decision
title: Terminal launcher preference
tags: [ux, settings, terminal]
paths: [ROADMAP.md, src/main/main.ts]
sha: d69c741
agent: cursor
created: 2026-11-01
updated: 2026-11-01
---
# Terminal launcher preference

Owner wants Settings to choose what the Terminal button opens: system terminal (current) and/or a third-party app such as ZeroG Term. Prefer a small enum preference (system | zerogterm | custom path later), not hard-coding only one external app.
