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
import { DEFAULT_SPEECH, SpeechClient } from './speech.js';
import { isMostlySilence, VoiceRecorder } from './voice.js';
import './styles.css';

type PaneState = {
  path: string;
  entries: FileEntry[];
  selected: string | null;
  matchNames: Set<string>;
  status: string;
  listening: VoiceMode | null;
};

type FileClip = {
  mode: 'copy' | 'cut';
  path: string;
  kind: FileEntry['kind'];
  name: string;
};

const speech = new SpeechClient();

function api() {
  return window.fileman;
}

async function loadPane(path?: string): Promise<Pick<PaneState, 'path' | 'entries'>> {
  const listing = await api().listLocalDirectory(path);
  return { path: listing.path, entries: listing.entries };
}

function FilePane(props: {
  pane: PaneState;
  active: boolean;
  showHidden: boolean;
  autoNavigate: boolean;
  speechSettings: SpeechSettings;
  demoText: string;
  clipboard: FileClip | null;
  onActivate: () => void;
  onChange: (next: PaneState) => void;
  onStatus: (message: string) => void;
  onClipboard: (clip: FileClip | null) => void;
  onRefreshPeer?: () => void;
}) {
  const {
    pane,
    active,
    showHidden,
    autoNavigate,
    speechSettings,
    demoText,
    clipboard,
    onActivate,
    onChange,
    onStatus,
    onClipboard,
    onRefreshPeer
  } = props;

  const crumbs = useMemo(() => breadcrumbSegments(pane.path), [pane.path]);
  const visible = useMemo(
    () => pane.entries.filter((e) => showHidden || !isHiddenName(e.name)),
    [pane.entries, showHidden]
  );
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const selectedEntry = visible.find((e) => e.name === pane.selected) ?? null;

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
      } catch (error) {
        onStatus(error instanceof Error ? error.message : String(error));
      }
    },
    [onChange, onStatus, pane]
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
  }, [onChange, pane]);

  const requireSelection = useCallback((): { path: string; kind: FileEntry['kind']; name: string } | null => {
    if (!selectedEntry) {
      onStatus('Select a file or folder first.');
      return null;
    }
    return {
      path: joinLocal(pane.path, selectedEntry.name),
      kind: selectedEntry.kind,
      name: selectedEntry.name
    };
  }, [onStatus, pane.path, selectedEntry]);

  const doNewFolder = useCallback(async () => {
    const name = window.prompt('New folder name', 'New Folder');
    if (!name?.trim()) {
      onChange({ ...pane, status: 'New folder cancelled', listening: null });
      return;
    }
    await api().createLocalDirectory(joinLocal(pane.path, name.trim()));
    await navigateTo(pane.path);
    onStatus(`Created folder ${name.trim()}`);
  }, [navigateTo, onChange, onStatus, pane]);

  const doRename = useCallback(async () => {
    const sel = requireSelection();
    if (!sel) return;
    const next = window.prompt('Rename to', sel.name);
    if (!next?.trim() || next.trim() === sel.name) {
      onChange({ ...pane, status: 'Rename cancelled', listening: null });
      return;
    }
    await api().renameLocalEntry(sel.path, joinLocal(pane.path, next.trim()));
    await refresh();
    onStatus(`Renamed to ${next.trim()}`);
  }, [onChange, onStatus, pane, refresh, requireSelection]);

  const doDelete = useCallback(async () => {
    const sel = requireSelection();
    if (!sel) return;
    if (sel.kind === 'directory') {
      const ok = window.confirm(
        `Delete empty folder “${sel.name}”? Non-empty folders are refused (no recursive delete).`
      );
      if (!ok) return;
    } else {
      const ok = window.confirm(`Delete “${sel.name}”?`);
      if (!ok) return;
    }
    await api().removeLocalEntry(sel.path, sel.kind);
    await refresh();
    onStatus(`Deleted ${sel.name}`);
  }, [onStatus, refresh, requireSelection]);

  const doCopyClip = useCallback(
    (mode: 'copy' | 'cut') => {
      const sel = requireSelection();
      if (!sel) return;
      onClipboard({ mode, path: sel.path, kind: sel.kind, name: sel.name });
      onChange({
        ...pane,
        status: mode === 'copy' ? `Copied ${sel.name}` : `Cut ${sel.name}`,
        listening: null
      });
    },
    [onChange, onClipboard, pane, requireSelection]
  );

  const doPaste = useCallback(async () => {
    if (!clipboard) {
      onStatus('Clipboard is empty.');
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
      onStatus(`Pasted → ${baseName(dest)}`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    }
  }, [clipboard, onClipboard, onRefreshPeer, onStatus, pane.path, refresh]);

  const applyNavigate = useCallback(
    async (transcript: string) => {
      onChange({ ...pane, status: `Searching for “${transcript}”…`, listening: null });
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
          item: {
            name: m.item.name,
            kind: m.item.kind,
            size: 0
          },
          score: m.score
        }));
        if (deep[0]) {
          bestPath = deep[0].item.path;
          bestKind = deep[0].item.kind;
          label = deep[0].item.relative;
        }
      }

      if (!bestPath || !bestKind || !label) {
        onChange({
          ...pane,
          matchNames,
          status: `No match for “${transcript}”`,
          listening: null
        });
        return;
      }

      onChange({
        ...pane,
        selected: baseName(bestPath) === bestPath ? null : baseName(bestPath),
        matchNames,
        status: `Navigate: ${label} (${matches.length} match${matches.length === 1 ? '' : 'es'})`,
        listening: null
      });

      const go = autoNavigate || window.confirm(`Go to “${label}?`);
      if (!go) return;
      if (bestKind === 'directory' || bestKind === 'symlink') await navigateTo(bestPath);
      else await navigateTo(parentLocal(bestPath));
    },
    [autoNavigate, navigateTo, onChange, pane, visible]
  );

  const applyAction = useCallback(
    async (transcript: string) => {
      const parsed = parseActionCommand(transcript);
      if (!parsed) {
        onChange({ ...pane, status: 'Empty action', listening: null });
        return;
      }
      const selectedPath = pane.selected ? joinLocal(pane.path, pane.selected) : pane.path;
      try {
        switch (parsed.id) {
          case 'copy-path':
            await api().copyText(selectedPath);
            onChange({ ...pane, status: `Copied path: ${selectedPath}`, listening: null });
            break;
          case 'copy-item':
            doCopyClip('copy');
            break;
          case 'cut-item':
            doCopyClip('cut');
            break;
          case 'paste':
            await doPaste();
            onChange({ ...pane, listening: null });
            break;
          case 'delete':
            await doDelete();
            break;
          case 'rename':
            await doRename();
            break;
          case 'open-notepad':
            await api().openWith(selectedPath, 'notepad');
            onChange({ ...pane, status: `Notepad: ${selectedPath}`, listening: null });
            break;
          case 'open-cursor':
            await api().openWith(selectedPath, 'cursor');
            onChange({ ...pane, status: `Cursor: ${selectedPath}`, listening: null });
            break;
          case 'open-terminal':
            await api().openWith(pane.path, 'terminal');
            onChange({ ...pane, status: `Terminal here: ${pane.path}`, listening: null });
            break;
          case 'open-default':
            await api().openPath(selectedPath);
            onChange({ ...pane, status: `Opened: ${selectedPath}`, listening: null });
            break;
          case 'new-folder':
            await doNewFolder();
            break;
          case 'reveal':
            await api().showItemInFolder(selectedPath);
            onChange({ ...pane, status: `Revealed: ${selectedPath}`, listening: null });
            break;
          case 'refresh':
            await refresh();
            break;
          default:
            onChange({
              ...pane,
              status: `Unknown action: “${parsed.raw}”`,
              listening: null
            });
        }
      } catch (error) {
        onChange({
          ...pane,
          status: error instanceof Error ? error.message : String(error),
          listening: null
        });
      }
    },
    [doCopyClip, doDelete, doNewFolder, doPaste, doRename, onChange, pane, refresh]
  );

  const toggleJewel = useCallback(
    async (mode: VoiceMode) => {
      onActivate();

      if (speechSettings.engine === 'demo') {
        onChange({ ...pane, listening: mode, status: `Demo (${mode})…` });
        try {
          const result = await speech.transcribe(new Float32Array(0), speechSettings, undefined, demoText);
          if (mode === 'navigate') await applyNavigate(result.text);
          else await applyAction(result.text);
        } catch (error) {
          onChange({
            ...pane,
            listening: null,
            status: error instanceof Error ? error.message : String(error)
          });
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
          if (mode === 'navigate') await applyNavigate(result.text);
          else await applyAction(result.text);
        } catch (error) {
          onChange({
            ...pane,
            listening: null,
            status: error instanceof Error ? error.message : String(error)
          });
        }
        return;
      }

      if (pane.listening) return;
      const recorder = new VoiceRecorder();
      recorderRef.current = recorder;
      onChange({
        ...pane,
        listening: mode,
        status: `Listening (${mode}) — click jewel again to stop`
      });
      try {
        await recorder.start();
      } catch (error) {
        recorderRef.current = null;
        onChange({
          ...pane,
          listening: null,
          status: error instanceof Error ? error.message : String(error)
        });
      }
    },
    [applyAction, applyNavigate, demoText, onActivate, onChange, pane, speechSettings]
  );

  return (
    <section className={`pane${active ? ' active' : ''}`} onMouseDown={onActivate}>
      <div className="pane-toolbar">
        <nav className="breadcrumbs" aria-label="Path">
          {crumbs.map((crumb, index) => (
            <span key={crumb.path}>
              {index > 0 ? <span className="crumb-sep">/</span> : null}
              <button type="button" className="crumb" onClick={() => void navigateTo(crumb.path)}>
                {crumb.label}
              </button>
            </span>
          ))}
        </nav>
        <div className="jewels">
          <button
            type="button"
            className={`jewel nav${pane.listening === 'navigate' ? ' listening' : ''}`}
            title="Navigate by voice"
            aria-label="Navigate voice"
            onClick={() => void toggleJewel('navigate')}
          >
            N
          </button>
          <button
            type="button"
            className={`jewel act${pane.listening === 'action' ? ' listening' : ''}`}
            title="Action by voice"
            aria-label="Action voice"
            onClick={() => void toggleJewel('action')}
          >
            A
          </button>
        </div>
      </div>
      <div className="pane-actions">
        <button type="button" className="tool" title="Parent" onClick={() => void navigateTo(parentLocal(pane.path))}>
          ↑
        </button>
        <button type="button" className="tool" onClick={() => void refresh()}>
          Refresh
        </button>
        <button type="button" className="tool" onClick={() => void doNewFolder()}>
          New folder
        </button>
        <button type="button" className="tool" onClick={() => void doRename()}>
          Rename
        </button>
        <button type="button" className="tool danger" onClick={() => void doDelete()}>
          Delete
        </button>
        <button type="button" className="tool" onClick={() => doCopyClip('copy')}>
          Copy
        </button>
        <button type="button" className="tool" onClick={() => doCopyClip('cut')}>
          Cut
        </button>
        <button type="button" className="tool" disabled={!clipboard} onClick={() => void doPaste()}>
          Paste
        </button>
        <button
          type="button"
          className="tool"
          onClick={() =>
            void api()
              .copyText(pane.path)
              .then(() => onChange({ ...pane, status: `Copied ${pane.path}` }))
          }
        >
          Copy path
        </button>
        <button
          type="button"
          className="tool"
          onClick={() => {
            const sel = requireSelection();
            if (sel) void api().openPath(sel.path);
          }}
        >
          Open
        </button>
        <button
          type="button"
          className="tool"
          onClick={() => {
            const sel = requireSelection();
            if (sel) void api().openWith(sel.path, 'notepad');
          }}
        >
          Notepad
        </button>
        <button type="button" className="tool" onClick={() => void api().openWith(pane.path, 'terminal')}>
          Terminal
        </button>
      </div>
      <div className="listing">
        <div className="entry-heading">
          <span>Name</span>
          <span>Size</span>
          <span>Modified</span>
        </div>
        <button type="button" className="entry" onDoubleClick={() => void navigateTo(parentLocal(pane.path))}>
          <span className="name dir">..</span>
          <span>—</span>
          <span />
        </button>
        {visible.map((entry) => {
          const selected = pane.selected === entry.name;
          const match = pane.matchNames.has(entry.name);
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
                {entry.kind === 'directory' ? '▣ ' : entry.kind === 'symlink' ? '↗ ' : '· '}
                {entry.name}
              </span>
              <span>{formatSize(entry)}</span>
              <span>{formatModified(entry.modified)}</span>
            </button>
          );
        })}
      </div>
      <div className="pane-footer">{pane.status || pane.path}</div>
    </section>
  );
}

