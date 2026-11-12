import type { FileEntry, SearchHit } from './types.js';

export type FuzzyMatch<T> = {
  item: T;
  score: number;
};

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/[_./\\-]+/g, ' ').replace(/\s+/g, ' ');
}

function scoreName(name: string, query: string): number {
  const n = name.toLowerCase();
  const q = normalizeQuery(query);
  if (!q) return 0;
  if (n === q) return 100;
  if (n.startsWith(q)) return 90;
  if (n.includes(q)) return 70;
  const tokens = q.split(' ').filter(Boolean);
  if (tokens.length && tokens.every((t) => n.includes(t))) return 60;
  let ti = 0;
  for (const ch of n) {
    if (ch === q[ti]) ti += 1;
    if (ti >= q.length) return 40;
  }
  return 0;
}

function rankKind(kind: FileEntry['kind']): number {
  return kind === 'directory' || kind === 'symlink' ? 1 : 0;
}

/** Rank listing entries by spoken/typed query; directories preferred on ties. */
export function fuzzyMatchEntries(entries: FileEntry[], query: string, limit = 8): FuzzyMatch<FileEntry>[] {
  return entries
    .map((entry) => ({ item: entry, score: scoreName(entry.name, query) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const dir = rankKind(b.item.kind) - rankKind(a.item.kind);
      if (dir) return dir;
      return a.item.name.localeCompare(b.item.name, undefined, { sensitivity: 'base' });
    })
    .slice(0, limit);
}

/** Rank shallow-search hits (name + relative path). */
export function fuzzyMatchHits(hits: SearchHit[], query: string, limit = 8): FuzzyMatch<SearchHit>[] {
  return hits
    .map((hit) => {
      const byName = scoreName(hit.name, query);
      const byRel = scoreName(hit.relative.replace(/[\\/]/g, ' '), query);
      return { item: hit, score: Math.max(byName, byRel * 0.9) };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const dir = rankKind(b.item.kind) - rankKind(a.item.kind);
      if (dir) return dir;
      return a.item.relative.length - b.item.relative.length;
    })
    .slice(0, limit);
}

const ACTION_PATTERNS: { id: string; patterns: RegExp[] }[] = [
  { id: 'copy-path', patterns: [/\bcopy\s+(the\s+)?path\b/i] },
  { id: 'copy-item', patterns: [/\bcopy\s+(this|it|file|folder|selection)?\b/i, /\bcopy\b/i] },
  { id: 'cut-item', patterns: [/\bcut\b/i, /\bmove\b/i] },
  { id: 'paste', patterns: [/\bpaste\b/i] },
  { id: 'delete', patterns: [/\bdelete\b/i, /\bremove\b/i, /\btrash\b/i] },
  { id: 'rename', patterns: [/\brename\b/i] },
  { id: 'open-notepad', patterns: [/\bopen\s+(this\s+)?(in\s+)?notepad\b/i] },
  { id: 'open-cursor', patterns: [/\bopen\s+(this\s+)?(in\s+)?cursor\b/i, /\bcursor\b/i] },
  { id: 'open-terminal', patterns: [/\b(open\s+)?terminal(\s+here)?\b/i, /\bshell\s+here\b/i] },
  { id: 'reveal', patterns: [/\breveal\b/i, /\bshow\s+in\s+explorer\b/i] },
  { id: 'new-folder', patterns: [/\b(new|create)\s+(folder|directory)\b/i, /\bmkdir\b/i] },
  { id: 'new-file', patterns: [/\b(new|create)\s+file\b/i, /\bnew\s+text\b/i, /\bcreate\s+text\b/i] },
  { id: 'refresh', patterns: [/\brefresh\b/i, /\breload\b/i] },
  { id: 'open-default', patterns: [/\bopen\s+(this|it|file)\b/i, /\bopen\b/i] }
];

export type ParsedAction = { id: string; raw: string };

export function parseActionCommand(transcript: string): ParsedAction | null {
  const raw = transcript.trim();
  if (!raw) return null;
  // Prefer more specific patterns first (list order).
  for (const action of ACTION_PATTERNS) {
    if (action.patterns.some((re) => re.test(raw))) return { id: action.id, raw };
  }
  return { id: 'unknown', raw };
}
