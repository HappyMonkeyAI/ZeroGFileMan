import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SPEECH_MODEL,
  describeDownload,
  downloadSizeMb,
  supportsLanguageSelection
} from '../src/renderer/speech-models.js';

describe('speech-models', () => {
  it('defaults to tiny English', () => {
    expect(DEFAULT_SPEECH_MODEL).toBe('onnx-community/whisper-tiny.en');
    expect(supportsLanguageSelection(DEFAULT_SPEECH_MODEL)).toBe(false);
  });

  it('flags multilingual checkpoints', () => {
    expect(supportsLanguageSelection('onnx-community/whisper-small')).toBe(true);
    expect(supportsLanguageSelection('onnx-community/whisper-small.en')).toBe(false);
  });

  it('describes first-use download size', () => {
    expect(downloadSizeMb('onnx-community/whisper-tiny.en', 'q8')).toBe(41);
    expect(describeDownload('onnx-community/whisper-tiny.en', 'q8')).toContain('41 MB');
  });
});
