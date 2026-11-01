import { describe, expect, it } from 'vitest';
import { DEFAULT_SPEECH } from '../src/renderer/speech.js';
import { parseSpeechSettings } from '../src/renderer/speech-settings.js';

describe('parseSpeechSettings', () => {
  it('fills defaults for empty input', () => {
    expect(parseSpeechSettings(null)).toEqual(DEFAULT_SPEECH);
  });

  it('keeps known fields and clamps silence/max', () => {
    const parsed = parseSpeechSettings({
      engine: 'builtin',
      model: 'onnx-community/whisper-small',
      precision: 'fp16',
      device: 'webgpu',
      language: 'de',
      silenceRmsThreshold: 9,
      maxUtteranceSeconds: 1
    });
    expect(parsed.engine).toBe('builtin');
    expect(parsed.model).toBe('onnx-community/whisper-small');
    expect(parsed.language).toBe('de');
    expect(parsed.silenceRmsThreshold).toBe(0.1);
    expect(parsed.maxUtteranceSeconds).toBe(3);
  });

  it('forces auto language for English-only models', () => {
    const parsed = parseSpeechSettings({
      model: 'onnx-community/whisper-tiny.en',
      language: 'fr'
    });
    expect(parsed.language).toBe('auto');
  });

  it('rejects unknown engines/devices', () => {
    const parsed = parseSpeechSettings({ engine: 'cloud', device: 'cuda' });
    expect(parsed.engine).toBe(DEFAULT_SPEECH.engine);
    expect(parsed.device).toBe(DEFAULT_SPEECH.device);
  });
});
