import type { Favorite } from './favorites.js';

export type { Favorite };

export interface FileEntry {
  name: string;
  kind: 'file' | 'directory' | 'symlink';
  size: number;
  modified?: string;
}

export interface DirectoryListing {
  path: string;
  entries: FileEntry[];
}

/** One hit from a shallow recursive index under a pane root. */
export interface SearchHit {
  path: string;
  name: string;
  kind: FileEntry['kind'];
  /** Path relative to the search root, using the host separator. */
  relative: string;
}

export type VoiceMode = 'navigate' | 'action';

export type SpeechEngine = 'demo' | 'builtin' | 'server';

export type SpeechPrecision = 'q4' | 'q8' | 'fp16' | 'fp32';

export type SpeechTask = 'transcribe' | 'translate';

export interface SpeechSettings {
  engine: SpeechEngine;
  /** Hugging Face hub id for the builtin Whisper pipeline. */
  model: string;
  precision: SpeechPrecision;
  device: 'wasm' | 'webgpu';
  task: SpeechTask;
  serverUrl: string;
  serverModel: string;
  language: string;
  silenceRmsThreshold: number;
  maxUtteranceSeconds: number;
}

export type OpenWithApp = 'default' | 'notepad' | 'cursor' | 'explorer' | 'terminal';

export type MenuCommand = string;

export interface FileManApi {
  listLocalDirectory(path?: string): Promise<DirectoryListing>;
  searchLocalShallow(path: string, maxDepth?: number): Promise<SearchHit[]>;
  createLocalDirectory(path: string): Promise<void>;
  renameLocalEntry(from: string, to: string): Promise<void>;
  removeLocalEntry(path: string, kind: FileEntry['kind']): Promise<void>;
  copyLocalEntry(from: string, toDir: string): Promise<string>;
  moveLocalEntry(from: string, toDir: string): Promise<string>;
  homeDirectory(): Promise<string>;
  listFavorites(): Promise<Favorite[]>;
  addFavorite(path: string, label?: string): Promise<Favorite[]>;
  removeFavorite(path: string): Promise<Favorite[]>;
  copyText(text: string): Promise<void>;
  openPath(path: string): Promise<void>;
  showItemInFolder(path: string): Promise<void>;
  openWith(path: string, app: OpenWithApp | string): Promise<void>;
  onMenuCommand(callback: (command: MenuCommand) => void): () => void;
}

declare global {
  interface Window {
    fileman: FileManApi;
  }
}

export {};
