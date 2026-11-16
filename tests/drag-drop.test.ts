import { describe, expect, it } from 'vitest';
import {
  DRAG_MIME,
  decodeDragPayload,
  dropMode,
  encodeDragPayload,
  isInsideLocation,
  planDrop,
  sameLocation
} from '../src/shared/drag-drop.js';

const move = { ctrl: false, shift: false };
const ctrl = { ctrl: true, shift: false };
const shift = { ctrl: false, shift: true };

describe('drag payload', () => {
  it('uses a private mime type', () => {
    expect(DRAG_MIME).toBe('application/x-zerog-fileman');
  });

  it('round-trips paths', () => {
    const paths = ['C:\\Users\\me\\a.txt', 'C:\\Users\\me\\folder'];
    expect(decodeDragPayload(encodeDragPayload(paths))).toEqual(paths);
  });

  it('rejects malformed payloads', () => {
    expect(decodeDragPayload('')).toBeNull();
    expect(decodeDragPayload('not json')).toBeNull();
    expect(decodeDragPayload('{}')).toBeNull();
    expect(decodeDragPayload('{"paths":[]}')).toBeNull();
    expect(decodeDragPayload('{"paths":[1]}')).toBeNull();
    expect(decodeDragPayload('{"paths":[""]}')).toBeNull();
    expect(decodeDragPayload('{"paths":"C:\\\\x"}')).toBeNull();
  });
});

describe('sameLocation / isInsideLocation', () => {
  it('ignores case and trailing separators on Windows', () => {
    expect(sameLocation('C:\\Work\\', 'c:\\work')).toBe(true);
    expect(sameLocation('C:\\Work', 'C:\\Work2')).toBe(false);
  });

  it('is case-sensitive on POSIX', () => {
    expect(sameLocation('/home/me', '/home/Me')).toBe(false);
    expect(sameLocation('/home/me/', '/home/me')).toBe(true);
  });

  it('detects strict descendants only', () => {
    expect(isInsideLocation('C:\\Work\\sub\\deep', 'C:\\Work')).toBe(true);
    expect(isInsideLocation('C:\\Work', 'C:\\Work')).toBe(false);
    expect(isInsideLocation('C:\\Work2', 'C:\\Work')).toBe(false);
    expect(isInsideLocation('/a/b/c', '/a/b')).toBe(true);
    expect(isInsideLocation('/a/bc', '/a/b')).toBe(false);
    expect(isInsideLocation('/home/x', '/')).toBe(true);
  });
});

describe('dropMode', () => {
  it('moves within a drive by default', () => {
    expect(dropMode(move, 'C:\\a\\f.txt', 'C:\\b')).toBe('move');
  });

  it('copies across drives by default', () => {
    expect(dropMode(move, 'C:\\a\\f.txt', 'D:\\b')).toBe('copy');
  });

  it('lets Ctrl force copy and Shift force move', () => {
    expect(dropMode(ctrl, 'C:\\a\\f.txt', 'C:\\b')).toBe('copy');
    expect(dropMode(shift, 'C:\\a\\f.txt', 'D:\\b')).toBe('move');
    expect(dropMode({ ctrl: true, shift: true }, 'C:\\a', 'D:\\b')).toBe('copy');
  });

  it('treats UNC shares as volumes', () => {
    expect(dropMode(move, '\\\\nas\\docs\\f.txt', '\\\\nas\\docs\\sub')).toBe('move');
    expect(dropMode(move, '\\\\nas\\docs\\f.txt', '\\\\nas\\media')).toBe('copy');
  });

  it('defaults to move on POSIX (main handles cross-device moves)', () => {
    expect(dropMode(move, '/mnt/a/f.txt', '/mnt/b')).toBe('move');
  });
});

describe('planDrop', () => {
  it('plans a move into another folder', () => {
    expect(planDrop(['C:\\a\\f.txt'], 'C:\\b', move)).toEqual({
      items: [{ path: 'C:\\a\\f.txt', mode: 'move' }],
      skipped: 0
    });
  });

  it('skips moving an entry onto its own folder', () => {
    expect(planDrop(['C:\\a\\f.txt'], 'C:\\a', move)).toEqual({ items: [], skipped: 1 });
    expect(planDrop(['C:\\a\\f.txt'], 'c:\\A\\', move)).toEqual({ items: [], skipped: 1 });
  });

  it('allows copying into the same folder (main adds a "(n)" name)', () => {
    expect(planDrop(['C:\\a\\f.txt'], 'C:\\a', ctrl)).toEqual({
      items: [{ path: 'C:\\a\\f.txt', mode: 'copy' }],
      skipped: 0
    });
  });

  it('refuses dropping a folder into itself or its descendant', () => {
    expect(planDrop(['C:\\a'], 'C:\\a', move)).toEqual({ items: [], skipped: 1 });
    expect(planDrop(['C:\\a'], 'C:\\a\\sub', move)).toEqual({ items: [], skipped: 1 });
    expect(planDrop(['C:\\a'], 'C:\\a\\sub', ctrl)).toEqual({ items: [], skipped: 1 });
  });

  it('mixes modes per source volume and keeps valid items', () => {
    const plan = planDrop(['C:\\a\\f.txt', 'D:\\b\\g.txt', 'C:\\a\\h.txt'], 'C:\\target', move);
    expect(plan).toEqual({
      items: [
        { path: 'C:\\a\\f.txt', mode: 'move' },
        { path: 'D:\\b\\g.txt', mode: 'copy' },
        { path: 'C:\\a\\h.txt', mode: 'move' }
      ],
      skipped: 0
    });
  });

  it('handles POSIX paths', () => {
    expect(planDrop(['/home/me/f.txt'], '/home/me', move)).toEqual({ items: [], skipped: 1 });
    expect(planDrop(['/home/me/f.txt'], '/tmp', move)).toEqual({
      items: [{ path: '/home/me/f.txt', mode: 'move' }],
      skipped: 0
    });
  });
});
