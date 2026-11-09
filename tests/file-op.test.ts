import { describe, expect, it } from 'vitest';
import { describeError, runReported } from '../src/shared/file-op.js';

const ipc = (channel: string, message: string) =>
  new Error(`Error invoking remote method '${channel}': Error: ${message}`);

describe('describeError', () => {
  it('strips the Electron IPC wrapper and explains common codes', () => {
    expect(describeError(ipc('fs:remove', "ENOTEMPTY: directory not empty, rmdir 'C:\\x'"))).toBe(
      'That folder is not empty.'
    );
    expect(describeError(ipc('fs:rename', 'EPERM: operation not permitted'))).toBe('Permission denied.');
  });

  it('keeps our own messages readable', () => {
    expect(describeError(ipc('fs:rename', 'Something with that name already exists here.'))).toBe(
      'Something with that name already exists here.'
    );
    expect(describeError('plain string')).toBe('plain string');
    expect(describeError(new Error(''))).toBe('Unknown error.');
  });
});

describe('runReported', () => {
  it('resolves true and reports nothing on success', async () => {
    const lines: string[] = [];
    await expect(runReported('Delete “a”', async () => undefined, (l) => lines.push(l))).resolves.toBe(true);
    expect(lines).toEqual([]);
  });

  it('never rejects; reports the failure instead', async () => {
    const lines: string[] = [];
    const ok = await runReported(
      'Delete “a”',
      async () => {
        throw ipc('fs:remove', 'EBUSY: resource busy or locked');
      },
      (l) => lines.push(l)
    );
    expect(ok).toBe(false);
    expect(lines).toEqual(['Delete “a” failed: It is in use by another program.']);
  });
});
