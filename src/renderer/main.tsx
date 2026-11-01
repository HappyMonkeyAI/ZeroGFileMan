import {
  StrictMode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent
} from 'react';
import { createRoot } from 'react-dom/client';
import {
  baseName,
  breadcrumbSegments,
  formatModified,
  formatSize,
  isHiddenName,
  joinLocal,
  parentLocal
} from '../shared/files.js';
import { fuzzyMatchEntries, fuzzyMatchHits, parseActionCommand } from '../shared/fuzzy-path.js';
import {
  canGoBack,
  canGoForward,
  currentPath,
  initialHistory,
  pushPath,
  stepBack,
  stepForward,
  type HistoryState
} from '../shared/pane-history.js';
import { isFavoritePath, type Favorite } from '../shared/favorites.js';
import {
  iconPixelSize,
  isThumbnailCandidate,
  stepViewScale,
  thumbPixelSize,
  type ListingViewMode
} from '../shared/listing-view.js';
import {
  clampSplitRatio,
  setLayout,
  toggleMaximize,
  workspaceGridTemplate,
  type WorkspaceLayoutState
} from '../shared/pane-layout.js';
import type {
  FileEntry,
  SpeechApiKeyStatus,
  SpeechSettings,
  TerminalLauncher,
  TerminalPrefs,
  VoiceMode
} from '../shared/types.js';
import { shouldStopJewelOnRelease } from '../shared/voice-jewel.js';
import { Icon } from './icons.js';
import { loadStoredWorkspaceLayout, storeWorkspaceLayout } from './layout-prefs.js';
import { loadStoredListingPrefs, storeListingPrefs } from './listing-prefs.js';
import { SpeechClient, type SpeechWorker } from './speech.js';
import {
  describeDownload,
  SPEECH_LANGUAGES,
  SPEECH_MODELS,
  SPEECH_PRECISIONS,
  supportsLanguageSelection
} from './speech-models.js';
import { loadStoredSpeechSettings, storeSpeechSettings } from './speech-settings.js';
import { loadStoredTerminalPrefs, storeTerminalPrefs } from './terminal-prefs.js';
import {
  applyTheme,
  isThemeId,
  loadStoredTheme,
  storeTheme,
  type ThemeId
} from './themes.js';
import { isMostlySilence, VoiceRecorder } from './voice.js';
import './styles.css';

type VoicePhase = 'idle' | 'listening' | 'transcribing';

const thumbCache = new Map<string, string | null>();

