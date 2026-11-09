// Launch external programs without letting a path become shell syntax.
//
// Filenames are untrusted: on Windows `&`, `|`, `^`, `%` and `!` are all legal
// in a name, and Node's `shell: true` joins arguments unescaped into one cmd.exe
// line (DEP0190). So nothing here ever uses `shell: true`.
//
// Native executables are spawned directly. Everything else on Windows (`.cmd`
// / `.bat` shims such as `cursor.cmd`, or a bare name resolved via PATHEXT)
// needs cmd.exe, so each argument is passed through its own environment
// variable and referenced as a quoted `"%ZEROG_ARG_n%"`. cmd expands `%VAR%`
// once, before it parses `&|<>^`, and does not re-expand the result; inside
// quotes those characters are inert, and Windows paths cannot contain `"`.
// Delayed expansion is forced off so `!` stays literal.

import { spawn } from 'node:child_process';
import { extname } from 'node:path';

export type SpawnPlan = {
  command: string;
  args: string[];
  /** Extra environment for the child (merged over process.env). */
  env: Record<string, string>;
  windowsVerbatimArguments: boolean;
};

const ARG_VAR_PREFIX = 'ZEROG_ARG_';
const NATIVE_EXTENSIONS = new Set(['.exe', '.com']);

/** Does this command need cmd.exe to run on Windows? */
export function needsCmdShim(command: string): boolean {
  return !NATIVE_EXTENSIONS.has(extname(command).toLowerCase());
}

export function planSpawn(
  command: string,
  args: readonly string[],
  platform: NodeJS.Platform = process.platform,
  comspec: string = process.env.ComSpec ?? 'cmd.exe'
): SpawnPlan {
  if (!command) throw new Error('A command is required.');
  if (platform !== 'win32' || !needsCmdShim(command)) {
    return { command, args: [...args], env: {}, windowsVerbatimArguments: false };
  }

  const env: Record<string, string> = {};
  const tokens = [command, ...args].map((value, index) => {
    if (value.includes('"')) throw new Error('Arguments cannot contain double quotes.');
    // An empty Windows environment variable is unset, and cmd would leave
    // `%NAME%` in place, so pass empty arguments as a literal "".
    if (!value) return '""';
    const name = `${ARG_VAR_PREFIX}${index}`;
    env[name] = value;
    return `"%${name}%"`;
  });

  return {
    command: comspec,
    // /d skip AutoRun, /v:off no `!` expansion, /s strip only the outer quotes.
    args: ['/d', '/v:off', '/s', '/c', `"${tokens.join(' ')}"`],
    env,
    windowsVerbatimArguments: true
  };
}

export type DetachedOptions = {
  cwd?: string;
  env?: Record<string, string>;
  /** Called if the program cannot be started (e.g. not installed). */
  onError?: (error: Error) => void;
};

/** Start a program detached from FileMan; failures are logged, not thrown. */
export function spawnDetached(command: string, args: readonly string[], options: DetachedOptions = {}): void {
  const plan = planSpawn(command, args);
  const child = spawn(plan.command, plan.args, {
    detached: true,
    stdio: 'ignore',
    cwd: options.cwd,
    shell: false,
    windowsVerbatimArguments: plan.windowsVerbatimArguments,
    env: { ...process.env, ...options.env, ...plan.env }
  });
  child.on('error', (error) => {
    if (options.onError) options.onError(error);
    else console.error(`Launch failed (${command}): ${error.message}`);
  });
  child.unref();
}
