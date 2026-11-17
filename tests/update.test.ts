import { describe, expect, it } from 'vitest';
import {
  RELEASES_URL,
  compareVersions,
  isNewer,
  parseLatestRelease,
  releaseUrlFor,
  safeReleaseUrl,
  shouldPrompt,
  updateMode,
  type UpdateState
} from '../src/shared/update.js';
import { UpdateService, shortError, type InstallUpdater } from '../src/main/update-service.js';
import { parseUpdateSettings } from '../src/renderer/update-settings.js';
import { updatePromptBody, updateSummary } from '../src/renderer/update-view.js';

describe('how a build can update', () => {
  it('does nothing when unpackaged', () => {
    expect(updateMode({ isPackaged: false, platform: 'win32', env: {} })).toBe('disabled');
  });

  it('installs from the Windows installer', () => {
    expect(updateMode({ isPackaged: true, platform: 'win32', env: {} })).toBe('install');
  });

  it('only notifies from the portable executable or another packaged build', () => {
    expect(updateMode({ isPackaged: true, platform: 'win32', env: { PORTABLE_EXECUTABLE_FILE: 'C:/ZeroGFileMan.exe' } })).toBe('notify');
    expect(updateMode({ isPackaged: true, platform: 'linux', env: {} })).toBe('notify');
  });
});

describe('comparing versions', () => {
  it('orders by major, minor and patch numerically', () => {
    expect(isNewer('1.0.1', '1.0.0')).toBe(true);
    expect(isNewer('1.10.0', '1.9.9')).toBe(true);
    expect(isNewer('2.0.0', '10.0.0')).toBe(false);
    expect(compareVersions('v1.2.3', '1.2.3')).toBe(0);
  });

  it('ranks a release above its prereleases', () => {
    expect(isNewer('1.1.0', '1.1.0-beta.2')).toBe(true);
    expect(isNewer('1.1.0-beta.2', '1.1.0')).toBe(false);
    expect(isNewer('1.1.0-beta.10', '1.1.0-beta.2')).toBe(true);
  });

  it('never prompts on something that is not a version', () => {
    expect(isNewer('latest', '1.0.0')).toBe(false);
    expect(isNewer('9.9.9; rm -rf', '1.0.0')).toBe(false);
    expect(isNewer('', '1.0.0')).toBe(false);
  });
});

describe('release links', () => {
  it('keeps a link to one of the project releases', () => {
    expect(safeReleaseUrl(`${RELEASES_URL}/tag/v1.1.0`)).toBe(`${RELEASES_URL}/tag/v1.1.0`);
  });

  it('drops any query or fragment the network added', () => {
    expect(safeReleaseUrl(`${RELEASES_URL}/tag/v1.1.0?redirect=https://evil.example#x`)).toBe(`${RELEASES_URL}/tag/v1.1.0`);
  });

  it('falls back to the releases index for anything else', () => {
    for (const value of [
      'https://evil.example/HappyMonkeyAI/ZeroGFileMan/releases/tag/v1',
      'http://github.com/HappyMonkeyAI/ZeroGFileMan/releases/tag/v1',
      'https://github.com/HappyMonkeyAI/ZeroGFileManX/releases',
      'https://user:pw@github.com/HappyMonkeyAI/ZeroGFileMan/releases',
      'file:///etc/passwd',
      42,
      null
    ]) {
      expect(safeReleaseUrl(value), String(value)).toBe(RELEASES_URL);
    }
  });

  it('builds a tag link only from a real version', () => {
    expect(releaseUrlFor('1.2.0')).toBe(`${RELEASES_URL}/tag/v1.2.0`);
    expect(releaseUrlFor('../../x')).toBe(RELEASES_URL);
  });
});

