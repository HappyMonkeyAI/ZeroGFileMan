// Right-click menu for listing entries and the empty listing background.
//
// The renderer only says *what* was clicked (an entry kind or the background)
// and a couple of booleans; no paths cross IPC. Main builds a native menu
// from this description and each item sends back an ordinary menu command,
// which acts on the active pane's selection exactly like the app menu does.

export type ContextMenuTargetKind = 'file' | 'directory' | 'symlink' | 'background';

export type ContextMenuOpenWith = {
  label: string;
  appId: string;
};

export type ContextMenuTarget = {
  kind: ContextMenuTargetKind;
  /** Something is on the FileMan clipboard (copy/cut). */
  canPaste: boolean;
  /** The other pane shows a different folder, so copy/move-to-other make sense. */
  canTransfer: boolean;
  /** Extra "Open with …" apps for the clicked file's extension. */
  openWith?: ContextMenuOpenWith[];
};

/** Commands only the context menu sends; they act on the selected entry. */
export type ContextMenuCommand =
  | 'item:open'
  | 'item:open-cursor'
  | 'item:copy-path'
  | 'item:terminal'
  | 'item:favorite';

export type ContextMenuItem =
  | { type: 'separator' }
  | { type: 'item'; label: string; command: string; enabled?: boolean; accelerator?: string };

const KINDS: ContextMenuTargetKind[] = ['file', 'directory', 'symlink', 'background'];

/** Validate an untrusted description from the renderer. */
export function parseContextMenuTarget(raw: unknown): ContextMenuTarget {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid context menu target.');
  const source = raw as Record<string, unknown>;
  if (typeof source.kind !== 'string' || !(KINDS as string[]).includes(source.kind)) {
    throw new Error('Invalid context menu target.');
  }
  const openWith: ContextMenuOpenWith[] = [];
  if (source.openWith !== undefined) {
    if (!Array.isArray(source.openWith) || source.openWith.length > 12) {
      throw new Error('Invalid context menu target.');
    }
    for (const entry of source.openWith) {
      if (!entry || typeof entry !== 'object') throw new Error('Invalid context menu target.');
      const { label, appId } = entry as Record<string, unknown>;
      if (
        typeof label !== 'string' || !label.trim() || label.length > 80 ||
        typeof appId !== 'string' || !/^[a-z0-9:._-]{1,120}$/i.test(appId)
      ) {
        throw new Error('Invalid context menu target.');
      }
      openWith.push({ label, appId });
    }
  }
  return {
    kind: source.kind as ContextMenuTargetKind,
    canPaste: source.canPaste === true,
    canTransfer: source.canTransfer === true,
    ...(openWith.length ? { openWith } : {})
  };
}

const SEPARATOR: ContextMenuItem = { type: 'separator' };

function item(label: string, command: string, extra: Partial<Omit<ContextMenuItem & { type: 'item' }, 'type'>> = {}): ContextMenuItem {
  return { type: 'item', label, command, ...extra };
}

export function buildContextMenu(target: ContextMenuTarget, platform: NodeJS.Platform | string): ContextMenuItem[] {
  const windows = platform === 'win32';
  const revealLabel = windows ? 'Show in Explorer' : platform === 'darwin' ? 'Reveal in Finder' : 'Show in File Manager';

  if (target.kind === 'background') {
    return [
      item('New Folder…', 'file:new-folder', { accelerator: 'CmdOrCtrl+Shift+N' }),
      item('New File…', 'file:new-file', { accelerator: 'CmdOrCtrl+N' }),
      item('Paste', 'edit:paste', { enabled: target.canPaste, accelerator: 'CmdOrCtrl+V' }),
      SEPARATOR,
      item('Open Terminal Here', 'file:open-terminal'),
      item('Copy Folder Path', 'file:copy-path', { accelerator: 'CmdOrCtrl+Shift+C' }),
      item('Add Folder to Favorites', 'go:add-favorite'),
      SEPARATOR,
      item('Refresh', 'file:refresh', { accelerator: 'CmdOrCtrl+R' })
    ];
  }

  const folder = target.kind === 'directory' || target.kind === 'symlink';
  const open: ContextMenuItem[] = folder
    ? [item('Open', 'item:open'), item('Open in Terminal', 'item:terminal'), item('Open with Cursor', 'item:open-cursor')]
    : [
        item('Open', 'item:open'),
        ...(windows ? [item('Open with Notepad', 'file:open-notepad')] : []),
        item('Open with Cursor', 'item:open-cursor'),
        ...(target.openWith ?? []).map((app) => item(`Open with ${app.label}`, `item:open-app:${app.appId}`))
      ];

  return [
    ...open,
    item(revealLabel, 'file:reveal'),
    SEPARATOR,
    item('Cut', 'edit:cut', { accelerator: 'CmdOrCtrl+X' }),
    item('Copy', 'edit:copy', { accelerator: 'CmdOrCtrl+C' }),
    item('Paste', 'edit:paste', { enabled: target.canPaste, accelerator: 'CmdOrCtrl+V' }),
    item('Copy to Other Pane', 'edit:copy-other', { enabled: target.canTransfer, accelerator: 'F5' }),
    item('Move to Other Pane', 'edit:move-other', { enabled: target.canTransfer, accelerator: 'F6' }),
    SEPARATOR,
    item('Copy Path', 'item:copy-path'),
    ...(target.kind === 'directory' ? [item('Add to Favorites', 'item:favorite')] : []),
    SEPARATOR,
    item('Rename…', 'file:rename', { accelerator: 'F2' }),
    item('Delete…', 'file:delete', { accelerator: 'Delete' })
  ];
}