function EntryThumbnail(props: {
  path: string;
  name: string;
  size: number;
  kind: FileEntry['kind'];
  edge: number;
  fallbackIcon: string;
}) {
  const { path, name, size, kind, edge, fallbackIcon } = props;
  const eligible = isThumbnailCandidate(name, size, kind);
  const [src, setSrc] = useState<string | null>(() =>
    eligible ? (thumbCache.get(path) ?? null) : null
  );
  const [failed, setFailed] = useState(() => eligible && thumbCache.get(path) === null);

  useEffect(() => {
    if (!eligible || failed) return;
    const cached = thumbCache.get(path);
    if (cached !== undefined) {
      setSrc(cached);
      setFailed(cached === null);
      return;
    }
    let cancelled = false;
    void api()
      .readThumbnail(path, Math.max(64, edge * 2))
      .then((result) => {
        const next = result?.dataUrl ?? null;
        thumbCache.set(path, next);
        if (cancelled) return;
        setSrc(next);
        setFailed(next === null);
      })
      .catch(() => {
        thumbCache.set(path, null);
        if (!cancelled) {
          setSrc(null);
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [eligible, edge, failed, path]);

  if (src) {
    return <img className="tile-thumb" src={src} alt="" width={edge} height={edge} draggable={false} />;
  }
  return (
    <span className="tile-fallback" style={{ width: edge, height: edge }}>
      <Icon name={fallbackIcon} />
    </span>
  );
}

const speech = new SpeechClient({
  createWorker: () =>
    new Worker(new URL('./voice-worker.ts', import.meta.url), {
      type: 'module'
    }) as unknown as SpeechWorker,
  resolveApiKey: () => window.fileman.readSpeechApiKey()
});

type PaneState = {
  path: string;
  entries: FileEntry[];
  selected: string | null;
  matchNames: Set<string>;
  status: string;
  listening: VoiceMode | null;
  filter: string;
  history: string[];
  historyIndex: number;
  viewMode: ListingViewMode;
  viewScale: number;
};

type FileClip = {
  mode: 'copy' | 'cut';
  path: string;
  kind: FileEntry['kind'];
  name: string;
};

type PaneCommands = {
  refresh: () => void;
  newFolder: () => void;
  rename: () => void;
  delete: () => void;
  copy: () => void;
  cut: () => void;
  paste: () => void;
  copyToOther: () => void;
  moveToOther: () => void;
  copyPath: () => void;
  open: () => void;
  openNotepad: () => void;
  openTerminal: () => void;
  reveal: () => void;
  parent: () => void;
  back: () => void;
  forward: () => void;
  navigateFuzzy: (query: string) => void;
  voiceNavigate: () => void;
  voiceAction: () => void;
};

function historyOf(pane: PaneState): HistoryState {
  return { history: pane.history, historyIndex: pane.historyIndex };
}

function api() {
  return window.fileman;
}

function stamp(): string {
  return new Date().toLocaleTimeString(undefined, { hour12: false });
}

async function loadPane(path?: string): Promise<Pick<PaneState, 'path' | 'entries'>> {
  const listing = await api().listLocalDirectory(path);
  return { path: listing.path, entries: listing.entries };
}

function ToolButton(props: {
  icon: string;
  label?: string;
  hint?: string;
  title: string;
  tone?: 'accent' | 'warn' | 'danger' | 'ok' | 'violet' | 'sky' | 'teal';
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const { icon, label, hint, title, tone, danger, disabled, onClick } = props;
  const toneClass = tone ? `${tone}-i` : '';
  return (
    <button
      type="button"
      className={`tool${label ? '' : ' icon-only'}${danger ? ' danger' : ''}`}
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
    >
      <span className={toneClass}>
        <Icon name={icon} />
      </span>
      {label ? <span>{label}</span> : null}
      {hint ? <span className="hint">{hint}</span> : null}
    </button>
  );
}

function FilePane(props: {
  side: 'left' | 'right';
  pane: PaneState;
  active: boolean;
  maximized: boolean;
  showHidden: boolean;
  autoNavigate: boolean;
  speechSettings: SpeechSettings;
  terminalPrefs: TerminalPrefs;
  demoText: string;
  clipboard: FileClip | null;
  otherPath: string;
  onActivate: () => void;
  onChange: (next: PaneState) => void;
  onLog: (message: string) => void;
  onClipboard: (clip: FileClip | null) => void;
  onToggleMaximize: () => void;
  onRefreshPeer?: () => void;
  onRegisterCommands: (commands: PaneCommands | null) => void;
}) {
  const {
    side,
    pane,
    active,
    maximized,
    showHidden,
    autoNavigate,
    speechSettings,
    terminalPrefs,
    demoText,
    clipboard,
    otherPath,
    onActivate,
    onChange,
    onLog,
    onClipboard,
    onToggleMaximize,
    onRefreshPeer,
    onRegisterCommands
  } = props;

  const openTerminalHere = useCallback(
    (dir: string) =>
      api().openTerminal(dir, {
        launcher: terminalPrefs.launcher,
        customCommand: terminalPrefs.customCommand
      }),
    [terminalPrefs.customCommand, terminalPrefs.launcher]
  );

  const crumbs = useMemo(() => breadcrumbSegments(pane.path), [pane.path]);
  const visible = useMemo(() => {
    const q = pane.filter.trim().toLowerCase();
    return pane.entries.filter((e) => {
      if (!showHidden && isHiddenName(e.name)) return false;
      if (!q) return true;
      return e.name.toLowerCase().includes(q);
    });
  }, [pane.entries, pane.filter, showHidden]);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const pressRef = useRef<{ mode: VoiceMode; at: number; releaseWillStop: boolean } | null>(null);
  const pendingStartRef = useRef<Promise<boolean> | null>(null);
  const limitTimerRef = useRef<number | null>(null);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>('idle');
  const selectedEntry = visible.find((e) => e.name === pane.selected) ?? null;
  const dirs = visible.filter((e) => e.kind === 'directory' || e.kind === 'symlink').length;
  const files = visible.length - dirs;

  const clearVoiceLimit = useCallback(() => {
    if (limitTimerRef.current != null) {
      window.clearTimeout(limitTimerRef.current);
      limitTimerRef.current = null;
    }
  }, []);

  const bus = useCallback(
    (message: string) => {
      onLog(`[${stamp()}] ${message}`);
    },
    [onLog]
  );

  const navigateTo = useCallback(
    async (path: string, options: { record?: boolean; history?: HistoryState } = {}) => {
      const record = options.record !== false;
      try {
        const next = await loadPane(path);
        const hist = options.history ?? (record ? pushPath(historyOf(pane), next.path) : historyOf(pane));
        onChange({
          ...pane,
          ...next,
          ...hist,
          selected: null,
          matchNames: new Set(),
          status: next.path,
          listening: null
        });
        onLog(`[${stamp()}] Focus → ${next.path}`);
      } catch (error) {
        onLog(error instanceof Error ? error.message : String(error));
      }
    },
    [onChange, onLog, pane]
  );

  const goBack = useCallback(async () => {
    const stepped = stepBack(historyOf(pane));
    if (!stepped) return;
    await navigateTo(currentPath(stepped), { record: false, history: stepped });
  }, [navigateTo, pane]);

  const goForward = useCallback(async () => {
    const stepped = stepForward(historyOf(pane));
    if (!stepped) return;
    await navigateTo(currentPath(stepped), { record: false, history: stepped });
  }, [navigateTo, pane]);

  const refresh = useCallback(async () => {
    const selected = pane.selected;
    const next = await loadPane(pane.path);
    onChange({
      ...pane,
      ...next,
      selected: next.entries.some((e) => e.name === selected) ? selected : null,
      status: `Refreshed ${next.path}`,
      listening: null
    });
    onLog(`[${stamp()}] Refreshed ${next.path} (${next.entries.length} entries)`);
  }, [onChange, onLog, pane]);

  const requireSelection = useCallback((): { path: string; kind: FileEntry['kind']; name: string } | null => {
    if (!selectedEntry) {
      onLog('Select a file or folder first.');
      return null;
    }
    return {
      path: joinLocal(pane.path, selectedEntry.name),
      kind: selectedEntry.kind,
      name: selectedEntry.name
    };
  }, [onLog, pane.path, selectedEntry]);

  const transferToOther = useCallback(
    async (mode: 'copy' | 'move') => {
      const sel = requireSelection();
      if (!sel) return;
      if (otherPath === pane.path) {
        onLog('Other pane is the same directory.');
        return;
      }
      try {
        const dest =
          mode === 'copy'
            ? await api().copyLocalEntry(sel.path, otherPath)
            : await api().moveLocalEntry(sel.path, otherPath);
        await refresh();
        onRefreshPeer?.();
        onLog(`[${stamp()}] ${mode} → other pane: ${baseName(dest)}`);
      } catch (error) {
        onLog(error instanceof Error ? error.message : String(error));
      }
    },
    [onLog, onRefreshPeer, otherPath, pane.path, refresh, requireSelection]
  );

  const doNewFolder = useCallback(async () => {
    const name = window.prompt('New folder name', 'New Folder');
    if (!name?.trim()) return;
    await api().createLocalDirectory(joinLocal(pane.path, name.trim()));
    await navigateTo(pane.path);
    onLog(`[${stamp()}] mkdir ${name.trim()}`);
  }, [navigateTo, onLog, pane.path]);

  const doRename = useCallback(async () => {
    const sel = requireSelection();
    if (!sel) return;
    const next = window.prompt('Rename to', sel.name);
    if (!next?.trim() || next.trim() === sel.name) return;
    await api().renameLocalEntry(sel.path, joinLocal(pane.path, next.trim()));
    await refresh();
    onLog(`[${stamp()}] rename ${sel.name} → ${next.trim()}`);
  }, [onLog, pane.path, refresh, requireSelection]);

  const doDelete = useCallback(async () => {
    const sel = requireSelection();
    if (!sel) return;
    const ok = window.confirm(
      sel.kind === 'directory'
        ? `Delete empty folder “${sel.name}”? (non-empty refused)`
        : `Delete “${sel.name}”?`
    );
    if (!ok) return;
    await api().removeLocalEntry(sel.path, sel.kind);
    await refresh();
    onLog(`[${stamp()}] delete ${sel.name}`);
  }, [onLog, refresh, requireSelection]);

  const doCopyClip = useCallback(
    (mode: 'copy' | 'cut') => {
      const sel = requireSelection();
      if (!sel) return;
      onClipboard({ mode, path: sel.path, kind: sel.kind, name: sel.name });
      onChange({ ...pane, status: mode === 'copy' ? `Copied ${sel.name}` : `Cut ${sel.name}`, listening: null });
      onLog(`[${stamp()}] ${mode} ${sel.name}`);
    },
    [onChange, onClipboard, onLog, pane, requireSelection]
  );

  const doPaste = useCallback(async () => {
    if (!clipboard) {
      onLog('Clipboard is empty.');
      return;
    }
    try {
      const dest =
        clipboard.mode === 'copy'
          ? await api().copyLocalEntry(clipboard.path, pane.path)
          : await api().moveLocalEntry(clipboard.path, pane.path);
      if (clipboard.mode === 'cut') onClipboard(null);
      await refresh();
      onRefreshPeer?.();
      onLog(`[${stamp()}] paste → ${baseName(dest)}`);
    } catch (error) {
      onLog(error instanceof Error ? error.message : String(error));
    }
  }, [clipboard, onClipboard, onLog, onRefreshPeer, pane.path, refresh]);

  const applyNavigate = useCallback(
    async (transcript: string) => {
      onChange({ ...pane, status: `Searching “${transcript}”…`, listening: null });
      let matches = fuzzyMatchEntries(visible, transcript);
      let matchNames = new Set(matches.map((m) => m.item.name));
      let bestPath: string | null = null;
      let bestKind: FileEntry['kind'] | null = null;
      let label = matches[0]?.item.name ?? null;

      if (matches[0]) {
        bestPath = joinLocal(pane.path, matches[0].item.name);
        bestKind = matches[0].item.kind;
      } else {
        const hits = await api().searchLocalShallow(pane.path, 2);
        const deep = fuzzyMatchHits(hits, transcript);
        matchNames = new Set(deep.map((m) => m.item.name));
        matches = deep.map((m) => ({
          item: { name: m.item.name, kind: m.item.kind, size: 0 },
          score: m.score
        }));
        if (deep[0]) {
          bestPath = deep[0].item.path;
          bestKind = deep[0].item.kind;
          label = deep[0].item.relative;
        }
      }

      if (!bestPath || !bestKind || !label) {
        onChange({ ...pane, matchNames, status: `No match for “${transcript}”`, listening: null });
        onLog(`[${stamp()}] navigate miss: ${transcript}`);
        return;
      }

      onChange({
        ...pane,
        selected: baseName(bestPath),
        matchNames,
        status: `Navigate: ${label}`,
        listening: null
      });
      onLog(`[${stamp()}] navigate → ${label}`);
      const go = autoNavigate || window.confirm(`Go to “${label}?`);
      if (!go) return;
      if (bestKind === 'directory' || bestKind === 'symlink') await navigateTo(bestPath);
      else await navigateTo(parentLocal(bestPath));
    },
    [autoNavigate, navigateTo, onChange, onLog, pane, visible]
  );

  const applyAction = useCallback(
    async (transcript: string) => {
      const parsed = parseActionCommand(transcript);
      if (!parsed) return;
      const selectedPath = pane.selected ? joinLocal(pane.path, pane.selected) : pane.path;
      try {
        switch (parsed.id) {
          case 'copy-path':
            await api().copyText(selectedPath);
            onLog(`[${stamp()}] copy path ${selectedPath}`);
            break;
          case 'copy-item':
            doCopyClip('copy');
            break;
          case 'cut-item':
            doCopyClip('cut');
            break;
          case 'paste':
            await doPaste();
            break;
          case 'delete':
            await doDelete();
            break;
          case 'rename':
            await doRename();
            break;
          case 'open-notepad':
            await api().openWith(selectedPath, 'notepad');
            onLog(`[${stamp()}] notepad ${selectedPath}`);
            break;
          case 'open-cursor':
            await api().openWith(selectedPath, 'cursor');
            onLog(`[${stamp()}] cursor ${selectedPath}`);
            break;
          case 'open-terminal':
            await openTerminalHere(pane.path);
            onLog(`[${stamp()}] terminal ${pane.path} (${terminalPrefs.launcher})`);
            break;
          case 'open-default':
            await api().openPath(selectedPath);
            onLog(`[${stamp()}] open ${selectedPath}`);
            break;
          case 'new-folder':
            await doNewFolder();
            break;
          case 'reveal':
            await api().showItemInFolder(selectedPath);
            break;
          case 'refresh':
            await refresh();
            break;
          default:
            onLog(`Unknown action: ${parsed.raw}`);
        }
        onChange({ ...pane, listening: null });
      } catch (error) {
        onLog(error instanceof Error ? error.message : String(error));
        onChange({ ...pane, listening: null });
      }
    },
    [
      doCopyClip,
      doDelete,
      doNewFolder,
      doPaste,
      doRename,
      onChange,
      onLog,
      openTerminalHere,
      pane,
      refresh,
      terminalPrefs.launcher
    ]
  );

  const cancelListening = useCallback(
    (reason = 'cancelled') => {
      clearVoiceLimit();
      pressRef.current = null;
      recorderRef.current?.cancel();
      recorderRef.current = null;
      setVoicePhase('idle');
      onChange({ ...pane, listening: null, status: pane.path });
      bus(`${reason}`);
    },
    [bus, clearVoiceLimit, onChange, pane]
  );

  const finishListening = useCallback(
    async (mode: VoiceMode) => {
      clearVoiceLimit();
      pressRef.current = null;
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (!recorder) {
        setVoicePhase('idle');
        onChange({ ...pane, listening: null, status: pane.path });
        return;
      }
      const samples = await recorder.stop();
      if (!samples || isMostlySilence(samples, speechSettings.silenceRmsThreshold)) {
        setVoicePhase('idle');
        onChange({ ...pane, listening: null, status: 'No speech detected' });
        bus(`${mode}: no speech detected`);
        return;
      }
      try {
        setVoicePhase('transcribing');
        onChange({ ...pane, listening: mode, status: `Transcribing (${speechSettings.engine})…` });
        bus(`${mode}: transcribing (${speechSettings.engine})…`);
        const result = await speech.transcribe(samples, speechSettings, (progress) => {
          if (progress.kind === 'loading') {
            const pct = progress.progress == null ? '…' : `${Math.round(progress.progress)}%`;
            onChange({ ...pane, listening: mode, status: `Loading model ${pct}` });
            bus(`${mode}: loading model ${pct}`);
          } else {
            bus(progress.message);
          }
        });
        bus(`${mode}: “${result.text}” (${result.elapsedMs}ms · ${result.engine})`);
        setVoicePhase('idle');
        if (mode === 'navigate') await applyNavigate(result.text);
        else await applyAction(result.text);
      } catch (error) {
        setVoicePhase('idle');
        onChange({ ...pane, listening: null, status: pane.path });
        bus(error instanceof Error ? error.message : String(error));
      }
    },
    [applyAction, applyNavigate, bus, clearVoiceLimit, onChange, pane, speechSettings]
  );

  const startListening = useCallback(
    async (mode: VoiceMode): Promise<boolean> => {
      if (pane.listening || voicePhase !== 'idle' || pendingStartRef.current) return false;
      const work = (async () => {
        const recorder = new VoiceRecorder();
        try {
          await recorder.start();
        } catch (error) {
          bus(`mic unavailable: ${error instanceof Error ? error.message : String(error)}`);
          return false;
        }
        recorderRef.current = recorder;
        setVoicePhase('listening');
        onChange({ ...pane, listening: mode, status: `Listening (${mode})…` });
        bus(`${mode}: listening… (click again or release hold to stop · Esc cancel)`);
        clearVoiceLimit();
        limitTimerRef.current = window.setTimeout(() => {
          void finishListening(mode);
        }, Math.max(3, speechSettings.maxUtteranceSeconds) * 1000);
        return true;
      })();
      pendingStartRef.current = work;
      try {
        return await work;
      } finally {
        if (pendingStartRef.current === work) pendingStartRef.current = null;
      }
    },
    [
      bus,
      clearVoiceLimit,
      finishListening,
      onChange,
      pane,
      speechSettings.maxUtteranceSeconds,
      voicePhase
    ]
  );

  const toggleJewel = useCallback(
    async (mode: VoiceMode) => {
      onActivate();
      if (speechSettings.engine === 'demo') {
        setVoicePhase('transcribing');
        onChange({ ...pane, listening: mode, status: `Demo (${mode})…` });
        bus(`${mode}: demo…`);
        try {
          const result = await speech.transcribe(new Float32Array(0), speechSettings, undefined, demoText);
          bus(`${mode}: “${result.text}” (demo)`);
          setVoicePhase('idle');
          if (mode === 'navigate') await applyNavigate(result.text);
          else await applyAction(result.text);
        } catch (error) {
          setVoicePhase('idle');
          onChange({ ...pane, listening: null });
          bus(error instanceof Error ? error.message : String(error));
        }
        return;
      }

      if (pane.listening === mode && recorderRef.current) {
        await finishListening(mode);
        return;
      }
      if (pane.listening || voicePhase !== 'idle') return;
      await startListening(mode);
    },
    [
      applyAction,
      applyNavigate,
      bus,
      demoText,
      finishListening,
      onActivate,
      onChange,
      pane,
      speechSettings,
      startListening,
      voicePhase
    ]
  );

  const jewelPointerDown = useCallback(
    (mode: VoiceMode, event: ReactPointerEvent<HTMLButtonElement>) => {
      onActivate();
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      if (speechSettings.engine === 'demo') {
        pressRef.current = null;
        void toggleJewel(mode);
        return;
      }
      if (pane.listening === mode) {
        pressRef.current = { mode, at: performance.now(), releaseWillStop: true };
        return;
      }
      if (pane.listening || voicePhase !== 'idle') return;
      pressRef.current = { mode, at: performance.now(), releaseWillStop: false };
      void startListening(mode);
    },
    [onActivate, pane.listening, speechSettings.engine, startListening, toggleJewel, voicePhase]
  );

  const jewelPointerUp = useCallback(
    (mode: VoiceMode) => {
      void (async () => {
        if (pendingStartRef.current) await pendingStartRef.current;
        const press = pressRef.current;
        pressRef.current = null;
        if (speechSettings.engine === 'demo') return;
        if (!press || press.mode !== mode) return;
        if (!recorderRef.current) return;
        const heldMs = performance.now() - press.at;
        if (shouldStopJewelOnRelease({ releaseWillStop: press.releaseWillStop, heldMs })) {
          await finishListening(mode);
        }
      })();
    },
    [finishListening, speechSettings.engine]
  );

  useEffect(() => {
    if (voicePhase !== 'listening' || !pane.listening) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancelListening('listening cancelled');
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [cancelListening, pane.listening, voicePhase]);

  useEffect(() => () => clearVoiceLimit(), [clearVoiceLimit]);

  useEffect(() => {
    if (!active) {
      onRegisterCommands(null);
      return;
    }
    onRegisterCommands({
      refresh: () => void refresh(),
      newFolder: () => void doNewFolder(),
      rename: () => void doRename(),
      delete: () => void doDelete(),
      copy: () => doCopyClip('copy'),
      cut: () => doCopyClip('cut'),
      paste: () => void doPaste(),
      copyToOther: () => void transferToOther('copy'),
      moveToOther: () => void transferToOther('move'),
      copyPath: () => void api().copyText(pane.path).then(() => onLog(`[${stamp()}] copy path ${pane.path}`)),
      open: () => {
        const sel = requireSelection();
        if (sel) void api().openPath(sel.path);
      },
      openNotepad: () => {
        const sel = requireSelection();
        if (sel) void api().openWith(sel.path, 'notepad');
      },
      openTerminal: () =>
        void openTerminalHere(pane.path).then(() =>
          onLog(`[${stamp()}] terminal ${pane.path} (${terminalPrefs.launcher})`)
        ),
      reveal: () => {
        const target = pane.selected ? joinLocal(pane.path, pane.selected) : pane.path;
        void api().showItemInFolder(target);
      },
      parent: () => void navigateTo(parentLocal(pane.path)),
      back: () => void goBack(),
      forward: () => void goForward(),
      navigateFuzzy: (query: string) => void applyNavigate(query),
      voiceNavigate: () => void toggleJewel('navigate'),
      voiceAction: () => void toggleJewel('action')
    });
    return () => onRegisterCommands(null);
  }, [
    active,
    applyNavigate,
    doCopyClip,
    doDelete,
    doNewFolder,
    doPaste,
    doRename,
    goBack,
    goForward,
    navigateTo,
    onLog,
    onRegisterCommands,
    openTerminalHere,
    pane.path,
    pane.selected,
    refresh,
    requireSelection,
    terminalPrefs.launcher,
    toggleJewel,
    transferToOther
  ]);

  return (
    <section className={`pane${active ? ' active' : ''}`} onMouseDown={onActivate}>
      <div className="pane-head">
        <div className="pane-head-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span className={`badge${active ? ' active' : ' idle'}`} title={active ? 'Active pane' : 'Other pane'}>
              {active ? <span className="pulse" /> : <span className="pulse" style={{ background: '#64748b', animation: 'none' }} />}
              {active ? 'Active' : 'Idle'}
            </span>
            <nav className="breadcrumbs" aria-label={active ? 'Active pane path' : 'Other pane path'}>
              {crumbs.map((crumb, index) => (
                <span key={crumb.path}>
                  {index > 0 ? <span className="crumb-sep">/</span> : null}
                  <button
                    type="button"
                    className={`crumb${index === crumbs.length - 1 ? ' current' : ''}`}
                    onClick={() => void navigateTo(crumb.path)}
                  >
                    {crumb.label}
                  </button>
                </span>
              ))}
            </nav>
          </div>
          <div className="pane-pills">
            <button
              type="button"
              className="pill"
              title={`Terminal here (${terminalPrefs.launcher})`}
              onClick={() => void openTerminalHere(pane.path)}
            >
              <Icon name="terminal" />
            </button>
            <button
              type="button"
              className={`pill${maximized ? ' lit' : ''}`}
              title={maximized ? 'Restore split' : 'Maximize pane'}
              aria-pressed={maximized}
              onClick={onToggleMaximize}
            >
              <Icon name={maximized ? 'restore' : 'maximize'} />
            </button>
            <div className="jewels">
              <button
                type="button"
                className={`jewel nav${pane.listening === 'navigate' ? ` ${voicePhase === 'transcribing' ? 'transcribing' : 'listening'}` : ''}`}
                title="Navigate: click to toggle, hold to talk, Esc cancel"
                aria-label="Navigate voice"
                aria-pressed={pane.listening === 'navigate'}
                onPointerDown={(e) => jewelPointerDown('navigate', e)}
                onPointerUp={() => jewelPointerUp('navigate')}
                onPointerCancel={() => jewelPointerUp('navigate')}
                onClick={(e) => e.preventDefault()}
              >
                <Icon name="mic" />
              </button>
              <button
                type="button"
                className={`jewel act${pane.listening === 'action' ? ` ${voicePhase === 'transcribing' ? 'transcribing' : 'listening'}` : ''}`}
                title="Action: click to toggle, hold to talk, Esc cancel"
                aria-label="Action voice"
                aria-pressed={pane.listening === 'action'}
                onPointerDown={(e) => jewelPointerDown('action', e)}
                onPointerUp={() => jewelPointerUp('action')}
                onPointerCancel={() => jewelPointerUp('action')}
                onClick={(e) => e.preventDefault()}
              >
                <Icon name="spark" />
              </button>
            </div>
          </div>
        </div>
        <div className="filter-row">
          <div className="filter">
            <Icon name="sessions" />
            <input
              value={pane.filter}
              onChange={(e) => onChange({ ...pane, filter: e.target.value })}
              placeholder="Filter current view…"
              aria-label="Filter"
            />
          </div>
          <div className="view-toggle" role="group" aria-label="Listing view">
            {(
              [
                ['details', 'list', 'Details'],
                ['icons', 'grid', 'Icons'],
                ['thumbnails', 'image', 'Thumbnails']
              ] as const
            ).map(([mode, icon, label]) => (
              <button
                key={mode}
                type="button"
                className={`view-btn${pane.viewMode === mode ? ' active' : ''}`}
                title={`${label}${mode !== 'details' ? ' · Ctrl+wheel zoom' : ''}`}
                aria-pressed={pane.viewMode === mode}
                onClick={() => {
                  const next = { ...pane, viewMode: mode };
                  onChange(next);
                  storeListingPrefs({ mode, scale: pane.viewScale });
                }}
              >
                <Icon name={icon} />
              </button>
            ))}
          </div>
        </div>
      </div>
      {pane.viewMode === 'details' ? (
        <div className="entry-heading">
          <span>Name</span>
          <span style={{ textAlign: 'right' }}>Size</span>
          <span style={{ textAlign: 'right' }}>Modified</span>
        </div>
      ) : null}
      <div
        className={`listing listing-${pane.viewMode}`}
        style={
          pane.viewMode === 'details'
            ? undefined
            : ({
                '--tile-size': `${pane.viewMode === 'thumbnails' ? thumbPixelSize(pane.viewScale) : iconPixelSize(pane.viewScale)}px`
              } as CSSProperties)
        }
        onWheel={(event) => {
          if (!(event.ctrlKey || event.metaKey)) return;
          event.preventDefault();
          const nextScale = stepViewScale(pane.viewScale, event.deltaY < 0 ? 1 : -1);
          if (nextScale === pane.viewScale) return;
          const nextMode = pane.viewMode === 'details' ? 'icons' : pane.viewMode;
          onChange({ ...pane, viewMode: nextMode, viewScale: nextScale });
          storeListingPrefs({ mode: nextMode, scale: nextScale });
        }}
      >
        <button
          type="button"
          className={pane.viewMode === 'details' ? 'entry' : 'tile'}
          onDoubleClick={() => void navigateTo(parentLocal(pane.path))}
        >
          {pane.viewMode === 'details' ? (
            <>
              <span className="name dir">
                <Icon name="level-up" />
                ..
              </span>
              <span className="meta">—</span>
              <span className="meta">—</span>
            </>
          ) : (
            <>
              <span className="tile-fallback" style={{ width: 'var(--tile-size)', height: 'var(--tile-size)' }}>
                <Icon name="level-up" />
              </span>
              <span className="tile-label">..</span>
            </>
          )}
        </button>
        {visible.map((entry) => {
          const selected = pane.selected === entry.name;
          const match = pane.matchNames.has(entry.name);
          const kindIcon = entry.kind === 'directory' ? 'folder' : entry.kind === 'symlink' ? 'link' : 'file';
          const fullPath = joinLocal(pane.path, entry.name);
          const openEntry = () => {
            if (entry.kind === 'directory' || entry.kind === 'symlink') {
              void navigateTo(fullPath);
            } else {
              void api().openPath(fullPath);
            }
          };
          if (pane.viewMode === 'details') {
            return (
              <button
                key={entry.name}
                type="button"
                className={`entry${selected ? ' selected' : ''}${match ? ' match' : ''}`}
                onClick={() => onChange({ ...pane, selected: entry.name })}
                onDoubleClick={openEntry}
              >
                <span className={`name${entry.kind === 'directory' ? ' dir' : ''}`}>
                  <Icon name={kindIcon} />
                  {entry.name}
                </span>
                <span className="meta">{formatSize(entry)}</span>
                <span className="meta">{formatModified(entry.modified)}</span>
              </button>
            );
          }
          const edge =
            pane.viewMode === 'thumbnails' ? thumbPixelSize(pane.viewScale) : iconPixelSize(pane.viewScale);
          return (
            <button
              key={entry.name}
              type="button"
              className={`tile${selected ? ' selected' : ''}${match ? ' match' : ''}`}
              title={`${entry.name}\n${formatSize(entry)}`}
              onClick={() => onChange({ ...pane, selected: entry.name })}
              onDoubleClick={openEntry}
            >
              {pane.viewMode === 'thumbnails' && isThumbnailCandidate(entry.name, entry.size, entry.kind) ? (
                <EntryThumbnail
                  path={fullPath}
                  name={entry.name}
                  size={entry.size}
                  kind={entry.kind}
                  edge={edge}
                  fallbackIcon={kindIcon}
                />
              ) : (
                <span className="tile-fallback" style={{ width: edge, height: edge }}>
                  <Icon name={kindIcon} />
                </span>
              )}
              <span className={`tile-label${entry.kind === 'directory' ? ' dir' : ''}`}>{entry.name}</span>
            </button>
          );
        })}
      </div>
      <div className="pane-footer">
        <span>
          {selectedEntry ? (
            <>
              <em style={{ color: 'var(--accent)', fontStyle: 'normal' }}>1</em> selected · {selectedEntry.name}
            </>
          ) : (
            'No selection'
          )}
        </span>
        <span>
          {dirs} folders, {files} files
        </span>
      </div>
    </section>
  );
}

function looksLikeAbsolutePath(query: string): boolean {
  if (query === '~' || query.startsWith('~/') || query.startsWith('~\\')) return true;
  if (/^[a-zA-Z]:[\\/]/.test(query)) return true;
  if (query.startsWith('\\\\') || query.startsWith('/')) return true;
  return false;
}

function App() {
  const [left, setLeft] = useState<PaneState | null>(null);
  const [right, setRight] = useState<PaneState | null>(null);
  const [active, setActive] = useState<'left' | 'right'>('left');
  const [showHidden, setShowHidden] = useState(false);
  const [autoNavigate, setAutoNavigate] = useState(true);
  const [theme, setTheme] = useState<ThemeId>(() => loadStoredTheme());
  const [jumpQuery, setJumpQuery] = useState('');
  const [demoText, setDemoText] = useState('zerogfileman');
  const [speechSettings, setSpeechSettings] = useState<SpeechSettings>(() => loadStoredSpeechSettings());
  const [terminalPrefs, setTerminalPrefs] = useState<TerminalPrefs>(() => loadStoredTerminalPrefs());
  const [speechSettingsOpen, setSpeechSettingsOpen] = useState(false);
  const [speechKeyDraft, setSpeechKeyDraft] = useState('');
  const [speechKeyStatus, setSpeechKeyStatus] = useState<SpeechApiKeyStatus>({
    stored: false,
    encryptionAvailable: true,
    sessionOnly: false
  });
  const [clipboard, setClipboard] = useState<FileClip | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [workspaceLayout, setWorkspaceLayout] = useState<WorkspaceLayoutState>(() =>
    loadStoredWorkspaceLayout()
  );
  const [log, setLog] = useState<string[]>([`[${stamp()}] ZeroG FileMan ready · dual commander`]);
  const leftCommands = useRef<PaneCommands | null>(null);
  const rightCommands = useRef<PaneCommands | null>(null);
  const jumpInputRef = useRef<HTMLInputElement | null>(null);
  const workspaceRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{ start: number; ratio: number; vertical: boolean } | null>(null);

  const updateWorkspaceLayout = useCallback((next: WorkspaceLayoutState) => {
    setWorkspaceLayout(next);
    storeWorkspaceLayout(next);
  }, []);

  const pushLog = useCallback((message: string) => {
    setLog((prev) => [...prev.slice(-40), message]);
  }, []);

  const updateSpeech = useCallback((patch: Partial<SpeechSettings>) => {
    setSpeechSettings((prev) => {
      const next = { ...prev, ...patch };
      storeSpeechSettings(next);
      return next;
    });
  }, []);

  const updateTerminalPrefs = useCallback((patch: Partial<TerminalPrefs>) => {
    setTerminalPrefs((prev) => {
      const next = { ...prev, ...patch };
      storeTerminalPrefs(next);
      return next;
    });
  }, []);

  useEffect(() => {
    applyTheme(theme);
    storeTheme(theme);
  }, [theme]);

  useEffect(() => {
    void api()
      .speechApiKeyStatus()
      .then(setSpeechKeyStatus)
      .catch(() => undefined);
  }, []);

  const cmds = () => (active === 'left' ? leftCommands.current : rightCommands.current);

  const focusJump = useCallback(() => {
    jumpInputRef.current?.focus();
    jumpInputRef.current?.select();
  }, []);

  const goActive = useCallback(
    async (path: string) => {
      const setter = active === 'left' ? setLeft : setRight;
      try {
        const next = await loadPane(path);
        setter((prev) => {
          if (!prev) return prev;
          const hist = pushPath(historyOf(prev), next.path);
          return {
            ...prev,
            ...next,
            ...hist,
            selected: null,
            matchNames: new Set(),
            status: next.path,
            listening: null
          };
        });
        pushLog(`[${stamp()}] jump → ${next.path}`);
      } catch (error) {
        pushLog(error instanceof Error ? error.message : String(error));
      }
    },
    [active, pushLog]
  );

  const addCurrentFavorite = useCallback(async () => {
    const pane = active === 'left' ? left : right;
    if (!pane) return;
    try {
      const next = await api().addFavorite(pane.path);
      setFavorites(next);
      pushLog(`[${stamp()}] favorite + ${pane.path}`);
    } catch (error) {
      pushLog(error instanceof Error ? error.message : String(error));
    }
  }, [active, left, pushLog, right]);

  const removeFavoriteChip = useCallback(
    async (path: string) => {
      try {
        const next = await api().removeFavorite(path);
        setFavorites(next);
        pushLog(`[${stamp()}] favorite − ${path}`);
      } catch (error) {
        pushLog(error instanceof Error ? error.message : String(error));
      }
    },
    [pushLog]
  );

  const refreshSide = useCallback((side: 'left' | 'right') => {
    const setter = side === 'left' ? setLeft : setRight;
    setter((prev) => {
      if (!prev) return prev;
      void loadPane(prev.path).then((next) => setter({ ...prev, ...next, status: `Refreshed ${next.path}` }));
      return prev;
    });
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const home = await api().homeDirectory();
        const development = joinLocal(home, 'Documents\\development');
        let leftPath = home;
        try {
          await api().listLocalDirectory(development);
          leftPath = development;
        } catch {
          /* home */
        }
        const [l, r, favs] = await Promise.all([
          loadPane(leftPath),
          loadPane(home),
          api().listFavorites()
        ]);
        const leftHist = initialHistory(l.path);
        const rightHist = initialHistory(r.path);
        const listing = loadStoredListingPrefs();
        setFavorites(favs);
        setLeft({
          ...l,
          ...leftHist,
          selected: null,
          matchNames: new Set(),
          status: l.path,
          listening: null,
          filter: '',
          viewMode: listing.mode,
          viewScale: listing.scale
        });
        setRight({
          ...r,
          ...rightHist,
          selected: null,
          matchNames: new Set(),
          status: r.path,
          listening: null,
          filter: '',
          viewMode: listing.mode,
          viewScale: listing.scale
        });
        pushLog(`[${stamp()}] Panes: ${l.path} | ${r.path}`);
      } catch (error) {
        pushLog(error instanceof Error ? error.message : String(error));
      }
    })();
  }, [pushLog]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        focusJump();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        void addCurrentFavorite();
        return;
      }
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (typing) return;
      const c = cmds();
      if (event.key === 'Tab') {
        event.preventDefault();
        setActive((side) => (side === 'left' ? 'right' : 'left'));
        return;
      }
      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        c?.back();
        return;
      }
      if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault();
        c?.forward();
        return;
      }
      if (event.altKey && event.key === 'ArrowUp') {
        event.preventDefault();
        c?.parent();
        return;
      }
      if (event.key === 'F2') {
        event.preventDefault();
        c?.rename();
        return;
      }
      if (event.key === 'F5') {
        event.preventDefault();
        c?.copyToOther();
        return;
      }
      if (event.key === 'F6') {
        event.preventDefault();
        c?.moveToOther();
        return;
      }
      if (event.key === 'F7') {
        event.preventDefault();
        c?.newFolder();
        return;
      }
      if (event.key === 'Delete') {
        event.preventDefault();
        c?.delete();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, addCurrentFavorite, focusJump]);

  useEffect(() => {
    return api().onMenuCommand((command) => {
      const c = cmds();
      switch (command) {
        case 'file:new-folder':
          c?.newFolder();
          break;
        case 'file:rename':
          c?.rename();
          break;
        case 'file:delete':
          c?.delete();
          break;
        case 'file:copy-path':
          c?.copyPath();
          break;
        case 'file:open':
          c?.open();
          break;
        case 'file:open-notepad':
          c?.openNotepad();
          break;
        case 'file:open-terminal':
          c?.openTerminal();
          break;
        case 'file:reveal':
          c?.reveal();
          break;
        case 'file:refresh':
          c?.refresh();
          break;
        case 'edit:copy':
          c?.copy();
          break;
        case 'edit:cut':
          c?.cut();
          break;
        case 'edit:paste':
          c?.paste();
          break;
        case 'edit:copy-other':
          c?.copyToOther();
          break;
        case 'edit:move-other':
          c?.moveToOther();
          break;
        case 'view:toggle-hidden':
          setShowHidden((v) => !v);
          break;
        case 'view:toggle-autonav':
          setAutoNavigate((v) => !v);
          break;
        case 'view:theme-dark':
        case 'view:theme-light':
        case 'view:theme-nord':
        case 'view:theme-dracula': {
          const id = command.replace('view:theme-', '');
          if (isThemeId(id)) setTheme(id);
          break;
        }
        case 'window:focus-left':
          setActive('left');
          break;
        case 'window:focus-right':
          setActive('right');
          break;
        case 'go:jump':
          focusJump();
          break;
        case 'go:add-favorite':
          void addCurrentFavorite();
          break;
        case 'voice:navigate':
          c?.voiceNavigate();
          break;
        case 'voice:action':
          c?.voiceAction();
          break;
        case 'help:about':
          pushLog('ZeroG FileMan — local dual-pane voice file manager (HappyMonkeyAI)');
          break;
        default:
          break;
      }
    });
  }, [active, addCurrentFavorite, focusJump, pushLog]);

  const runGlobalJump = async () => {
    const q = jumpQuery.trim();
    if (!q) return;
    if (looksLikeAbsolutePath(q)) {
      await goActive(q);
      return;
    }
    cmds()?.navigateFuzzy(q);
  };

  const activePath = (active === 'left' ? left : right)?.path ?? '';
  const activeIsFavorite = isFavoritePath(favorites, activePath);

  if (!left || !right) {
    return (
      <div className="app">
        <div className="brandbar">
          <span className="brand-mark">ZEROG</span>
          <span className="brand-name">FileMan</span>
          <span className="brandbar status">Starting…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="brandbar">
        <span className="brand-mark">
          <Icon name="terminal" /> ZEROG
        </span>
        <span className="brand-name">FileMan</span>
        <span className="brand-live">
          <span className="dot" /> Dual Commander
        </span>
        <div className="status">
          {clipboard ? `clip: ${clipboard.mode} ${clipboard.name}` : 'Local Electron · voice jewels ready'}
        </div>
        <div className="global-jump">
          <Icon name="spark" />
          <input
            ref={jumpInputRef}
            value={jumpQuery}
            onChange={(e) => setJumpQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void runGlobalJump();
              if (e.key === 'Escape') {
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="Jump path or fuzzy…"
            aria-label="Global jump"
          />
          <span className="kbd">Ctrl+K</span>
        </div>
        <select
          value={theme}
          onChange={(e) => {
            if (isThemeId(e.target.value)) setTheme(e.target.value);
          }}
          aria-label="Theme"
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '2px 6px',
            fontFamily: 'var(--mono)',
            fontSize: 11
          }}
        >
          <option value="dark">Deck</option>
          <option value="light">Light</option>
          <option value="nord">Nord</option>
          <option value="dracula">Dracula</option>
        </select>
      </header>

      <section className="favorites-bar" aria-label="Favorites">
        <span className="favorites-label">
          <Icon name="star" /> Fav
        </span>
        <div className="favorites-chips">
          {favorites.map((fav) => (
            <button
              key={fav.path}
              type="button"
              className={`fav-chip${fav.path.toLowerCase() === activePath.toLowerCase() ? ' current' : ''}`}
              title={fav.path}
              onClick={() => void goActive(fav.path)}
              onContextMenu={(e) => {
                e.preventDefault();
                void removeFavoriteChip(fav.path);
              }}
            >
              <span>{fav.label}</span>
              <span
                className="fav-remove"
                role="button"
                tabIndex={-1}
                title="Remove favorite"
                onClick={(e) => {
                  e.stopPropagation();
                  void removeFavoriteChip(fav.path);
                }}
              >
                ×
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="fav-add"
          title={activeIsFavorite ? 'Current path already favorited (Ctrl+D)' : 'Add current path (Ctrl+D)'}
          disabled={!activePath || activeIsFavorite}
          onClick={() => void addCurrentFavorite()}
        >
          <Icon name="plus" /> Add
        </button>
      </section>

      <section className="master-toolbar">
        <div className="tool-groups">
          <div className="tool-group">
            <ToolButton
              icon="chevron-left"
              title="Back (Alt+Left)"
              disabled={!canGoBack(historyOf(active === 'left' ? left : right))}
              onClick={() => cmds()?.back()}
            />
            <ToolButton
              icon="chevron-right"
              title="Forward (Alt+Right)"
              disabled={!canGoForward(historyOf(active === 'left' ? left : right))}
              onClick={() => cmds()?.forward()}
            />
            <ToolButton icon="level-up" title="Parent (Alt+Up)" onClick={() => cmds()?.parent()} />
            <span className="tool-sep" />
            <ToolButton icon="refresh" title="Refresh" onClick={() => cmds()?.refresh()} />
          </div>
          <div className="tool-group">
            <ToolButton icon="folder-plus" label="New Folder" hint="F7" title="New folder" tone="accent" onClick={() => cmds()?.newFolder()} />
            <ToolButton icon="pencil" label="Rename" hint="F2" title="Rename" tone="warn" onClick={() => cmds()?.rename()} />
            <ToolButton icon="trash" label="Delete" title="Delete" danger onClick={() => cmds()?.delete()} />
          </div>
          <div className="tool-group">
            <ToolButton icon="copy" label="Copy" title="Copy to clipboard" tone="violet" onClick={() => cmds()?.copy()} />
            <ToolButton icon="cut" label="Cut" title="Cut to clipboard" tone="ok" onClick={() => cmds()?.cut()} />
            <ToolButton icon="clipboard" label="Paste" title="Paste" disabled={!clipboard} onClick={() => cmds()?.paste()} />
            <ToolButton icon="send-right" label="Copy →" hint="F5" title="Copy selection to other pane" tone="violet" onClick={() => cmds()?.copyToOther()} />
            <ToolButton icon="arrow-down" label="Move →" hint="F6" title="Move selection to other pane" tone="ok" onClick={() => cmds()?.moveToOther()} />
            <ToolButton icon="path" label="Copy Path" title="Copy path" tone="sky" onClick={() => cmds()?.copyPath()} />
          </div>
          <div className="tool-group">
            <ToolButton icon="terminal" label="Terminal" title="Terminal here" tone="teal" onClick={() => cmds()?.openTerminal()} />
            <ToolButton
              icon="bot"
              label="Cursor"
              title="Open selection in Cursor"
              onClick={() => {
                const pane = active === 'left' ? left : right;
                const target = pane.selected ? joinLocal(pane.path, pane.selected) : pane.path;
                void api().openWith(target, 'cursor');
              }}
            />
          </div>
          <div className="tool-group" role="group" aria-label="Active pane view">
            <ToolButton
              icon="list"
              title="Details view"
              onClick={() => {
                const setter = active === 'left' ? setLeft : setRight;
                setter((prev) => {
                  if (!prev) return prev;
                  storeListingPrefs({ mode: 'details', scale: prev.viewScale });
                  return { ...prev, viewMode: 'details' };
                });
              }}
            />
            <ToolButton
              icon="grid"
              title="Icons view (Ctrl+wheel zoom)"
              onClick={() => {
                const setter = active === 'left' ? setLeft : setRight;
                setter((prev) => {
                  if (!prev) return prev;
                  storeListingPrefs({ mode: 'icons', scale: prev.viewScale });
                  return { ...prev, viewMode: 'icons' };
                });
              }}
            />
            <ToolButton
              icon="image"
              title="Thumbnails view (Ctrl+wheel zoom)"
              onClick={() => {
                const setter = active === 'left' ? setLeft : setRight;
                setter((prev) => {
                  if (!prev) return prev;
                  storeListingPrefs({ mode: 'thumbnails', scale: prev.viewScale });
                  return { ...prev, viewMode: 'thumbnails' };
                });
              }}
            />
          </div>
          <div className="tool-group" role="group" aria-label="Workspace layout">
            <ToolButton
              icon="split-v"
              title="Side by side"
              onClick={() => updateWorkspaceLayout(setLayout(workspaceLayout, 'split-v'))}
            />
            <ToolButton
              icon="split-h"
              title="Stacked"
              onClick={() => updateWorkspaceLayout(setLayout(workspaceLayout, 'split-h'))}
            />
            <ToolButton
              icon={workspaceLayout.maximized ? 'restore' : 'maximize'}
              title={workspaceLayout.maximized ? 'Restore split' : 'Maximize active pane'}
              onClick={() => updateWorkspaceLayout(toggleMaximize(workspaceLayout, active))}
            />
          </div>
        </div>
        <div className="toolbar-end">
          <label className="check">
            <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
            Show Hidden
          </label>
          <label className="check hot">
            <input type="checkbox" checked={autoNavigate} onChange={(e) => setAutoNavigate(e.target.checked)} />
            Auto-nav
          </label>
        </div>
      </section>

      <main
        ref={workspaceRef}
        className={`workspace layout-${workspaceLayout.layout}${workspaceLayout.maximized ? ' maximized' : ''}`}
        style={
          {
            gridTemplateColumns: workspaceGridTemplate(workspaceLayout).columns,
            gridTemplateRows: workspaceGridTemplate(workspaceLayout).rows
          } as CSSProperties
        }
      >
        {workspaceLayout.maximized !== 'right' ? (
          <FilePane
            side="left"
            pane={left}
            active={active === 'left'}
            maximized={workspaceLayout.maximized === 'left'}
            showHidden={showHidden}
            autoNavigate={autoNavigate}
            speechSettings={speechSettings}
            terminalPrefs={terminalPrefs}
            demoText={demoText}
            clipboard={clipboard}
            otherPath={right.path}
            onActivate={() => setActive('left')}
            onChange={setLeft}
            onLog={pushLog}
            onClipboard={setClipboard}
            onToggleMaximize={() => updateWorkspaceLayout(toggleMaximize(workspaceLayout, 'left'))}
            onRefreshPeer={() => refreshSide('right')}
            onRegisterCommands={(c) => {
              leftCommands.current = c;
            }}
          />
        ) : null}
        {!workspaceLayout.maximized ? (
          <div
            className={`workspace-gutter ${workspaceLayout.layout === 'split-h' ? 'horizontal' : 'vertical'}`}
            role="separator"
            aria-orientation={workspaceLayout.layout === 'split-h' ? 'horizontal' : 'vertical'}
            aria-valuenow={Math.round(workspaceLayout.ratio * 100)}
            title="Drag to resize"
            onPointerDown={(event) => {
              const box = workspaceRef.current?.getBoundingClientRect();
              if (!box) return;
              event.preventDefault();
              (event.target as HTMLElement).setPointerCapture(event.pointerId);
              dragRef.current = {
                start: workspaceLayout.layout === 'split-h' ? event.clientY : event.clientX,
                ratio: workspaceLayout.ratio,
                vertical: workspaceLayout.layout === 'split-v'
              };
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current;
              const box = workspaceRef.current?.getBoundingClientRect();
              if (!drag || !box) return;
              const span = drag.vertical ? box.width : box.height;
              if (span <= 0) return;
              const delta = (drag.vertical ? event.clientX : event.clientY) - drag.start;
              updateWorkspaceLayout({
                ...workspaceLayout,
                ratio: clampSplitRatio(drag.ratio + delta / span)
              });
            }}
            onPointerUp={() => {
              dragRef.current = null;
            }}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
            onDoubleClick={() =>
              updateWorkspaceLayout({ ...workspaceLayout, ratio: 0.5 })
            }
          />
        ) : null}
        {workspaceLayout.maximized !== 'left' ? (
          <FilePane
            side="right"
            pane={right}
            active={active === 'right'}
            maximized={workspaceLayout.maximized === 'right'}
            showHidden={showHidden}
            autoNavigate={autoNavigate}
            speechSettings={speechSettings}
            terminalPrefs={terminalPrefs}
            demoText={demoText}
            clipboard={clipboard}
            otherPath={left.path}
            onActivate={() => setActive('right')}
            onChange={setRight}
            onLog={pushLog}
            onClipboard={setClipboard}
            onToggleMaximize={() => updateWorkspaceLayout(toggleMaximize(workspaceLayout, 'right'))}
            onRefreshPeer={() => refreshSide('left')}
            onRegisterCommands={(c) => {
              rightCommands.current = c;
            }}
          />
        ) : null}
      </main>

      <section className={`transcript${speechSettingsOpen ? ' settings-open' : ''}`}>
        <div className="transcript-bar">
          <span>
            <strong>TRANSCRIPT & ACTION BUS</strong>
            <span style={{ margin: '0 8px', color: 'var(--divider)' }}>·</span>
            fuzzy: depth-2
            <span style={{ margin: '0 8px', color: 'var(--divider)' }}>·</span>
            engine: {speechSettings.engine}
            {speechKeyStatus.stored ? (
              <>
                <span style={{ margin: '0 8px', color: 'var(--divider)' }}>·</span>
                key: {speechKeyStatus.sessionOnly ? 'session' : 'stored'}
              </>
            ) : null}
          </span>
          <span>
            <button
              type="button"
              className="speech-gear"
              title="Settings"
              aria-expanded={speechSettingsOpen}
              onClick={() => setSpeechSettingsOpen((v) => !v)}
            >
              <Icon name="info" /> Settings
            </button>
            <span className="kbd">Tab</span> pane · <span className="kbd">Ctrl+K</span> jump ·{' '}
            <span className="kbd">F5/F6</span> copy/move→
          </span>
        </div>
        {speechSettingsOpen ? (
          <div className="speech-settings">
            <label>
              Engine
              <select
                value={speechSettings.engine}
                onChange={(e) => updateSpeech({ engine: e.target.value as SpeechSettings['engine'] })}
              >
                <option value="demo">Demo</option>
                <option value="builtin">Builtin Whisper</option>
                <option value="server">Server ASR</option>
              </select>
            </label>
            <label>
              Model
              <select
                value={speechSettings.model}
                disabled={speechSettings.engine !== 'builtin'}
                title={describeDownload(speechSettings.model, speechSettings.precision)}
                onChange={(e) => updateSpeech({ model: e.target.value })}
              >
                {SPEECH_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Precision
              <select
                value={speechSettings.precision}
                disabled={speechSettings.engine !== 'builtin'}
                onChange={(e) =>
                  updateSpeech({ precision: e.target.value as SpeechSettings['precision'] })
                }
              >
                {SPEECH_PRECISIONS.map((p) => (
                  <option key={p.value} value={p.value} title={p.detail}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Device
              <select
                value={speechSettings.device}
                disabled={speechSettings.engine !== 'builtin'}
                onChange={(e) => updateSpeech({ device: e.target.value as SpeechSettings['device'] })}
              >
                <option value="wasm">WASM (CPU)</option>
                <option value="webgpu">WebGPU</option>
              </select>
            </label>
            <label>
              Language
              <select
                value={speechSettings.language}
                disabled={
                  speechSettings.engine === 'demo' ||
                  (speechSettings.engine === 'builtin' && !supportsLanguageSelection(speechSettings.model))
                }
                onChange={(e) => updateSpeech({ language: e.target.value })}
              >
                {SPEECH_LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Silence RMS
              <input
                type="number"
                min={0}
                max={0.1}
                step={0.001}
                value={speechSettings.silenceRmsThreshold}
                onChange={(e) => updateSpeech({ silenceRmsThreshold: Number(e.target.value) })}
              />
            </label>
            <label>
              Max sec
              <input
                type="number"
                min={3}
                max={120}
                step={1}
                value={speechSettings.maxUtteranceSeconds}
                onChange={(e) => updateSpeech({ maxUtteranceSeconds: Number(e.target.value) })}
              />
            </label>
            <label>
              Terminal
              <select
                value={terminalPrefs.launcher}
                onChange={(e) =>
                  updateTerminalPrefs({ launcher: e.target.value as TerminalLauncher })
                }
                title="What the Terminal button opens"
              >
                <option value="system">System terminal</option>
                <option value="zerogterm">ZeroG Term</option>
                <option value="custom">Custom command</option>
              </select>
            </label>
            <label className="speech-span-2">
              Custom terminal
              <input
                value={terminalPrefs.customCommand}
                disabled={terminalPrefs.launcher !== 'custom'}
                placeholder='e.g. wt.exe -d "{path}" or "C:\Apps\Term.exe"'
                onChange={(e) => updateTerminalPrefs({ customCommand: e.target.value })}
              />
            </label>
            <label className="speech-span-2">
              Server URL
              <input
                value={speechSettings.serverUrl}
                disabled={speechSettings.engine !== 'server'}
                onChange={(e) => updateSpeech({ serverUrl: e.target.value })}
                placeholder="http://127.0.0.1:8080/v1/audio/transcriptions"
              />
            </label>
            <label>
              Server model
              <input
                value={speechSettings.serverModel}
                disabled={speechSettings.engine !== 'server'}
                onChange={(e) => updateSpeech({ serverModel: e.target.value })}
              />
            </label>
            <label className="speech-span-2">
              API key {speechKeyStatus.encryptionAvailable ? '(safeStorage)' : '(session only)'}
              <div className="speech-key-row">
                <input
                  type="password"
                  value={speechKeyDraft}
                  disabled={speechSettings.engine !== 'server'}
                  placeholder={speechKeyStatus.stored ? '•••••••• (saved)' : 'Optional Bearer token'}
                  onChange={(e) => setSpeechKeyDraft(e.target.value)}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="fav-add"
                  disabled={speechSettings.engine !== 'server' || !speechKeyDraft.trim()}
                  onClick={() => {
                    void api()
                      .saveSpeechApiKey(speechKeyDraft)
                      .then((status) => {
                        setSpeechKeyStatus(status);
                        setSpeechKeyDraft('');
                        pushLog(
                          `[${stamp()}] speech API key ${status.sessionOnly ? 'held for session' : 'stored'}`
                        );
                      })
                      .catch((error) =>
                        pushLog(error instanceof Error ? error.message : String(error))
                      );
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="fav-add"
                  disabled={speechSettings.engine !== 'server' || !speechKeyStatus.stored}
                  onClick={() => {
                    void api()
                      .clearSpeechApiKey()
                      .then((status) => {
                        setSpeechKeyStatus(status);
                        pushLog(`[${stamp()}] speech API key cleared`);
                      })
                      .catch((error) =>
                        pushLog(error instanceof Error ? error.message : String(error))
                      );
                  }}
                >
                  Clear
                </button>
              </div>
            </label>
          </div>
        ) : null}
        <div className="transcript-log">
          {log.slice(speechSettingsOpen ? -3 : -6).map((line, i) => (
            <div key={`${i}-${line}`} className={line.includes('→') || line.includes('navigate') ? 'line-accent' : undefined}>
              {line}
            </div>
          ))}
        </div>
        <div className="transcript-input">
          <select
            value={speechSettings.engine}
            onChange={(e) => updateSpeech({ engine: e.target.value as SpeechSettings['engine'] })}
            aria-label="Speech engine"
          >
            <option value="demo">Demo</option>
            <option value="builtin">Builtin Whisper</option>
            <option value="server">Server ASR</option>
          </select>
          {speechSettings.engine === 'builtin' ? (
            <select
              value={speechSettings.model}
              onChange={(e) => updateSpeech({ model: e.target.value })}
              aria-label="Whisper model"
              title={describeDownload(speechSettings.model, speechSettings.precision)}
            >
              {SPEECH_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          ) : null}
          <input
            value={demoText}
            onChange={(e) => setDemoText(e.target.value)}
            placeholder={
              speechSettings.engine === 'demo'
                ? 'Demo transcript…'
                : speechSettings.engine === 'builtin'
                  ? 'Mic → local Whisper (first run downloads model)'
                  : 'Mic → server ASR'
            }
            aria-label="Demo transcript"
            disabled={speechSettings.engine !== 'demo'}
          />
          <ToolButton icon="mic" label="Nav" title="Navigate jewel" onClick={() => cmds()?.voiceNavigate()} />
          <ToolButton icon="spark" label="Act" title="Action jewel" onClick={() => cmds()?.voiceAction()} />
        </div>
      </section>

      <footer className="statusbar">
        <div className="cluster" title="Pane item counts (lit = active)">
          <span>
            <span className={`dot ${active === 'left' ? 'on' : 'off'}`} /> <em>{left.entries.length}</em>
          </span>
          <span>|</span>
          <span>
            <span className={`dot ${active === 'right' ? 'on' : 'off'}`} /> <em>{right.entries.length}</em>
          </span>
        </div>
        <div className="cluster">
          jewels: click toggle · hold PTT · Esc cancel
        </div>
        <div className="cluster">
          theme: {theme} ·{' '}
          {workspaceLayout.maximized
            ? 'maximized'
            : workspaceLayout.layout === 'split-h'
              ? 'stacked'
              : 'side by side'}
        </div>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
