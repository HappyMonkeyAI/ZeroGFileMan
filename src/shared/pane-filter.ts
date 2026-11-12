// Filter policy for pane navigation, in one place so the renderer and the
// tests agree on when a filter survives a move.

export function filterForNavigation(
  currentPath: string,
  targetPath: string,
  currentFilter: string
): string {
  if (currentPath === targetPath) return currentFilter;
  return '';
}
