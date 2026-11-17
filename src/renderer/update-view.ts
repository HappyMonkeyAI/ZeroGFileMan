import type { UpdateState } from '../shared/update.js';

export function updateSummary(state: UpdateState | null): string {
  if (!state) return 'Update status is not available.';
  if (state.mode === 'disabled') return 'Update checks are off in a development or npm-installed build.';
  switch (state.status) {
    case 'idle':
      return 'Not checked yet.';
    case 'checking':
      return 'Checking for updates…';
    case 'current':
      return `You have the latest version (v${state.currentVersion}).`;
    case 'available':
      return `Version ${state.version} is available.`;
    case 'downloading':
      return `Downloading version ${state.version}… ${state.percent}%`;
    case 'ready':
      return `Version ${state.version} is downloaded and will install when ZeroG FileMan restarts.`;
    case 'error':
      return `The update check failed: ${state.message}`;
  }
}

export function updatePromptBody(state: UpdateState): string {
  if (state.status === 'ready') {
    return 'The update is downloaded. Restarting closes the FileMan window and any in-progress file operations.';
  }
  if (state.status === 'downloading') return 'Downloading the update. You can keep working while it finishes.';
  if (state.mode === 'install') {
    return 'FileMan can download it now and restart into it when you are ready. Nothing installs until you say so.';
  }
  return 'Download the new version from its release page.';
}
