// One way in for speech recognition, whichever engine is configured.
//
// Demo uses typed transcript. Builtin runs Transformers.js Whisper in a worker.
// Server posts WAV to an OpenAI-compatible transcription endpoint.

import type { SpeechSettings } from '../shared/types.js';
import { DEFAULT_SPEECH_MODEL, supportsLanguageSelection } from './speech-models.js';
import { transcribeViaServer } from './speech-server.js';

export type SpeechProgress =
  | { kind: 'loading'; progress: number | null }
  | { kind: 'notice'; message: string };

export type SpeechResult = {
  text: string;
  elapsedMs: number;
  engine: SpeechSettings['engine'];
};

/** The worker surface used here; a fake stands in for it in tests. */
export type SpeechWorker = {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  terminate(): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
};

type WorkerResult = { text: string; elapsedMs: number };

type Pending = {
  resolve(result: WorkerResult): void;
  reject(error: Error): void;
  onProgress?: (progress: SpeechProgress) => void;
};

export type SpeechClientOptions = {
  createWorker?: () => SpeechWorker;
  fetchImpl?: typeof fetch;
  now?: () => number;
  resolveApiKey?: () => Promise<string | null>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export class SpeechClient {
  private worker: SpeechWorker | null = null;
  private pending = new Map<number, Pending>();
  private nextId = 1;

  constructor(private readonly options: SpeechClientOptions = {}) {}

  async transcribe(
    audio: Float32Array,
    settings: SpeechSettings,
    onProgress?: (progress: SpeechProgress) => void,
    demoText?: string
  ): Promise<SpeechResult> {
    const now = this.options.now ?? (() => Date.now());
    const started = now();

    if (settings.engine === 'demo') {
      onProgress?.({ kind: 'notice', message: 'Demo mode — using typed transcript' });
      const text = (demoText ?? '').trim();
      if (!text) throw new Error('Demo mode needs a typed transcript.');
      return { text, elapsedMs: now() - started, engine: 'demo' };
    }

    if (settings.engine === 'server') {
      onProgress?.({ kind: 'loading', progress: null });
      const apiKey = (await this.options.resolveApiKey?.().catch(() => null)) ?? undefined;
      const text = await transcribeViaServer(
        {
          url: settings.serverUrl,
          model: settings.serverModel,
          language: settings.language,
          audio,
          apiKey
        },
        this.options.fetchImpl ?? fetch
      );
      return { text, elapsedMs: now() - started, engine: 'server' };
    }

    const result = await this.transcribeInWorker(audio, settings, onProgress);
    return { ...result, engine: 'builtin' };
  }

  private transcribeInWorker(
    audio: Float32Array,
    settings: SpeechSettings,
    onProgress?: (progress: SpeechProgress) => void
  ): Promise<WorkerResult> {
    const worker = this.ensureWorker();
    const id = this.nextId++;
    return new Promise<WorkerResult>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onProgress });
      worker.postMessage(
        {
          type: 'transcribe',
          id,
          audio,
          config: {
            model: settings.model,
            precision: settings.precision,
            device: settings.device,
            language: settings.language,
            task: settings.task,
            multilingual: supportsLanguageSelection(settings.model)
          }
        },
        [audio.buffer]
      );
    });
  }

  private ensureWorker(): SpeechWorker {
    if (this.worker) return this.worker;
    if (!this.options.createWorker) {
      throw new Error('Builtin speech needs a createWorker factory.');
    }
    const worker = this.options.createWorker();
    worker.onmessage = (event) => this.handleMessage(event.data);
    worker.onerror = (event) => {
      const message =
        isRecord(event) && typeof event.message === 'string' ? event.message : 'Speech worker failed';
      this.failAll(new Error(message));
      this.worker = null;
    };
    this.worker = worker;
    return worker;
  }

  private handleMessage(data: unknown): void {
    if (!isRecord(data) || typeof data.id !== 'number') return;
    const pending = this.pending.get(data.id);
    if (!pending) return;

    if (data.type === 'loading') {
      pending.onProgress?.({
        kind: 'loading',
        progress: typeof data.progress === 'number' ? data.progress : null
      });
      return;
    }
    if (data.type === 'notice') {
      pending.onProgress?.({ kind: 'notice', message: String(data.message) });
      return;
    }
    if (data.type === 'result') {
      this.pending.delete(data.id);
      pending.resolve({
        text: typeof data.text === 'string' ? data.text : '',
        elapsedMs: typeof data.elapsedMs === 'number' ? data.elapsedMs : 0
      });
      return;
    }
    if (data.type === 'error') {
      this.pending.delete(data.id);
      pending.reject(new Error(typeof data.message === 'string' ? data.message : 'Transcription failed'));
    }
  }

  private failAll(error: Error): void {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }

  dispose(): void {
    this.failAll(new Error('Speech client disposed'));
    this.worker?.terminate();
    this.worker = null;
  }
}

export const DEFAULT_SPEECH: SpeechSettings = {
  engine: 'demo',
  model: DEFAULT_SPEECH_MODEL,
  precision: 'q8',
  device: 'wasm',
  task: 'transcribe',
  serverUrl: 'http://127.0.0.1:8080/v1/audio/transcriptions',
  serverModel: 'whisper-1',
  language: 'auto',
  silenceRmsThreshold: 0.004,
  maxUtteranceSeconds: 30
};
