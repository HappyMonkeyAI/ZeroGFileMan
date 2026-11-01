import { app, BrowserWindow, clipboard, ipcMain, safeStorage, session, shell } from 'electron';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#070b12',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(root, 'dist', 'main', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const distIndex = join(root, 'dist', 'renderer', 'index.html');
  if (existsSync(distIndex) && !process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadFile(distIndex);
  } else {
    const url = process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:5174/';
    void mainWindow.loadURL(url);
  }
}

installApplicationMenu(() => mainWindow);

function asKind(value: unknown): FileEntry['kind'] {
  if (value === 'directory' || value === 'symlink' || value === 'file') return value;
  throw new Error('Invalid entry kind.');
}

ipcMain.handle('fs:home', () => localHome());
ipcMain.handle('favorites:list', () => listFavorites());
ipcMain.handle('favorites:add', (_e, path: unknown, label?: unknown) => addFavorite(path, label));
ipcMain.handle('favorites:remove', (_e, path: unknown) => removeFavorite(path));
ipcMain.handle('fs:list', (_e, path?: unknown) =>
  listLocalDirectory(typeof path === 'string' ? path : undefined)
);
ipcMain.handle('fs:search', (_e, path: unknown, maxDepth?: unknown) =>
  searchLocalShallow(String(path), typeof maxDepth === 'number' ? maxDepth : 2)
);
ipcMain.handle('fs:thumbnail', (_e, path: unknown, maxEdge?: unknown) =>
  readThumbnail(path, typeof maxEdge === 'number' ? maxEdge : 256)
);
ipcMain.handle('fs:mkdir', (_e, path: unknown) => createLocalDirectory(String(path)));
ipcMain.handle('fs:rename', (_e, from: unknown, to: unknown) =>
  renameLocalEntry(String(from), String(to))
);
ipcMain.handle('fs:remove', (_e, path: unknown, kind: unknown) =>
  removeLocalEntry(String(path), asKind(kind))
);
ipcMain.handle('fs:copy', (_e, from: unknown, toDir: unknown) =>
  copyLocalEntry(String(from), String(toDir))
);
ipcMain.handle('fs:move', (_e, from: unknown, toDir: unknown) =>
  moveLocalEntry(String(from), String(toDir))
);
ipcMain.handle('clipboard:write', (_e, text: unknown) => {
  if (typeof text !== 'string') throw new Error('Clipboard text required.');
  clipboard.writeText(text);
});
ipcMain.handle('shell:openPath', async (_e, path: unknown) => {
  const target = resolveLocalPath(path);
  const err = await shell.openPath(target);
  if (err) throw new Error(err);
});
ipcMain.handle('shell:showItem', (_e, path: unknown) => {
  shell.showItemInFolder(resolveLocalPath(path));
});
ipcMain.handle('shell:openWith', async (_e, path: unknown, appName: unknown) => {
  const target = resolveLocalPath(path);
  const which = typeof appName === 'string' ? appName.trim().toLowerCase() : 'default';

  if (which === 'explorer' || which === 'reveal') {
    shell.showItemInFolder(target);
    return;
  }
  if (which === 'notepad' && process.platform === 'win32') {
    spawn('notepad.exe', [target], { detached: true, stdio: 'ignore' }).unref();
    return;
  }
  if (which === 'cursor') {
    const cmd = process.platform === 'win32' ? 'cursor.cmd' : 'cursor';
    spawn(cmd, [target], { detached: true, stdio: 'ignore', shell: true }).unref();
    return;
  }
  if (which === 'terminal') {
    if (process.platform === 'win32') {
      spawn('wt.exe', ['-d', target], { detached: true, stdio: 'ignore' }).on('error', () => {
        spawn('cmd.exe', ['/c', 'start', 'powershell', '-NoExit', '-Command', `Set-Location -LiteralPath '${target.replace(/'/g, "''")}'`], {
          detached: true,
          stdio: 'ignore'
        }).unref();
      });
    } else {
      spawn('x-terminal-emulator', ['--working-directory', target], { detached: true, stdio: 'ignore' }).unref();
    }
    return;
  }

  const err = await shell.openPath(target);
  if (err) throw new Error(err);
});

ipcMain.handle('speechKey:status', () => speechKeyStatus());
ipcMain.handle('speechKey:save', async (_event, key: unknown) => {
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
ipcMain.handle('speechKey:clear', async () => {
  sessionSpeechKey = null;
  await secrets.clear(SPEECH_API_KEY);
  return speechKeyStatus();
});
ipcMain.handle('speechKey:read', async () => (await secrets.get(SPEECH_API_KEY)) ?? sessionSpeechKey);

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media');
  });
  createWindow();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
