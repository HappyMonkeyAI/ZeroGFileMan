import { describe, expect, it } from 'vitest';
import {
  parseServerTranscriptionInput,
  parseTranscriptionText,
  transcribeViaServer,
  type ServerTranscriptionRequest
} from '../src/shared/speech-server.js';

const URL_ = 'http://10.0.0.5:8080/v1/audio/transcriptions';
const audio = () => Float32Array.from([0, 0.5, -0.5]);

type Call = { url: string; init: RequestInit };
function fakeFetch(...replies: Array<{ status: number; body: string }>) {
  const calls: Call[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const reply = replies[Math.min(calls.length - 1, replies.length - 1)];
    return new Response(reply.body, { status: reply.status });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const request = (extra: Partial<ServerTranscriptionRequest> = {}): ServerTranscriptionRequest => ({
  url: URL_,
  model: 'whisper-1',
  language: 'auto',
  audio: audio(),
  ...extra
});

describe('parseServerTranscriptionInput', () => {
  it('accepts a well-formed request and never carries a key through', () => {
    const parsed = parseServerTranscriptionInput({ url: URL_, model: 'm', language: 'en', audio: audio(), apiKey: 'sk-x' });
    expect(parsed).toEqual({ url: URL_, model: 'm', language: 'en', audio: audio() });
    expect('apiKey' in parsed).toBe(false);
  });

  it('rejects malformed input from the renderer', () => {
    const ok = { url: URL_, model: 'm', language: 'en', audio: audio() };
    expect(() => parseServerTranscriptionInput(null)).toThrow();
    expect(() => parseServerTranscriptionInput({ ...ok, url: 'file:///C:/x' })).toThrow(/http/);
    expect(() => parseServerTranscriptionInput({ ...ok, audio: [0.1, 0.2] })).toThrow(/audio/);
    expect(() => parseServerTranscriptionInput({ ...ok, audio: new Float32Array(0) })).toThrow(/audio/);
    expect(() => parseServerTranscriptionInput({ ...ok, audio: new Float32Array(121 * 16000) })).toThrow(/too long/);
    expect(() => parseServerTranscriptionInput({ ...ok, sampleRate: 1 })).toThrow(/sample rate/);
  });
});

describe('transcribeViaServer', () => {
  it('posts multipart WAV with a Bearer key and returns the text', async () => {
    const { impl, calls } = fakeFetch({ status: 200, body: '{"text":" open docs "}' });
    await expect(transcribeViaServer(request({ apiKey: 'sk-test', language: 'en' }), impl)).resolves.toBe('open docs');
    expect(calls).toHaveLength(1);
    expect(new Headers(calls[0].init.headers).get('authorization')).toBe('Bearer sk-test');
    const form = calls[0].init.body as FormData;
    expect(form.get('model')).toBe('whisper-1');
    expect(form.get('language')).toBe('en');
    expect((form.get('file') as Blob).size).toBe(44 + 3 * 2);
  });

  it('sends no Authorization header and no language when not set', async () => {
    const { impl, calls } = fakeFetch({ status: 200, body: 'plain transcript' });
    await expect(transcribeViaServer(request(), impl)).resolves.toBe('plain transcript');
    expect(new Headers(calls[0].init.headers).has('authorization')).toBe(false);
    expect((calls[0].init.body as FormData).has('language')).toBe(false);
  });

  it('retries as JSON only for the explicit LM Studio 415', async () => {
    const lm = fakeFetch(
      { status: 415, body: "POST requests must use 'application/json'" },
      { status: 200, body: '{"text":"hi"}' }
    );
    await expect(transcribeViaServer(request(), lm.impl)).resolves.toBe('hi');
    expect(lm.calls).toHaveLength(2);
    expect(JSON.parse(lm.calls[1].init.body as string).file).toMatch(/^data:audio\/wav;base64,/);

    const generic = fakeFetch({ status: 415, body: 'unsupported' });
    await expect(transcribeViaServer(request(), generic.impl)).rejects.toThrow(/415/);
    expect(generic.calls).toHaveLength(1);
  });

  it('hints at a missing key on 401', async () => {
    const { impl } = fakeFetch({ status: 401, body: 'unauthorized' });
    await expect(transcribeViaServer(request(), impl)).rejects.toThrow(/wants an API key/);
  });

  it('uses the chat-completions shape for that endpoint', async () => {
    const { impl, calls } = fakeFetch({ status: 200, body: '{"choices":[{"message":{"content":"ok"}}]}' });
    await expect(
      transcribeViaServer(request({ url: 'http://127.0.0.1:1234/v1/chat/completions' }), impl)
    ).resolves.toBe('ok');
    const body = JSON.parse(calls[0].init.body as string);
    expect(body.messages[0].content[1].input_audio.format).toBe('wav');
  });
});

describe('parseTranscriptionText', () => {
  it('reads text, segments, and plain strings', () => {
    expect(parseTranscriptionText({ text: 'a' })).toBe('a');
    expect(parseTranscriptionText({ segments: [{ text: 'a' }, { text: 'b' }] })).toBe('a b');
    expect(parseTranscriptionText('  x ')).toBe('x');
    expect(parseTranscriptionText({})).toBeNull();
  });
});
