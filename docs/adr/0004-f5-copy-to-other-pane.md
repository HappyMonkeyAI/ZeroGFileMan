# ADR-0004: F5/F6 copy/move to other pane

## Status

Accepted

## Context

Classic dual-pane commanders use F5/F6 for copy/move between panes. Our toolbar previously labeled F5 as Refresh.

## Decision

- **F5** = copy selection into the opposing pane’s cwd  
- **F6** = move selection into the opposing pane’s cwd  
- **Refresh** = toolbar button / Ctrl+R (macOS menu) — not F5  

Clipboard Copy/Cut/Paste remain separate from pane-to-pane transfer.

## Consequences

Users familiar with Total/Double Commander get expected hotkeys. Refresh loses the F5 binding.
