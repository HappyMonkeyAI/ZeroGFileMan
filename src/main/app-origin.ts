// Which pages count as "the FileMan renderer".
//
// The preload exposes filesystem and shell operations, so only the app's own
// page may use them. A dropped .html file, a link, or a redirect must never
// load into the window with `window.fileman` still attached, and IPC from any
// other frame is refused.

export type AppLocation =
  | { kind: 'file'; url: string }
  | { kind: 'dev'; url: string };

function parse(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/** Compare file URLs by path only; Windows drive letters and paths are case-insensitive. */
function normalizedFilePath(url: URL, caseInsensitive: boolean): string {
  let path: string;
  try {
    path = decodeURIComponent(url.pathname);
  } catch {
    path = url.pathname;
  }
  return caseInsensitive ? path.toLowerCase() : path;
}

/**
 * Is `candidate` the app itself? Production allows exactly the bundled
 * index.html (any hash or query); the dev server allows its own origin.
 */
export function isAppUrl(
  candidate: string | undefined | null,
  app: AppLocation,
  platform: NodeJS.Platform = process.platform
): boolean {
  if (!candidate) return false;
  const target = parse(candidate);
  const expected = parse(app.url);
  if (!target || !expected) return false;

  if (app.kind === 'dev') {
    return (
      (target.protocol === 'http:' || target.protocol === 'https:') && target.origin === expected.origin
    );
  }

  if (target.protocol !== 'file:' || expected.protocol !== 'file:') return false;
  if (target.host !== expected.host) return false;
  const caseInsensitive = platform === 'win32' || platform === 'darwin';
  return normalizedFilePath(target, caseInsensitive) === normalizedFilePath(expected, caseInsensitive);
}
