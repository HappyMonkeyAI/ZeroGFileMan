import { describe, expect, it } from 'vitest';
import { endpointNotices } from '../src/shared/endpoints.js';

const tones = (url: string, hasKey: boolean) => endpointNotices(url, hasKey).map((n) => n.tone);

describe('endpointNotices', () => {
  it('says nothing about an empty or blank field', () => {
    expect(endpointNotices('', true)).toEqual([]);
    expect(endpointNotices('   ', true)).toEqual([]);
  });

  it('says nothing about a loopback server, key or not, http or not', () => {
    for (const url of [
      'http://127.0.0.1:8080/v1/audio/transcriptions',
      'http://localhost:8080/v1',
      'http://[::1]:8080/v1',
      // Normalises to hostname `[::1]` — brackets included. Guards LOOPBACK_HOSTNAMES.
      'http://[0:0:0:0:0:0:0:1]:8080/v1',
      'http://whisper.localhost/v1'
    ]) {
      expect(endpointNotices(url, true)).toEqual([]);
    }
  });

  it('refuses things that are not http(s) URLs with a host', () => {
    for (const url of ['file:///C:/x', 'ws://10.0.0.5/v1', 'not a url', '10.0.0.5:8080']) {
      expect(tones(url, false)).toEqual(['danger']);
      expect(endpointNotices(url, false)[0].text).toMatch(/refused/);
    }
  });

  it('warns that speech leaves the machine for any non-loopback host', () => {
    const notices = endpointNotices('https://api.example.com/v1/audio/transcriptions', true);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ tone: 'warn' });
    expect(notices[0].text).toContain('api.example.com');
  });

  it('flags a key sent over plain http to another host, worst first', () => {
    const notices = endpointNotices('http://10.0.0.5:8080/v1/audio/transcriptions', true);
    expect(notices.map((n) => n.tone)).toEqual(['danger', 'warn']);
    expect(notices[0].text).toMatch(/unencrypted/);
    expect(notices[0].text).toContain('10.0.0.5:8080');
  });

  it('does not flag clear-text http when there is no key to leak', () => {
    expect(tones('http://10.0.0.5:8080/v1', false)).toEqual(['warn']);
  });
});
