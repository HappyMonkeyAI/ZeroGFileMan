import {
  app,
  BrowserWindow,
  clipboard,
  ipcMain,
  Menu,
  safeStorage,
  session,
  shell,
  type IpcMainInvokeEvent
} from 'electron';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildContextMenu, parseContextMenuTarget } from '../shared/context-menu.js';
import { parseServerTranscriptionInput, transcribeViaServer } from '../shared/speech-server.js';
import { isAppUrl, type AppLocation } from './app-origin.js';
import { installApplicationMenu } from './app-menu.js';
import { addFavorite, listFavorites, removeFavorite } from './favorites-store.js';
import {
  copyLocalEntry,
  createLocalDirectory,
  listLocalDirectory,
  localHome,
  moveLocalEntry,
  removeLocalEntry,
  renameLocalEntry,
  resolveLocalPath,
  searchLocalShallow
} from './local-fs.js';
import { defaultSecretsPath, SecretStore, SPEECH_API_KEY } from './secret-store.js';
import { spawnDetached } from './safe-spawn.js';
import { openSystemTerminal, openTerminalForPath } from './terminal-launch.js';
import { readThumbnail } from './thumbnails.js';
import type { FileEntry, SpeechApiKeyStatus } from '../shared/types.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let mainWindow: BrowserWindow | undefined;

const secrets = new SecretStore({
  filePath: defaultSecretsPath(app.getPath('userData')),
  crypto: safeStorage
});
/** Fallback when safeStorage encryption is unavailable — never written to disk. */
let sessionSpeechKey: string | null = null;

async function speechKeyStatus(): Promise<SpeechApiKeyStatus> {
  const stored = (await secrets.has(SPEECH_API_KEY)) || Boolean(sessionSpeechKey);
  return {
    stored,
    encryptionAvailable: secrets.encryptionAvailable(),
    sessionOnly: Boolean(sessionSpeechKey) && !(await secrets.has(SPEECH_API_KEY))
  };
}

