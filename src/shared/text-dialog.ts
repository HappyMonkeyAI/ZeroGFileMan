// Rules for the in-app name dialog that replaces window.prompt (which
// Electron does not implement). Kept pure so the confirm/cancel behaviour
// is testable without a DOM.

export type TextDialogRequest = {
  title: string;
  message?: string;
  defaultValue?: string;
  confirmLabel?: string;
  /** Return a problem to keep the dialog open with an inline error. */
  validate?: (value: string) => string | null;
};

export type TextDialogOutcome =
  | { kind: 'confirm'; value: string }
  | { kind: 'cancel' }
  | { kind: 'invalid'; problem: string };

/** Enter/OK: trimmed value, empty cancels (matching the old prompt flow). */
export function resolveTextDialog(raw: string, validate?: (value: string) => string | null): TextDialogOutcome {
  const value = raw.trim();
  if (!value) return { kind: 'cancel' };
  const problem = validate?.(value);
  if (problem) return { kind: 'invalid', problem };
  return { kind: 'confirm', value };
}

/** 1-based template choice from the New File type picker, or null. */
export function templateChoice(raw: string, count: number): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const index = parseInt(trimmed, 10) - 1;
  return index >= 0 && index < count ? index : null;
}
