/** Pure multi-select helpers for a file listing (Ctrl / Shift / exclusive click). */

export type SelectionMods = {
  ctrl: boolean;
  shift: boolean;
};

export type SelectionState = {
  selected: string[];
  selectionAnchor: string | null;
};

export function emptySelection(): SelectionState {
  return { selected: [], selectionAnchor: null };
}

export function exclusiveSelect(name: string): SelectionState {
  return { selected: [name], selectionAnchor: name };
}

export function primarySelected(selected: readonly string[]): string | null {
  return selected.length ? selected[selected.length - 1]! : null;
}

export function pruneSelection(
  selected: readonly string[],
  existing: ReadonlySet<string>
): string[] {
  return selected.filter((name) => existing.has(name));
}

/** Ctrl/Cmd click: add or remove one name; anchor moves to the clicked row. */
export function toggleSelect(state: SelectionState, name: string): SelectionState {
  if (state.selected.includes(name)) {
    const selected = state.selected.filter((item) => item !== name);
    return {
      selected,
      selectionAnchor: name
    };
  }
  return { selected: [...state.selected, name], selectionAnchor: name };
}

/** Shift click: contiguous range from anchor (or name) through `to` in visible order. */
export function selectRange(
  visibleNames: readonly string[],
  selectionAnchor: string | null,
  to: string
): SelectionState {
  const end = visibleNames.indexOf(to);
  if (end < 0) return exclusiveSelect(to);
  const startName =
    selectionAnchor && visibleNames.includes(selectionAnchor) ? selectionAnchor : to;
  const start = visibleNames.indexOf(startName);
  const from = Math.min(start, end);
  const until = Math.max(start, end);
  return {
    selected: visibleNames.slice(from, until + 1),
    selectionAnchor: startName
  };
}

export function selectAll(visibleNames: readonly string[]): SelectionState {
  if (!visibleNames.length) return emptySelection();
  return {
    selected: [...visibleNames],
    selectionAnchor: visibleNames[0] ?? null
  };
}

/**
 * Listing click with modifier keys.
 * Plain → one item; Ctrl/Cmd → toggle; Shift → range from anchor.
 * Ctrl+Shift prefers range (Explorer-like).
 */
export function applyListingClick(
  state: SelectionState,
  visibleNames: readonly string[],
  name: string,
  mods: SelectionMods
): SelectionState {
  if (mods.shift) return selectRange(visibleNames, state.selectionAnchor, name);
  if (mods.ctrl) return toggleSelect(state, name);
  return exclusiveSelect(name);
}
