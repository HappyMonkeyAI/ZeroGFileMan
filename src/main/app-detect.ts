// Find launchable apps in the development store: projects whose package.json
// declares electron-builder fileAssociations. Prefer the unpacked exe, then a
// portable artifact, then the project's own Electron binary in dev mode.

import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import {
  packageAppName,
  packageAssociations,
  pickPortableExe,
  type AppLaunch,
  type DetectedApp
} from '../shared/file-apps.js';

export function defaultAppsRoot(): string {
  return join(homedir(), 'Documents', 'development');
}

function devElectronBinary(dir: string): string | null {
  const base = join(dir, 'node_modules', 'electron', 'dist');
  const candidate =
    process.platform === 'win32'
      ? join(base, 'electron.exe')
      : process.platform === 'darwin'
        ? join(base, 'Electron.app', 'Contents', 'MacOS', 'Electron')
        : join(base, 'electron');
  return existsSync(candidate) ? candidate : null;
}

async function launchForProject(dir: string, name: string, pkg: Record<string, unknown>): Promise<{ launch: AppLaunch; source: DetectedApp['source'] } | null> {
  const build = (pkg.build ?? {}) as Record<string, unknown>;
  const directories = (build.directories ?? {}) as Record<string, unknown>;
  const outputs = [...new Set([directories.output, 'dist', 'release'].filter((value): value is string => typeof value === 'string' && Boolean(value)))];

  for (const out of outputs) {
    const unpacked = join(dir, out, 'win-unpacked', `${name}.exe`);
    if (existsSync(unpacked)) return { launch: { command: unpacked, args: ['{file}'] }, source: 'unpacked' };
  }
  for (const out of outputs) {
    try {
      const exe = pickPortableExe(await readdir(join(dir, out)));
      if (exe) return { launch: { command: join(dir, out, exe), args: ['{file}'] }, source: 'portable' };
    } catch {
      /* no output folder */
    }
  }
  const electron = devElectronBinary(dir);
  if (electron) return { launch: { command: electron, args: ['.', '{file}'], cwd: dir }, source: 'dev' };
  return null;
}

/** Scan one folder depth for app projects; unreadable entries are skipped. */
export async function detectLocalApps(rootRaw: unknown): Promise<DetectedApp[]> {
  const root =
    typeof rootRaw === 'string' && rootRaw.trim() && isAbsolute(rootRaw.trim())
      ? rootRaw.trim()
      : defaultAppsRoot();
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const apps: DetectedApp[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const projectDir = join(root, entry.name);
    try {
      const pkg = JSON.parse(await readFile(join(projectDir, 'package.json'), 'utf8')) as Record<string, unknown>;
      const extensions = packageAssociations(pkg);
      if (!extensions.length) continue;
      const name = packageAppName(pkg) || entry.name;
      const found = await launchForProject(projectDir, name, pkg);
      if (!found) continue;
      apps.push({
        id: `detected:${entry.name}`,
        name,
        version: typeof pkg.version === 'string' ? pkg.version : '',
        extensions,
        launch: found.launch,
        source: found.source,
        projectDir
      });
    } catch {
      /* not an app project */
    }
  }
  return apps.sort((a, b) => a.name.localeCompare(b.name));
}
