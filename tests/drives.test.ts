import { describe, expect, it } from 'vitest';
import { driveLetterLabel, isWindowsDriveRoot, windowsDriveRoot } from '../src/shared/drives.js';

describe('drives', () => {
  it('extracts the Windows drive root', () => {
    expect(windowsDriveRoot('C:\\Users\\steph')).toBe('C:\\');
    expect(windowsDriveRoot('d:/data')).toBe('D:\\');
    expect(windowsDriveRoot('E:')).toBe('E:\\');
    expect(windowsDriveRoot('/home/steph')).toBeNull();
    expect(windowsDriveRoot('\\\\server\\share')).toBeNull();
  });

  it('formats drive labels', () => {
    expect(driveLetterLabel('C:\\')).toBe('C:');
    expect(driveLetterLabel('z:\\')).toBe('Z:');
  });

  it('detects drive roots', () => {
    expect(isWindowsDriveRoot('C:\\')).toBe(true);
    expect(isWindowsDriveRoot('C:')).toBe(true);
    expect(isWindowsDriveRoot('C:\\Users')).toBe(false);
  });
});
