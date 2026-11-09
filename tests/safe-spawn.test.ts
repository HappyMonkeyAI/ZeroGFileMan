import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { needsCmdShim, planSpawn } from '../src/main/safe-spawn.js';

const HOSTILE = 'C:\\Users\\me\\notes&echo INJECTED';

describe('planSpawn', () => {
  it('spawns directly off Windows, arguments untouched', () => {
    expect(planSpawn('cursor', [HOSTILE], 'linux')).toEqual({
      command: 'cursor',
      args: [HOSTILE],
      env: {},
      windowsVerbatimArguments: false
    });
  });

  it('spawns native Windows executables directly', () => {
    const plan = planSpawn('C:\\Apps\\Term.EXE', ['-d', HOSTILE], 'win32');
    expect(plan.command).toBe('C:\\Apps\\Term.EXE');
    expect(plan.args).toEqual(['-d', HOSTILE]);
    expect(plan.windowsVerbatimArguments).toBe(false);
  });

  it('routes shims through cmd.exe with every argument in its own variable', () => {
    const plan = planSpawn('cursor.cmd', [HOSTILE, ''], 'win32', 'C:\\Windows\\System32\\cmd.exe');
    expect(plan.command).toBe('C:\\Windows\\System32\\cmd.exe');
    expect(plan.args).toEqual(['/d', '/v:off', '/s', '/c', '""%ZEROG_ARG_0%" "%ZEROG_ARG_1%" """']);
    expect(plan.env).toEqual({ ZEROG_ARG_0: 'cursor.cmd', ZEROG_ARG_1: HOSTILE });
    expect(plan.windowsVerbatimArguments).toBe(true);
    // The untrusted path never appears on the cmd.exe command line itself.
    expect(plan.args.join(' ')).not.toContain('INJECTED');
  });

  it('rejects arguments with double quotes on Windows', () => {
    expect(() => planSpawn('tool.cmd', ['a"b'], 'win32')).toThrow(/double quotes/);
  });

  it('treats bare names and scripts as needing cmd', () => {
    expect(needsCmdShim('zerogterm')).toBe(true);
    expect(needsCmdShim('electron.cmd')).toBe(true);
    expect(needsCmdShim('run.BAT')).toBe(true);
    expect(needsCmdShim('wt.exe')).toBe(false);
  });
});

describe.runIf(process.platform === 'win32')('planSpawn on a real cmd.exe', () => {
  const root = mkdtempSync(join(tmpdir(), 'zerog-spawn-'));
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it('passes hostile names through a .cmd shim as literal arguments', () => {
    // The shim itself lives in a directory whose name is hostile too.
    const dir = join(root, 'shim dir&echo INJECTED');
    mkdirSync(dir);
    const shim = join(dir, 'echo-args.cmd');
    writeFileSync(shim, '@echo off\r\necho "%~1"\r\necho "%~2"\r\necho "%~3"\r\necho "%~4"\r\n');

    const args = [HOSTILE, '100%PATH%', 'bang!PATH!', 'pipe|more'];
    const plan = planSpawn(shim, args);
    const result = spawnSync(plan.command, plan.args, {
      env: { ...process.env, ...plan.env },
      windowsVerbatimArguments: plan.windowsVerbatimArguments,
      encoding: 'utf8'
    });

    expect(result.status).toBe(0);
    const lines = result.stdout.trim().split(/\r?\n/);
    expect(lines).toEqual(args.map((a) => `"${a}"`));
  });
});