function App() {
  const [left, setLeft] = useState<PaneState | null>(null);
  const [right, setRight] = useState<PaneState | null>(null);
  const [active, setActive] = useState<'left' | 'right'>('left');
  const [showHidden, setShowHidden] = useState(false);
  const [autoNavigate, setAutoNavigate] = useState(true);
  const [globalStatus, setGlobalStatus] = useState('Starting…');
  const [demoText, setDemoText] = useState('zerogfileman');
  const [speechSettings, setSpeechSettings] = useState<SpeechSettings>(DEFAULT_SPEECH);
  const [clipboard, setClipboard] = useState<FileClip | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  const refreshSide = useCallback(async (side: 'left' | 'right') => {
    if (side === 'left') {
      setLeft((prev) => {
        if (!prev) return prev;
        void loadPane(prev.path).then((next) =>
          setLeft({
            ...prev,
            ...next,
            status: `Refreshed ${next.path}`
          })
        );
        return prev;
      });
    } else {
      setRight((prev) => {
        if (!prev) return prev;
        void loadPane(prev.path).then((next) =>
          setRight({
            ...prev,
            ...next,
            status: `Refreshed ${next.path}`
          })
        );
        return prev;
      });
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const home = await api().homeDirectory();
        const development = joinLocal(home, 'Documents\\development');
        const docs = joinLocal(home, 'Documents');
        const favs = [home, docs];
        let leftPath = home;
        try {
          await api().listLocalDirectory(development);
          leftPath = development;
          favs.unshift(development);
        } catch {
          /* home only */
        }
        setFavorites([...new Set(favs)]);
        const [l, r] = await Promise.all([loadPane(leftPath), loadPane(home)]);
        setLeft({ ...l, selected: null, matchNames: new Set(), status: l.path, listening: null });
        setRight({ ...r, selected: null, matchNames: new Set(), status: r.path, listening: null });
        setGlobalStatus('MVP ready — toolbar CRUD, N/A jewels, demo transcript below');
      } catch (error) {
        setGlobalStatus(error instanceof Error ? error.message : String(error));
      }
    })();
  }, []);

  if (!left || !right) {
    return (
      <div className="app">
        <div className="topbar">
          <div className="brand">
            ZeroG <span>FileMan</span>
          </div>
          <div className="status">{globalStatus}</div>
        </div>
      </div>
    );
  }

  const jump = async (path: string) => {
    const setter = active === 'left' ? setLeft : setRight;
    const pane = active === 'left' ? left : right;
    try {
      const next = await loadPane(path);
      setter({
        ...pane,
        ...next,
        selected: null,
        matchNames: new Set(),
        status: next.path,
        listening: null
      });
    } catch (error) {
      setGlobalStatus(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          ZeroG <span>FileMan</span>
        </div>
        <div className="status">
          {globalStatus}
          {clipboard ? ` · clip: ${clipboard.mode} ${clipboard.name}` : ''}
        </div>
        <div className="favs">
          {favorites.map((path) => (
            <button key={path} type="button" className="tool" title={path} onClick={() => void jump(path)}>
              {baseName(path) || path}
            </button>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} /> Hidden
        </label>
        <label className="check">
          <input type="checkbox" checked={autoNavigate} onChange={(e) => setAutoNavigate(e.target.checked)} /> Auto-nav
        </label>
      </div>
      <div className="panes">
        <FilePane
          pane={left}
          active={active === 'left'}
          showHidden={showHidden}
          autoNavigate={autoNavigate}
          speechSettings={speechSettings}
          demoText={demoText}
          clipboard={clipboard}
          onActivate={() => setActive('left')}
          onChange={setLeft}
          onStatus={setGlobalStatus}
          onClipboard={setClipboard}
          onRefreshPeer={() => void refreshSide('right')}
        />
        <FilePane
          pane={right}
          active={active === 'right'}
          showHidden={showHidden}
          autoNavigate={autoNavigate}
          speechSettings={speechSettings}
          demoText={demoText}
          clipboard={clipboard}
          onActivate={() => setActive('right')}
          onChange={setRight}
          onStatus={setGlobalStatus}
          onClipboard={setClipboard}
          onRefreshPeer={() => void refreshSide('left')}
        />
      </div>
      <div className="demo-bar">
        <select
          value={speechSettings.engine}
          onChange={(e) =>
            setSpeechSettings({ ...speechSettings, engine: e.target.value as SpeechSettings['engine'] })
          }
          aria-label="Speech engine"
        >
          <option value="demo">Demo transcript</option>
          <option value="server">Server ASR</option>
        </select>
        <input
          value={demoText}
          onChange={(e) => setDemoText(e.target.value)}
          placeholder="Demo transcript (e.g. zerogfileman / copy path / new folder)"
          aria-label="Demo transcript"
        />
        <span className="hint">N = navigate · A = action · depth-2 fuzzy when not in current listing</span>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
