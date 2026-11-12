import { describe, expect, it } from 'vitest';
import { buildContextMenu, parseContextMenuTarget, type ContextMenuItem } from '../src/shared/context-menu.js';

const commands = (items: ContextMenuItem[]) =>
  items.flatMap((i) => (i.type === 'item' ? [i.command] : []));
const byCommand = (items: ContextMenuItem[], command: string) =>
  items.find((i) => i.type === 'item' && i.command === command) as Extract<ContextMenuItem, { type: 'item' }>;

describe('parseContextMenuTarget', () => {
  it('accepts known kinds and coerces flags to strict booleans', () => {
    expect(parseContextMenuTarget({ kind: 'file', canPaste: 'yes', canTransfer: true })).toEqual({
      kind: 'file',
      canPaste: false,
      canTransfer: true
    });
  });

  it('rejects anything else from the renderer', () => {
    expect(() => parseContextMenuTarget(null)).toThrow();
    expect(() => parseContextMenuTarget('file')).toThrow();
    expect(() => parseContextMenuTarget({ kind: 'C:\\Windows' })).toThrow();
  });
});

describe('buildContextMenu', () => {
  it('offers the file actions, with Notepad only on Windows', () => {
    const target = { kind: 'file' as const, canPaste: false, canTransfer: true };
    const win = buildContextMenu(target, 'win32');
    expect(commands(win)).toEqual([
      'item:open',
      'file:open-notepad',
      'item:open-cursor',
      'file:reveal',
      'edit:cut',
      'edit:copy',
      'edit:paste',
      'edit:copy-other',
      'edit:move-other',
      'item:copy-path',
      'file:rename',
      'file:delete'
    ]);
    expect(commands(buildContextMenu(target, 'linux'))).not.toContain('file:open-notepad');
    expect(byCommand(win, 'file:reveal').label).toBe('Show in Explorer');
    expect(byCommand(buildContextMenu(target, 'darwin'), 'file:reveal').label).toBe('Reveal in Finder');
  });

  it('offers terminal and favorites for folders, not Notepad', () => {
    const items = buildContextMenu({ kind: 'directory', canPaste: true, canTransfer: true }, 'win32');
    expect(commands(items)).toContain('item:terminal');
    expect(commands(items)).toContain('item:favorite');
    expect(commands(items)).not.toContain('file:open-notepad');
  });

  it('disables paste and transfers when they cannot apply', () => {
    const items = buildContextMenu({ kind: 'file', canPaste: false, canTransfer: false }, 'win32');
    expect(byCommand(items, 'edit:paste').enabled).toBe(false);
    expect(byCommand(items, 'edit:copy-other').enabled).toBe(false);
    expect(byCommand(items, 'edit:move-other').enabled).toBe(false);
    expect(byCommand(items, 'file:delete').enabled).toBeUndefined();
  });

  it('offers folder-level actions on empty space', () => {
    const items = buildContextMenu({ kind: 'background', canPaste: true, canTransfer: false }, 'win32');
    expect(commands(items)).toEqual([
      'file:new-folder',
      'file:new-file',
      'edit:paste',
      'file:open-terminal',
      'file:copy-path',
      'go:add-favorite',
      'file:refresh'
    ]);
    expect(byCommand(items, 'edit:paste').enabled).toBe(true);
  });

  it('never starts or ends with a separator, nor doubles one', () => {
    for (const kind of ['file', 'directory', 'symlink', 'background'] as const) {
      const items = buildContextMenu({ kind, canPaste: true, canTransfer: true }, 'win32');
      expect(items[0].type).toBe('item');
      expect(items.at(-1)?.type).toBe('item');
      items.forEach((entry, i) => {
        if (entry.type === 'separator') expect(items[i + 1]?.type).toBe('item');
      });
    }
  });
});
