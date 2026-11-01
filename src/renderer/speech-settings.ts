import type { SpeechEngine, SpeechPrecision, SpeechSettings, SpeechTask } from '../shared/types.js';
import { DEFAULT_SPEECH } from './speech.js';
import { supportsLanguageSelection } from './speech-models.js';

const STORAGE_KEY = 'zerogfileman.speech';

const ENGINES: SpeechEngine[] = ['demo', 'builtin', 'server'];
const PRECISIONS: SpeechPrecision[] = ['q4', 'q8', 'fp16', 'fp32'];
const DEVICES = ['wasm', 'webgpu'] as const;
const TASKS: SpeechTask[] = ['transcribe', 'translate'];

function asEngine(value: unknown): SpeechEngine {
  return typeof value === 'string' && (ENGINES as string[]).includes(value)
    ? (value as SpeechEngine)
    : DEFAULT_SPEECH.engine;
}

function asPrecision(value: unknown): SpeechPrecision {
  return typeof value === 'string' && (PRECISIONS as string[]).includes(value)
    ? (value as SpeechPrecision)
    : DEFAULT_SPEECH.precision;
}

function asDevice(value: unknown): SpeechSettings['device'] {
  return typeof value === 'string' && (DEVICES as readonly string[]).includes(value)
    ? (value as SpeechSettings['device'])
    : DEFAULT_SPEECH.device;
}

function asTask(value: unknown): SpeechTask {
  return typeof value === 'string' && (TASKS as string[]).includes(value)
    ? (value as SpeechTask)
    : DEFAULT_SPEECH.task;
}

function asNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Normalize a partial/raw settings object into a full SpeechSettings. */
export function parseSpeechSettings(raw: unknown): SpeechSettings {
  const source =
    raw && typeof raw === 'object' ? (raw as Partial<SpeechSettings>) : ({} as Partial<SpeechSettings>);
  const model =
    typeof source.model === 'string' && source.model.trim()
      ? source.model.trim()
      : DEFAULT_SPEECH.model;
  let language =
    typeof source.language === 'string' && source.language.trim()
      ? source.language.trim()
      : DEFAULT_SPEECH.language;
  // English-only checkpoints reject language/task options.
  if (!supportsLanguageSelection(model)) {
    language = 'auto';
  }
  return {
    engine: asEngine(source.engine),
    model,
    precision: asPrecision(source.precision),
    device: asDevice(source.device),
    task: asTask(source.task),
    serverUrl:
      typeof source.serverUrl === 'string' && source.serverUrl.trim()
        ? source.serverUrl.trim()
        : DEFAULT_SPEECH.serverUrl,
    serverModel:
      typeof source.serverModel === 'string' && source.serverModel.trim()
        ? source.serverModel.trim()
        : DEFAULT_SPEECH.serverModel,
    language,
    silenceRmsThreshold: asNumber(source.silenceRmsThreshold, DEFAULT_SPEECH.silenceRmsThreshold, 0, 0.1),
    maxUtteranceSeconds: asNumber(source.maxUtteranceSeconds, DEFAULT_SPEECH.maxUtteranceSeconds, 3, 120)
  };
}

export function loadStoredSpeechSettings(): SpeechSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SPEECH };
    return parseSpeechSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SPEECH };
  }
}

export function storeSpeechSettings(settings: SpeechSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parseSpeechSettings(settings)));
  } catch {
    /* ignore quota / private mode */
  }
}
