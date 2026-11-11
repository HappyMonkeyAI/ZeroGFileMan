/** Windows drive-root helpers for the pane drive picker. */

/** `C:\\Users\\…` → `C:\\`; UNC / POSIX → null. */
export function windowsDriveRoot(path: string): string | null {
  if (typeof path !== 'string' || !path) return null;
  const match = path.match(/^([A-Za-z]:)([\\/]|$)/);
  if (!match) return null;
  return `${match[1].toUpperCase()}\\`;
}

/** `C:\\` → `C:` for chrome labels. */
export function driveLetterLabel(root: string): string {
  const match = root.match(/^([A-Za-z]:)/);
  return match ? match[1].toUpperCase() : root;
}

export function isWindowsDriveRoot(path: string): boolean {
  return /^[A-Za-z]:[\\/]?$/.test(path.trim());
}
