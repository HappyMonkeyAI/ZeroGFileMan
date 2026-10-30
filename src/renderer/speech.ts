import type { SpeechSettings } from '../shared/types.js';
import { transcribeViaServer } from './speech-server.js';

export type SpeechProgress =
  | { kind: 'loading'; progress: number | null }
  | { kind: 'notice'; message: string };

export type SpeechResult = {
  text: string;
  elapsedMs: number;
  engine: SpeechSettings['engine'];
};

/**
 * Scaffold speech client: server ASR or caller-supplied demo text.
 * Builtin Whisper worker lands in a later ROADMAP slice.
 */
export class SpeechClient {
  constructor(
    private readonly options: {
      fetchImpl?: typeof fetch;
      now?: () => number;
      resolveApiKey?: () => Promise<string | null>;
    } = {}
  ) {}

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
}

export const DEFAULT_SPEECH: SpeechSettings = {
  engine: 'demo',
  serverUrl: 'http://127.0.0.1:8080/v1/audio/transcriptions',
  serverModel: 'whisper-1',
  language: 'auto',
  silenceRmsThreshold: 0.004,
  maxUtteranceSeconds: 30
};
