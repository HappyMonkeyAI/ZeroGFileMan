import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const electronDir = join(root, 'node_modules', 'electron');
const pathFile = join(electronDir, 'path.txt');

function resolveBinary() {
  if (process.env.ELECTRON_OVERRIDE_DIST_PATH) {
    const name = existsSync(pathFile) ? readFileSync(pathFile, 'utf8').trim() : process.platform === 'win32' ? 'electron.exe' : 'electron';
    return join(process.env.ELECTRON_OVERRIDE_DIST_PATH, name);
  }
  if (existsSync(pathFile)) {
    const name = readFileSync(pathFile, 'utf8').trim();
    const full = join(electronDir, 'dist', name);
    if (existsSync(full)) return full;
  }
  const fallback = join(electronDir, 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
  if (existsSync(fallback)) return fallback;
  return null;
}

const binary = resolveBinary();
if (!binary) {
  console.error('Electron binary not found under node_modules/electron/dist.');
  console.error('Install once with: node node_modules/electron/install.js');
  process.exit(1);
}

const child = spawn(binary, ['.', ...process.argv.slice(2)], {
  cwd: root,
  stdio: 'inherit',
  windowsHide: false
});

child.on('exit', (code, signal) => {
  if (code === null) {
    console.error(`Electron exited with signal ${signal}`);
    process.exit(1);
  }
  process.exit(code);
});