const distIndex = join(root, 'dist', 'renderer', 'index.html');
const appLocation: AppLocation =
  existsSync(distIndex) && !process.env.VITE_DEV_SERVER_URL
    ? { kind: 'file', url: pathToFileURL(distIndex).href }
    : { kind: 'dev', url: process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:5174/' };

function createWindow(): void {
  const iconPath = join(root, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png');
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#070b12',
    autoHideMenuBar: true,
    ...(existsSync(iconPath) ? { icon: iconPath } : {}),
    webPreferences: {
      preload: join(root, 'dist', 'main', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // The preload stays attached across navigations, so the window may only ever
  // show the app itself: no dropped files, links, redirects or popups.
  const blockForeign = (event: Electron.Event, url: string) => {
    if (!isAppUrl(url, appLocation)) {
      event.preventDefault();
      console.warn(`Blocked navigation to ${url}`);
    }
  };
  mainWindow.webContents.on('will-navigate', blockForeign);
  mainWindow.webContents.on('will-redirect', blockForeign);
  mainWindow.webContents.on('will-attach-webview', (event) => event.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  if (appLocation.kind === 'file') {
    void mainWindow.loadFile(distIndex);
  } else {
    void mainWindow.loadURL(appLocation.url);
  }
}

installApplicationMenu(() => mainWindow);

/** ipcMain.handle, but only for calls from the app's own page. */
function handle(
  channel: string,
  listener: (event: IpcMainInvokeEvent, ...args: any[]) => unknown
): void {
  ipcMain.handle(channel, (event, ...args) => {
    if (!isAppUrl(event.senderFrame?.url, appLocation)) {
      throw new Error(`Refused ${channel} from an untrusted page.`);
    }
    return listener(event, ...args);
  });
}

function asKind(value: unknown): FileEntry['kind'] {
  if (value === 'directory' || value === 'symlink' || value === 'file') return value;
  throw new Error('Invalid entry kind.');
}

handle('fs:home', () => localHome());
handle('favorites:list', () => listFavorites());
handle('favorites:add', (_e, path: unknown, label?: unknown) => addFavorite(path, label));
handle('favorites:remove', (_e, path: unknown) => removeFavorite(path));
handle('fs:list', (_e, path?: unknown) =>
  listLocalDirectory(typeof path === 'string' ? path : undefined)
);
handle('fs:search', (_e, path: unknown, maxDepth?: unknown) =>
  searchLocalShallow(String(path), typeof maxDepth === 'number' ? maxDepth : 2)
);
handle('fs:thumbnail', (_e, path: unknown, maxEdge?: unknown) =>
  readThumbnail(path, typeof maxEdge === 'number' ? maxEdge : 256)
);
handle('fs:mkdir', (_e, path: unknown) => createLocalDirectory(String(path)));
handle('fs:rename', (_e, from: unknown, to: unknown) =>
  renameLocalEntry(String(from), String(to))
);
handle('fs:remove', (_e, path: unknown, kind: unknown) =>
  removeLocalEntry(String(path), asKind(kind))
);
handle('fs:copy', (_e, from: unknown, toDir: unknown) =>
  copyLocalEntry(String(from), String(toDir))
);
handle('fs:move', (_e, from: unknown, toDir: unknown) =>
  moveLocalEntry(String(from), String(toDir))
);
handle('clipboard:write', (_e, text: unknown) => {
  if (typeof text !== 'string') throw new Error('Clipboard text required.');
  clipboard.writeText(text);
});
handle('shell:openPath', async (_e, path: unknown) => {
  const target = resolveLocalPath(path);
  const err = await shell.openPath(target);
  if (err) throw new Error(err);
});
handle('shell:showItem', (_e, path: unknown) => {
  shell.showItemInFolder(resolveLocalPath(path));
});
handle('shell:openWith', async (_e, path: unknown, appName: unknown) => {
  const target = resolveLocalPath(path);
  const which = typeof appName === 'string' ? appName.trim().toLowerCase() : 'default';

  if (which === 'explorer' || which === 'reveal') {
    shell.showItemInFolder(target);
    return;
  }
  if (which === 'notepad' && process.platform === 'win32') {
    spawnDetached('notepad.exe', [target]);
    return;
  }
  if (which === 'cursor') {
    spawnDetached(process.platform === 'win32' ? 'cursor.cmd' : 'cursor', [target]);
    return;
  }
  if (which === 'terminal') {
    openSystemTerminal(target);
    return;
  }

  const err = await shell.openPath(target);
  if (err) throw new Error(err);
});

handle('shell:openTerminal', (_e, path: unknown, options?: unknown) => {
  const opts =
    options && typeof options === 'object'
      ? (options as { launcher?: unknown; customCommand?: unknown })
      : {};
  openTerminalForPath({
    path,
    launcher: opts.launcher,
    customCommand: opts.customCommand
  });
});

handle('contextMenu:show', (event, raw: unknown) => {
  const target = parseContextMenuTarget(raw);
  const window = BrowserWindow.fromWebContents(event.sender) ?? undefined;
  const menu = Menu.buildFromTemplate(
    buildContextMenu(target, process.platform).map((entry) =>
      entry.type === 'separator'
        ? { type: 'separator' as const }
        : {
            label: entry.label,
            enabled: entry.enabled ?? true,
            accelerator: entry.accelerator,
            // Shortcut hints only; the renderer and app menu own the real bindings.
            registerAccelerator: false,
            click: () => event.sender.send('menu:command', entry.command)
          }
    )
  );
  menu.popup({ window });
});

handle('speechKey:status', () => speechKeyStatus());
handle('speechKey:save', async (_event, key: unknown) => {
  const value = typeof key === 'string' ? key.trim() : '';
  if (!value) {
    sessionSpeechKey = null;
    await secrets.clear(SPEECH_API_KEY);
    return speechKeyStatus();
  }
  if (secrets.encryptionAvailable()) {
    sessionSpeechKey = null;
    await secrets.set(SPEECH_API_KEY, value);
  } else {
    // Refuse silent plaintext on disk; keep in-memory for this session only.
    sessionSpeechKey = value;
  }
  return speechKeyStatus();
});
handle('speechKey:clear', async () => {
  sessionSpeechKey = null;
  await secrets.clear(SPEECH_API_KEY);
  return speechKeyStatus();
});
// The key is used here and never returned to the renderer.
handle('speech:transcribeServer', async (_event, raw: unknown) => {
  const input = parseServerTranscriptionInput(raw);
  const apiKey = (await secrets.get(SPEECH_API_KEY)) ?? sessionSpeechKey ?? undefined;
  return transcribeViaServer({ ...input, apiKey });
});

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    // Judge the frame that asked, not just the top-level page.
    const requester = details.requestingUrl || webContents.getURL();
    callback(permission === 'media' && isAppUrl(requester, appLocation));
  });
  createWindow();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
