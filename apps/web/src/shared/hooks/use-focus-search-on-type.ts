import { useEffect, type RefObject } from 'react';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }
  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [role="textbox"]',
    ),
  );
}

export interface FocusSearchOnTypeOptions {
  enabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * When the user types a printable character outside an editable field,
 * focuses `inputRef` and appends the character (list-page search shortcut).
 * `/` alone focuses without inserting.
 */
export function useFocusSearchOnType(
  inputRef: RefObject<HTMLInputElement | null>,
  options: FocusSearchOnTypeOptions = {},
): void {
  const { enabled = true, value = '', onChange } = options;

  useEffect(() => {
    if (!enabled || !onChange) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) {
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      if (isEditableTarget(event.target) || isEditableTarget(document.activeElement)) {
        return;
      }

      const input = inputRef.current;
      if (!input) {
        return;
      }

      if (event.key === '/') {
        event.preventDefault();
        input.focus();
        input.select();
        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      event.preventDefault();
      onChange(value + event.key);
      input.focus();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, inputRef, onChange, value]);
}
