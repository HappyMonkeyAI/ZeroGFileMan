import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { expandCustomTerminalCommand, type TerminalLauncher } from '../shared/terminal-launcher.js';
import { resolveLocalPath } from './local-fs.js';

export type OpenTerminalRequest = {
  path: unknown;
  launcher?: unknown;
  customCommand?: unknown;
};

function spawnDetached(
  command: string,
  args: string[],
  options: { cwd?: string; shell?: boolean } = {}
): void {
  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    cwd: options.cwd,
    shell: options.shell ?? false,
    env: {
      ...process.env,
      ZEROG_OPEN_CWD: options.cwd ?? ''
    }
  });
  child.on('error', (error) => {
    console.error(`Terminal launch failed (${command}): ${error.message}`);
  });
  child.unref();
}

export function openSystemTerminal(absolutePath: string): void {
  if (process.platform === 'win32') {
    const child = spawn('wt.exe', ['-d', absolutePath], { detached: true, stdio: 'ignore' });
    child.on('error', () => {
      spawnDetached('cmd.exe', [
        '/c',
        'start',
        'powershell',
        '-NoExit',
        '-Command',
        `Set-Location -LiteralPath '${absolutePath.replace(/'/g, "''")}'`
      ]);
    });
    child.unref();
    return;
  }
  spawnDetached('x-terminal-emulator', ['--working-directory', absolutePath]);
}

function packagedZeroGTermPaths(): string[] {
  const home = homedir();
  const localApp = process.env.LOCALAPPDATA ?? join(home, 'AppData', 'Local');
  const exeName = 'ZeroG Terminal.exe';
  return [
    join(localApp, 'Programs', 'ZeroG Terminal', exeName),
    join(localApp, 'Programs', 'zerogterm', exeName),
    join(home, 'AppData', 'Local', 'Programs', 'ZeroG Terminal', exeName)
  ];
}

/** Launch ZeroG Term; prefers an installed exe, then a local checkout, then PATH CLI. */
export function openZeroGTerm(absolutePath: string): void {
  // Prefer --cwd so a running Term (single-instance) receives the path on argv;
  // ZEROG_OPEN_CWD remains as a cold-start fallback in the child env.
  const cwdArgs = ['--cwd', absolutePath];
  for (const exe of packagedZeroGTermPaths()) {
    if (existsSync(exe)) {
      spawnDetached(exe, cwdArgs, { cwd: absolutePath });
      return;
    }
  }

  const devRoot = join(homedir(), 'Documents', 'development', 'zerogterm');
  if (existsSync(join(devRoot, 'package.json'))) {
    const electronCmd = process.platform === 'win32' ? 'electron.cmd' : 'electron';
    spawnDetached(electronCmd, ['.', ...cwdArgs], { cwd: devRoot, shell: true });
    return;
  }

  const cli = process.platform === 'win32' ? 'zerogterm.cmd' : 'zerogterm';
  spawnDetached(cli, cwdArgs, { cwd: absolutePath, shell: true });
}

export function openCustomTerminal(absolutePath: string, customCommand: string): void {
  const [command, ...args] = expandCustomTerminalCommand(customCommand, absolutePath);
  spawnDetached(command, args, { cwd: absolutePath, shell: process.platform === 'win32' });
}

export function openTerminalForPath(request: OpenTerminalRequest): void {
  const target = resolveLocalPath(request.path);
  const launcher = (
    typeof request.launcher === 'string' ? request.launcher.trim().toLowerCase() : 'system'
  ) as TerminalLauncher;
  const custom = typeof request.customCommand === 'string' ? request.customCommand.trim() : '';

  if (launcher === 'zerogterm') {
    openZeroGTerm(target);
    return;
  }
  if (launcher === 'custom') {
    openCustomTerminal(target, custom);
    return;
  }
  openSystemTerminal(target);
}