describe('reading the latest release', () => {
  it('takes the tag and page', () => {
    expect(parseLatestRelease({ tag_name: 'v1.2.0', html_url: `${RELEASES_URL}/tag/v1.2.0`, body: '<script>' }))
      .toEqual({ version: '1.2.0', releaseUrl: `${RELEASES_URL}/tag/v1.2.0` });
  });

  it('ignores drafts, prereleases and junk', () => {
    expect(parseLatestRelease({ tag_name: 'v1.2.0', draft: true })).toBeNull();
    expect(parseLatestRelease({ tag_name: 'v1.2.0', prerelease: true })).toBeNull();
    expect(parseLatestRelease({ tag_name: 'nightly' })).toBeNull();
    expect(parseLatestRelease(null)).toBeNull();
  });
});

describe('when the popup shows', () => {
  const available: UpdateState = { status: 'available', mode: 'install', currentVersion: '1.0.0', version: '1.1.0', releaseUrl: RELEASES_URL };

  it('shows a found release unless it was skipped or put off', () => {
    expect(shouldPrompt(available, '', null)).toBe(true);
    expect(shouldPrompt(available, '1.1.0', null)).toBe(false);
    expect(shouldPrompt(available, '', '1.1.0')).toBe(false);
    expect(shouldPrompt(available, '1.0.5', '1.0.5')).toBe(true);
  });

  it('always answers a check the user asked for', () => {
    expect(shouldPrompt(available, '1.1.0', '1.1.0', true)).toBe(true);
  });

  it('stays closed when there is nothing to say', () => {
    expect(shouldPrompt(null, '', null)).toBe(false);
    expect(shouldPrompt({ status: 'current', mode: 'install', currentVersion: '1.0.0', checkedAt: 1 }, '', null, true)).toBe(false);
    expect(shouldPrompt({ status: 'error', mode: 'install', currentVersion: '1.0.0', message: 'x' }, '', null, true)).toBe(false);
  });
});

function fakeUpdater(version: string | null, options: { failDownload?: boolean } = {}) {
  const calls: string[] = [];
  let progress: ((progress: { percent: number }) => void) | undefined;
  const updater: InstallUpdater = {
    autoDownload: true,
    autoInstallOnAppQuit: false,
    async checkForUpdates() {
      calls.push('check');
      return version ? { updateInfo: { version } } : null;
    },
    async downloadUpdate() {
      calls.push('download');
      progress?.({ percent: 42.4 });
      if (options.failDownload) throw new Error('net::ERR_CONNECTION_RESET\n<html>…</html>');
      return [];
    },
    quitAndInstall() {
      calls.push('install');
    },
    on(_event, listener) {
      progress = listener;
      return updater;
    }
  };
  return { updater, calls };
}

