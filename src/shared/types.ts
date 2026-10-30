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

export type SpeechEngine = 'demo' | 'server';

export interface SpeechSettings {
  engine: SpeechEngine;
  serverUrl: string;
  serverModel: string;
  language: string;
  silenceRmsThreshold: number;
  maxUtteranceSeconds: number;
}

export type OpenWithApp = 'default' | 'notepad' | 'cursor' | 'explorer' | 'terminal';

export interface FileManApi {
  listLocalDirectory(path?: string): Promise<DirectoryListing>;
  searchLocalShallow(path: string, maxDepth?: number): Promise<SearchHit[]>;
  createLocalDirectory(path: string): Promise<void>;
  renameLocalEntry(from: string, to: string): Promise<void>;
  removeLocalEntry(path: string, kind: FileEntry['kind']): Promise<void>;
  copyLocalEntry(from: string, toDir: string): Promise<string>;
  moveLocalEntry(from: string, toDir: string): Promise<string>;
  homeDirectory(): Promise<string>;
  copyText(text: string): Promise<void>;
  openPath(path: string): Promise<void>;
  showItemInFolder(path: string): Promise<void>;
  openWith(path: string, app: OpenWithApp | string): Promise<void>;
}

declare global {
  interface Window {
    fileman: FileManApi;
  }
}

export {};
