import { describe, expect, it } from 'vitest';
import { isAppUrl, type AppLocation } from '../src/main/app-origin.js';

const packaged: AppLocation = {
  kind: 'file',
  url: 'file:///C:/Program%20Files/ZeroG%20FileMan/resources/app/dist/renderer/index.html'
};
const dev: AppLocation = { kind: 'dev', url: 'http://127.0.0.1:5174/' };

describe('isAppUrl', () => {
  it('accepts the bundled index.html, with any hash or query', () => {
    expect(isAppUrl(packaged.url, packaged, 'win32')).toBe(true);
    expect(isAppUrl(`${packaged.url}#/pane`, packaged, 'win32')).toBe(true);
    expect(isAppUrl(`${packaged.url}?x=1`, packaged, 'win32')).toBe(true);
  });

  it('ignores drive-letter and path case on Windows only', () => {
    const lower = 'file:///c:/program%20files/zerog%20fileman/resources/app/dist/renderer/index.html';
    expect(isAppUrl(lower, packaged, 'win32')).toBe(true);
    expect(isAppUrl(lower, packaged, 'linux')).toBe(false);
  });

  it('refuses a dropped local file or any other page', () => {
    expect(isAppUrl('file:///C:/Users/me/Downloads/evil.html', packaged, 'win32')).toBe(false);
    expect(isAppUrl('https://example.com/', packaged, 'win32')).toBe(false);
    expect(isAppUrl('file://attacker-host/share/index.html', packaged, 'win32')).toBe(false);
    expect(isAppUrl('about:blank', packaged, 'win32')).toBe(false);
  });

  it('refuses missing or malformed URLs', () => {
    expect(isAppUrl(undefined, packaged)).toBe(false);
    expect(isAppUrl(null, packaged)).toBe(false);
    expect(isAppUrl('', packaged)).toBe(false);
    expect(isAppUrl('not a url', packaged)).toBe(false);
  });

  it('allows only the dev server origin in development', () => {
    expect(isAppUrl('http://127.0.0.1:5174/', dev)).toBe(true);
    expect(isAppUrl('http://127.0.0.1:5174/src/renderer/main.tsx', dev)).toBe(true);
    expect(isAppUrl('http://127.0.0.1:5175/', dev)).toBe(false);
    expect(isAppUrl('http://localhost:5174/', dev)).toBe(false);
    expect(isAppUrl('file:///C:/evil.html', dev)).toBe(false);
  });
});