describe('the update service', () => {
  it('checks nothing when disabled', async () => {
    let fetched = false;
    const service = new UpdateService({ mode: 'disabled', currentVersion: '1.0.0', fetchLatest: async () => { fetched = true; }, onChange: () => undefined });
    expect((await service.check()).status).toBe('idle');
    expect(fetched).toBe(false);
  });

  it('finds, downloads and installs only when asked', async () => {
    const { updater, calls } = fakeUpdater('1.1.0');
    const states: string[] = [];
    const service = new UpdateService({
      mode: 'install',
      currentVersion: '1.0.0',
      loadUpdater: async () => updater,
      fetchLatest: async () => { throw new Error('not used'); },
      onChange: (state) => states.push(state.status)
    });
    const found = await service.check();
    expect(found).toMatchObject({ status: 'available', version: '1.1.0', releaseUrl: `${RELEASES_URL}/tag/v1.1.0` });
    expect(updater.autoDownload).toBe(false);
    expect(calls).toEqual(['check']);
    service.install();
    expect(calls).toEqual(['check']);
    expect((await service.download()).status).toBe('ready');
    service.install();
    expect(calls).toEqual(['check', 'download', 'install']);
    expect(states).toEqual(['checking', 'available', 'downloading', 'downloading', 'ready']);
  });

  it('reports the current version as current', async () => {
    const { updater } = fakeUpdater('1.0.0');
    const service = new UpdateService({ mode: 'install', currentVersion: '1.0.0', loadUpdater: async () => updater, fetchLatest: async () => null, onChange: () => undefined });
    expect((await service.check()).status).toBe('current');
  });

  it('keeps a failed download to one short line', async () => {
    const { updater } = fakeUpdater('1.1.0', { failDownload: true });
    const service = new UpdateService({ mode: 'install', currentVersion: '1.0.0', loadUpdater: async () => updater, fetchLatest: async () => null, onChange: () => undefined });
    await service.check();
    expect(await service.download()).toMatchObject({ status: 'error', message: 'net::ERR_CONNECTION_RESET' });
  });

  it('only looks up the release page in notify mode, and never downloads', async () => {
    const service = new UpdateService({
      mode: 'notify',
      currentVersion: '1.0.0',
      fetchLatest: async () => ({ tag_name: 'v1.2.0', html_url: 'https://evil.example/' }),
      onChange: () => undefined
    });
    expect(await service.check()).toMatchObject({ status: 'available', version: '1.2.0', releaseUrl: RELEASES_URL });
    expect((await service.download()).status).toBe('available');
  });

  it('falls back to the release page when the installer cannot read the release', async () => {
    const updater = fakeUpdater(null).updater;
    updater.checkForUpdates = async () => { throw new Error('Cannot find latest.yml in the latest release artifacts'); };
    const service = new UpdateService({
      mode: 'install',
      currentVersion: '1.0.0',
      loadUpdater: async () => updater,
      fetchLatest: async () => ({ tag_name: 'v1.1.0', html_url: `${RELEASES_URL}/tag/v1.1.0` }),
      onChange: () => undefined
    });
    expect(await service.check()).toMatchObject({ status: 'available', mode: 'notify', version: '1.1.0' });
    expect((await service.download()).status).toBe('available');
  });

  it('turns a network failure into an error state, not a throw', async () => {
    const service = new UpdateService({ mode: 'notify', currentVersion: '1.0.0', fetchLatest: async () => { throw new Error('offline'); }, onChange: () => undefined });
    expect(await service.check()).toMatchObject({ status: 'error', message: 'offline' });
  });

  it('shortens long errors', () => {
    expect(shortError(new Error('x'.repeat(500)))).toHaveLength(198);
    expect(shortError('')).toBe('The update check failed.');
  });
});

describe('update wording and stored policy', () => {
  it('explains a build that cannot replace itself', () => {
    const state: UpdateState = { status: 'available', mode: 'notify', currentVersion: '1.0.0', version: '1.1.0', releaseUrl: RELEASES_URL };
    expect(updatePromptBody(state)).toMatch(/release page/);
    expect(updatePromptBody(state)).not.toMatch(/install/i);
    expect(updateSummary(state)).toBe('Version 1.1.0 is available.');
  });

  it('warns that restarting closes the window', () => {
    const state: UpdateState = { status: 'ready', mode: 'install', currentVersion: '1.0.0', version: '1.1.0', releaseUrl: RELEASES_URL };
    expect(updatePromptBody(state)).toMatch(/closes the FileMan window/);
  });

  it('says why a development build does not check', () => {
    expect(updateSummary({ status: 'idle', mode: 'disabled', currentVersion: '1.0.0' })).toMatch(/off/);
  });

  it('accepts only a real skipped version', () => {
    expect(parseUpdateSettings({ checkOnStartup: false, skippedVersion: 'v1.2.0' })).toEqual({ checkOnStartup: false, skippedVersion: '1.2.0' });
    expect(parseUpdateSettings({ checkOnStartup: 'yes', skippedVersion: '../../x' })).toEqual({ checkOnStartup: true, skippedVersion: '' });
    expect(parseUpdateSettings(null)).toEqual({ checkOnStartup: true, skippedVersion: '' });
  });
});
