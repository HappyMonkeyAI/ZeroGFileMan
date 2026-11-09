import { describe, expect, it } from 'vitest';
import { DEFAULT_SPEECH, SpeechClient, type SpeechProgress, type SpeechWorker } from '../src/renderer/speech.js';
import type { SpeechSettings } from '../src/shared/types.js';

const BUILTIN: SpeechSettings = { ...DEFAULT_SPEECH, engine: 'builtin' };

function fakeWorker() {
  const sent: Array<Record<string, unknown>> = [];
  let terminated = 0;
  const worker: SpeechWorker = {
    onmessage: null,
    onerror: null,
    postMessage: (message) => {
      sent.push(message as Record<string, unknown>);
    },
    terminate: () => {
      terminated += 1;
    }
  };
  return {
    worker,
    sent,
    terminatedCount: () => terminated,
    reply(message: Record<string, unknown>) {
      worker.onmessage?.({ data: message });
    },
    fail(message: string) {
      worker.onerror?.({ message });
    }
  };
}

function audio(values = [0.1, 0.2]) {
  return Float32Array.from(values);
}

describe('SpeechClient demo', () => {
  it('returns typed transcript', async () => {
    const client = new SpeechClient();
    await expect(client.transcribe(audio(), DEFAULT_SPEECH, undefined, ' open docs ')).resolves.toEqual({
      text: 'open docs',
      elapsedMs: expect.any(Number),
      engine: 'demo'
    });
  });

  it('rejects empty demo text', async () => {
    const client = new SpeechClient();
    await expect(client.transcribe(audio(), DEFAULT_SPEECH, undefined, '  ')).rejects.toThrow(
      /typed transcript/
    );
  });
});

describe('SpeechClient builtin', () => {
  it('sends model config to the worker', async () => {
    const fake = fakeWorker();
    const client = new SpeechClient({ createWorker: () => fake.worker });
    const settings: SpeechSettings = {
      ...BUILTIN,
      model: 'onnx-community/whisper-small',
      precision: 'fp16',
      device: 'webgpu',
      language: 'de',
      task: 'translate'
    };
    const pending = client.transcribe(audio(), settings);
    expect(fake.sent).toHaveLength(1);
    expect(fake.sent[0].config).toEqual({
      model: 'onnx-community/whisper-small',
      precision: 'fp16',
      device: 'webgpu',
      language: 'de',
      task: 'translate',
      multilingual: true
    });
    fake.reply({ type: 'result', id: (fake.sent[0] as { id: number }).id, text: '  open  ', elapsedMs: 12 });
    await expect(pending).resolves.toEqual({ text: '  open  ', elapsedMs: 12, engine: 'builtin' });
  });

  it('marks English-only models as not multilingual', async () => {
    const fake = fakeWorker();
    const client = new SpeechClient({ createWorker: () => fake.worker });
    void client.transcribe(audio(), BUILTIN);
    expect((fake.sent[0].config as { multilingual: boolean }).multilingual).toBe(false);
  });

  it('reports progress and notices', async () => {
    const fake = fakeWorker();
    const client = new SpeechClient({ createWorker: () => fake.worker });
    const progress: SpeechProgress[] = [];
    const pending = client.transcribe(audio(), BUILTIN, (update) => progress.push(update));
    const id = (fake.sent[0] as { id: number }).id;
    fake.reply({ type: 'loading', id, progress: 40 });
    fake.reply({ type: 'notice', id, message: 'WebGPU unavailable; using WASM' });
    fake.reply({ type: 'result', id, text: 'ok', elapsedMs: 5 });
    await pending;
    expect(progress).toEqual([
      { kind: 'loading', progress: 40 },
      { kind: 'notice', message: 'WebGPU unavailable; using WASM' }
    ]);
  });

  it('fails in-flight work when the worker dies', async () => {
    const fake = fakeWorker();
    const client = new SpeechClient({ createWorker: () => fake.worker });
    const pending = client.transcribe(audio(), BUILTIN);
    fake.fail('module load failed');
    await expect(pending).rejects.toThrow('module load failed');
  });
});

describe('SpeechClient server', () => {
  const SERVER: SpeechSettings = { ...DEFAULT_SPEECH, engine: 'server', serverUrl: 'http://10.0.0.5:8080/v1/audio/transcriptions' };

  it('hands audio and settings to main, with no key in the request', async () => {
    const requests: unknown[] = [];
    const client = new SpeechClient({
      transcribeServer: async (request) => {
        requests.push(request);
        return 'open docs';
      }
    });
    await expect(client.transcribe(audio(), SERVER)).resolves.toMatchObject({ text: 'open docs', engine: 'server' });
    expect(requests).toEqual([
      { url: SERVER.serverUrl, model: SERVER.serverModel, language: SERVER.language, audio: audio() }
    ]);
  });

  it('fails clearly when no server bridge is wired in', async () => {
    await expect(new SpeechClient().transcribe(audio(), SERVER)).rejects.toThrow(/not available/);
  });
});
