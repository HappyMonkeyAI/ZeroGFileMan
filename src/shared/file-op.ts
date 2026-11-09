// Run a file operation and always tell the user how it ended.
//
// File operations are kicked off from menus, keys and voice with the promise
// discarded, so a rejection here must be turned into a log line — otherwise a
// "folder not empty" or "access denied" looks like nothing happened.

const IPC_PREFIX = /^Error invoking remote method '[^']*':\s*(?:\w*Error:\s*)?/;

const FRIENDLY_CODES: Record<string, string> = {
  ENOTEMPTY: 'That folder is not empty.',
  EEXIST: 'Something with that name already exists here.',
  EPERM: 'Permission denied.',
  EACCES: 'Permission denied.',
  EBUSY: 'It is in use by another program.',
  ENOENT: 'It no longer exists — try refreshing.',
  EXDEV: 'Cannot move between drives yet — copy, then delete instead.'
};

/** A short message for the transcript, without Electron's IPC wrapper text. */
export function describeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const message = raw.replace(IPC_PREFIX, '').trim();
  const code = /^([A-Z]+):/.exec(message)?.[1];
  const friendly = code ? FRIENDLY_CODES[code] : undefined;
  return friendly ?? (message || 'Unknown error.');
}

/**
 * Await `op`; on failure report `"<label> failed: <reason>"` and resolve false.
 * Never rejects, so callers may safely `void` it.
 */
export async function runReported(
  label: string,
  op: () => Promise<void>,
  report: (line: string) => void
): Promise<boolean> {
  try {
    await op();
    return true;
  } catch (error) {
    report(`${label} failed: ${describeError(error)}`);
    return false;
  }
}
