import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type { FileEntry, SpeechSettings, VoiceMode } from '../shared/types.js';
import { Icon } from './icons.js';
import { DEFAULT_SPEECH, SpeechClient } from './speech.js';
import {
  applyTheme,
  isThemeId,
  loadStoredTheme,
  storeTheme,
  type ThemeId
} from './themes.js';
import { isMostlySilence, VoiceRecorder } from './voice.js';
import './styles.css';

type PaneState = {
  path: string;
  entries: FileEntry[];
  selected: string | null;
  matchNames: Set<string>;
  status: string;
  listening: VoiceMode | null;
  filter: string;
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
  copyPath: () => void;
  open: () => void;
  openNotepad: () => void;
  openTerminal: () => void;
  reveal: () => void;
  parent: () => void;
  voiceNavigate: () => void;
  voiceAction: () => void;
};

const speech = new SpeechClient();

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
  showHidden: boolean;
  autoNavigate: boolean;
  speechSettings: SpeechSettings;
  demoText: string;
  clipboard: FileClip | null;
  onActivate: () => void;
  onChange: (next: PaneState) => void;
  onLog: (message: string) => void;
  onClipboard: (clip: FileClip | null) => void;
  onRefreshPeer?: () => void;
  onRegisterCommands: (commands: PaneCommands | null) => void;
}) {
  const {
    side,
    pane,
    active,
    showHidden,
    autoNavigate,
    speechSettings,
    demoText,
    clipboard,
    onActivate,
    onChange,
    onLog,
    onClipboard,
    onRefreshPeer,
    onRegisterCommands
  } = props;

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
  const selectedEntry = visible.find((e) => e.name === pane.selected) ?? null;
  const dirs = visible.filter((e) => e.kind === 'directory' || e.kind === 'symlink').length;
  const files = visible.length - dirs;

  const navigateTo = useCallback(
    async (path: string) => {
      try {
        const next = await loadPane(path);
        onChange({
          ...pane,
          ...next,
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
            await api().openWith(pane.path, 'terminal');
            onLog(`[${stamp()}] terminal ${pane.path}`);
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
    [doCopyClip, doDelete, doNewFolder, doPaste, doRename, onChange, onLog, pane, refresh]
  );

  const toggleJewel = useCallback(
    async (mode: VoiceMode) => {
      onActivate();
      if (speechSettings.engine === 'demo') {
        onChange({ ...pane, listening: mode, status: `Demo (${mode})…` });
        try {
          const result = await speech.transcribe(new Float32Array(0), speechSettings, undefined, demoText);
          onLog(`[${stamp()}] ${mode}: “${result.text}”`);
          if (mode === 'navigate') await applyNavigate(result.text);
          else await applyAction(result.text);
        } catch (error) {
          onLog(error instanceof Error ? error.message : String(error));
          onChange({ ...pane, listening: null });
        }
        return;
      }

      if (pane.listening === mode && recorderRef.current) {
        const samples = await recorderRef.current.stop();
        recorderRef.current = null;
        if (!samples || isMostlySilence(samples, speechSettings.silenceRmsThreshold)) {
          onChange({ ...pane, listening: null, status: 'No speech detected' });
          return;
        }
        try {
          const result = await speech.transcribe(samples, speechSettings);
          onLog(`[${stamp()}] ${mode}: “${result.text}”`);
          if (mode === 'navigate') await applyNavigate(result.text);
          else await applyAction(result.text);
        } catch (error) {
          onLog(error instanceof Error ? error.message : String(error));
          onChange({ ...pane, listening: null });
        }
        return;
      }

      if (pane.listening) return;
      const recorder = new VoiceRecorder();
      recorderRef.current = recorder;
      onChange({ ...pane, listening: mode, status: `Listening (${mode})…` });
      try {
        await recorder.start();
      } catch (error) {
        recorderRef.current = null;
        onLog(error instanceof Error ? error.message : String(error));
        onChange({ ...pane, listening: null });
      }
    },
    [applyAction, applyNavigate, demoText, onActivate, onChange, onLog, pane, speechSettings]
  );

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
      copyPath: () => void api().copyText(pane.path).then(() => onLog(`[${stamp()}] copy path ${pane.path}`)),
      open: () => {
        const sel = requireSelection();
        if (sel) void api().openPath(sel.path);
      },
      openNotepad: () => {
        const sel = requireSelection();
        if (sel) void api().openWith(sel.path, 'notepad');
      },
      openTerminal: () => void api().openWith(pane.path, 'terminal'),
      reveal: () => {
        const target = pane.selected ? joinLocal(pane.path, pane.selected) : pane.path;
        void api().showItemInFolder(target);
      },
      parent: () => void navigateTo(parentLocal(pane.path)),
      voiceNavigate: () => void toggleJewel('navigate'),
      voiceAction: () => void toggleJewel('action')
    });
    return () => onRegisterCommands(null);
  }, [
    active,
    doCopyClip,
    doDelete,
    doNewFolder,
    doPaste,
    doRename,
    navigateTo,
    onLog,
    onRegisterCommands,
    pane.path,
    pane.selected,
    refresh,
    requireSelection,
    toggleJewel
  ]);

  return (
    <section className={`pane${active ? ' active' : ''}`} onMouseDown={onActivate}>
      <div className="pane-head">
        <div className="pane-head-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span className={`badge${active ? ' active' : ' idle'}`}>
              {active ? <span className="pulse" /> : <span className="pulse" style={{ background: '#64748b', animation: 'none' }} />}
              {side === 'left' ? 'LEFT' : 'RIGHT'} {active ? '(ACTIVE)' : '(TARGET)'}
            </span>
            <nav className="breadcrumbs" aria-label={`${side} path`}>
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
            <button type="button" className="pill" title="Terminal here" onClick={() => void api().openWith(pane.path, 'terminal')}>
              <Icon name="terminal" />
            </button>
            <span className={`pill${active ? ' lit' : ''}`}>{side === 'left' ? 'L' : 'R'}</span>
            <div className="jewels">
              <button
                type="button"
                className={`jewel nav${pane.listening === 'navigate' ? ' listening' : ''}`}
                title="Navigate voice"
                onClick={() => void toggleJewel('navigate')}
              >
                <Icon name="mic" />
              </button>
              <button
                type="button"
                className={`jewel act${pane.listening === 'action' ? ' listening' : ''}`}
                title="Action voice"
                onClick={() => void toggleJewel('action')}
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
              aria-label={`${side} filter`}
            />
          </div>
        </div>
      </div>
      <div className="entry-heading">
        <span>Name</span>
        <span style={{ textAlign: 'right' }}>Size</span>
        <span style={{ textAlign: 'right' }}>Modified</span>
      </div>
      <div className="listing">
        <button type="button" className="entry" onDoubleClick={() => void navigateTo(parentLocal(pane.path))}>
          <span className="name dir">
            <Icon name="level-up" />
            ..
          </span>
          <span className="meta">—</span>
          <span className="meta">—</span>
        </button>
        {visible.map((entry) => {
          const selected = pane.selected === entry.name;
          const match = pane.matchNames.has(entry.name);
          const kindIcon = entry.kind === 'directory' ? 'folder' : entry.kind === 'symlink' ? 'link' : 'file';
          return (
            <button
              key={entry.name}
              type="button"
              className={`entry${selected ? ' selected' : ''}${match ? ' match' : ''}`}
              onClick={() => onChange({ ...pane, selected: entry.name })}
              onDoubleClick={() => {
                if (entry.kind === 'directory' || entry.kind === 'symlink') {
                  void navigateTo(joinLocal(pane.path, entry.name));
                } else {
                  void api().openPath(joinLocal(pane.path, entry.name));
                }
              }}
            >
              <span className={`name${entry.kind === 'directory' ? ' dir' : ''}`}>
                <Icon name={kindIcon} />
                {entry.name}
              </span>
              <span className="meta">{formatSize(entry)}</span>
              <span className="meta">{formatModified(entry.modified)}</span>
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

function App() {
  const [left, setLeft] = useState<PaneState | null>(null);
  const [right, setRight] = useState<PaneState | null>(null);
  const [active, setActive] = useState<'left' | 'right'>('left');
  const [showHidden, setShowHidden] = useState(false);
  const [autoNavigate, setAutoNavigate] = useState(true);
  const [theme, setTheme] = useState<ThemeId>(() => loadStoredTheme());
  const [demoText, setDemoText] = useState('zerogfileman');
  const [speechSettings, setSpeechSettings] = useState<SpeechSettings>(DEFAULT_SPEECH);
  const [clipboard, setClipboard] = useState<FileClip | null>(null);
  const [log, setLog] = useState<string[]>([`[${stamp()}] ZeroG FileMan ready · dual commander`]);
  const leftCommands = useRef<PaneCommands | null>(null);
  const rightCommands = useRef<PaneCommands | null>(null);

  const pushLog = useCallback((message: string) => {
    setLog((prev) => [...prev.slice(-40), message]);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    storeTheme(theme);
  }, [theme]);

  const cmds = () => (active === 'left' ? leftCommands.current : rightCommands.current);

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
        const [l, r] = await Promise.all([loadPane(leftPath), loadPane(home)]);
        setLeft({
          ...l,
          selected: null,
          matchNames: new Set(),
          status: l.path,
          listening: null,
          filter: ''
        });
        setRight({
          ...r,
          selected: null,
          matchNames: new Set(),
          status: r.path,
          listening: null,
          filter: ''
        });
        pushLog(`[${stamp()}] Panes: ${l.path} | ${r.path}`);
      } catch (error) {
        pushLog(error instanceof Error ? error.message : String(error));
      }
    })();
  }, [pushLog]);

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
  }, [active, pushLog]);

  const runGlobalJump = async () => {
    const q = demoText.trim();
    if (!q) return;
    const pane = active === 'left' ? left : right;
    if (!pane) return;
    cmds()?.voiceNavigate();
  };

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
            value={demoText}
            onChange={(e) => setDemoText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void runGlobalJump();
            }}
            placeholder="Global jump / fuzzy locator…"
            aria-label="Global jump"
          />
          <span className="kbd">⌘K</span>
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

      <section className="master-toolbar">
        <div className="tool-groups">
          <div className="tool-group">
            <ToolButton icon="chevron-left" title="Parent" onClick={() => cmds()?.parent()} />
            <ToolButton icon="level-up" title="Up" onClick={() => cmds()?.parent()} />
            <span className="tool-sep" />
            <ToolButton icon="refresh" title="Refresh (F5)" onClick={() => cmds()?.refresh()} />
          </div>
          <div className="tool-group">
            <ToolButton icon="folder-plus" label="New Folder" hint="F7" title="New folder" tone="accent" onClick={() => cmds()?.newFolder()} />
            <ToolButton icon="pencil" label="Rename" hint="F2" title="Rename" tone="warn" onClick={() => cmds()?.rename()} />
            <ToolButton icon="trash" label="Delete" title="Delete" danger onClick={() => cmds()?.delete()} />
          </div>
          <div className="tool-group">
            <ToolButton icon="copy" label="Copy" title="Copy" tone="violet" onClick={() => cmds()?.copy()} />
            <ToolButton icon="cut" label="Move/Cut" title="Cut" tone="ok" onClick={() => cmds()?.cut()} />
            <ToolButton icon="clipboard" label="Paste" title="Paste" disabled={!clipboard} onClick={() => cmds()?.paste()} />
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

      <main className="workspace">
        <FilePane
          side="left"
          pane={left}
          active={active === 'left'}
          showHidden={showHidden}
          autoNavigate={autoNavigate}
          speechSettings={speechSettings}
          demoText={demoText}
          clipboard={clipboard}
          onActivate={() => setActive('left')}
          onChange={setLeft}
          onLog={pushLog}
          onClipboard={setClipboard}
          onRefreshPeer={() => refreshSide('right')}
          onRegisterCommands={(c) => {
            leftCommands.current = c;
          }}
        />
        <FilePane
          side="right"
          pane={right}
          active={active === 'right'}
          showHidden={showHidden}
          autoNavigate={autoNavigate}
          speechSettings={speechSettings}
          demoText={demoText}
          clipboard={clipboard}
          onActivate={() => setActive('right')}
          onChange={setRight}
          onLog={pushLog}
          onClipboard={setClipboard}
          onRefreshPeer={() => refreshSide('left')}
          onRegisterCommands={(c) => {
            rightCommands.current = c;
          }}
        />
      </main>

      <section className="transcript">
        <div className="transcript-bar">
          <span>
            <strong>TRANSCRIPT & ACTION BUS</strong>
            <span style={{ margin: '0 8px', color: 'var(--divider)' }}>·</span>
            fuzzy: depth-2
            <span style={{ margin: '0 8px', color: 'var(--divider)' }}>·</span>
            engine: {speechSettings.engine}
          </span>
          <span>
            <span className="kbd">Tab</span> pane · <span className="kbd">N</span>/<span className="kbd">A</span> jewels ·{' '}
            <span className="kbd">F5</span> refresh
          </span>
        </div>
        <div className="transcript-log">
          {log.slice(-6).map((line, i) => (
            <div key={`${i}-${line}`} className={line.includes('→') || line.includes('navigate') ? 'line-accent' : undefined}>
              {line}
            </div>
          ))}
        </div>
        <div className="transcript-input">
          <select
            value={speechSettings.engine}
            onChange={(e) =>
              setSpeechSettings({ ...speechSettings, engine: e.target.value as SpeechSettings['engine'] })
            }
            aria-label="Speech engine"
          >
            <option value="demo">Demo</option>
            <option value="server">Server ASR</option>
          </select>
          <input
            value={demoText}
            onChange={(e) => setDemoText(e.target.value)}
            placeholder="Demo / voice transcript…"
            aria-label="Demo transcript"
          />
          <ToolButton icon="mic" label="Nav" title="Navigate jewel" onClick={() => cmds()?.voiceNavigate()} />
          <ToolButton icon="spark" label="Act" title="Action jewel" onClick={() => cmds()?.voiceAction()} />
        </div>
      </section>

      <footer className="statusbar">
        <div className="cluster">
          <span>
            <span className={`dot ${active === 'left' ? 'on' : 'off'}`} /> Left: <em>{left.entries.length}</em>
          </span>
          <span>|</span>
          <span>
            <span className={`dot ${active === 'right' ? 'on' : 'off'}`} /> Right: <em>{right.entries.length}</em>
          </span>
        </div>
        <div className="cluster">
          N = navigate · A = action · depth-2 fuzzy
        </div>
        <div className="cluster">
          theme: {theme} · {active} pane
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
