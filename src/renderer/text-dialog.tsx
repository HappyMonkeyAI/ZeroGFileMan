import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { resolveTextDialog, type TextDialogRequest } from '../shared/text-dialog.js';

export type AskText = (request: TextDialogRequest) => Promise<string | null>;

/**
 * In-app replacement for window.prompt, which Electron does not implement.
 * Resolves the trimmed value on Enter/OK, null on Esc/Cancel/empty input.
 */
export function useTextDialog(): { askText: AskText; dialog: ReactNode } {
  const [request, setRequest] = useState<TextDialogRequest | null>(null);
  const [value, setValue] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const resolverRef = useRef<((value: string | null) => void) | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const settle = useCallback((result: string | null) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setRequest(null);
    setProblem(null);
    resolve?.(result);
  }, []);

  const askText = useCallback<AskText>(
    (next) =>
      new Promise<string | null>((resolve) => {
        resolverRef.current?.(null);
        resolverRef.current = resolve;
        setValue(next.defaultValue ?? '');
        setProblem(null);
        setRequest(next);
      }),
    []
  );

  useEffect(() => {
    if (!request) return;
    const input = inputRef.current;
    if (input) {
      input.focus();
      input.select();
    }
  }, [request]);

  const confirm = useCallback(() => {
    if (!request) return;
    const outcome = resolveTextDialog(value, request.validate);
    if (outcome.kind === 'invalid') {
      setProblem(outcome.problem);
      inputRef.current?.focus();
      return;
    }
    settle(outcome.kind === 'confirm' ? outcome.value : null);
  }, [request, settle, value]);

  const dialog = request ? (
    <div
      className="text-dialog-layer"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) settle(null);
      }}
    >
      <div
        ref={cardRef}
        className="text-dialog-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="text-dialog-title"
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            event.preventDefault();
            settle(null);
            return;
          }
          if (event.key === 'Tab') {
            const focusables = cardRef.current?.querySelectorAll<HTMLElement>('input, button');
            if (!focusables?.length) return;
            const first = focusables[0]!;
            const last = focusables[focusables.length - 1]!;
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <h2 id="text-dialog-title">{request.title}</h2>
        {request.message ? <p className="text-dialog-message">{request.message}</p> : null}
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (problem) setProblem(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              confirm();
            }
          }}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          aria-label={request.title}
          aria-invalid={problem ? true : undefined}
        />
        {problem ? (
          <span className="text-dialog-error" role="alert">
            {problem}
          </span>
        ) : null}
        <div className="text-dialog-actions">
          <button type="button" onClick={() => settle(null)}>
            Cancel
          </button>
          <button type="button" className="primary" onClick={confirm}>
            {request.confirmLabel ?? 'OK'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { askText, dialog };
}
