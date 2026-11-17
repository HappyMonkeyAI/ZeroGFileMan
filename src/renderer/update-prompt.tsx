import { useEffect } from 'react';
import type { UpdateState } from '../shared/update.js';
import { updatePromptBody } from './update-view.js';

type UpdatePromptProps = {
  state: Extract<UpdateState, { status: 'available' | 'downloading' | 'ready' }>;
  onDownload: () => void;
  onInstall: () => void;
  onOpenRelease: () => void;
  onLater: () => void;
  onSkip: () => void;
};

export function UpdatePrompt({ state, onDownload, onInstall, onOpenRelease, onLater, onSkip }: UpdatePromptProps) {
  const installable = state.mode === 'install';

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onLater();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onLater]);

  return (
    <div
      className="update-layer"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onLater();
      }}
    >
      <div className="update-card" role="dialog" aria-modal="true" aria-labelledby="update-prompt-title">
        <div className="update-card-head">
          <div>
            <span className="eyebrow">UPDATE</span>
            <h2 id="update-prompt-title">
              {state.status === 'ready' ? `Version ${state.version} is ready` : `Version ${state.version} is available`}
            </h2>
          </div>
          <button type="button" className="update-close" onClick={onLater} aria-label="Close update prompt">×</button>
        </div>
        <p>
          You have v{state.currentVersion}. {updatePromptBody(state)}
        </p>
        {state.status === 'downloading' && (
          <div className="update-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.percent}>
            <span style={{ width: `${state.percent}%` }} />
          </div>
        )}
        <button type="button" className="update-link" onClick={onOpenRelease}>What’s new in {state.version}</button>
        <div className="update-actions">
          {state.status === 'available' && <button type="button" onClick={onSkip}>Skip this version</button>}
          <button type="button" onClick={onLater}>Later</button>
          {state.status === 'ready' ? (
            <button type="button" className="primary" autoFocus onClick={onInstall}>Restart &amp; install</button>
          ) : state.status === 'downloading' ? (
            <button type="button" className="primary" disabled>Downloading… {state.percent}%</button>
          ) : installable ? (
            <button type="button" className="primary" autoFocus onClick={onDownload}>Download &amp; install</button>
          ) : (
            <button type="button" className="primary" autoFocus onClick={onOpenRelease}>Open download page</button>
          )}
        </div>
      </div>
    </div>
  );
}
