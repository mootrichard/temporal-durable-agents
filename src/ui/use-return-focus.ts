import { useEffect, useRef, type RefObject } from 'react';

/** Returns focus to `launcher` when an overlay it opened closes; optionally focuses `target` on open. */
export function useReturnFocus(
  open: boolean,
  launcher: RefObject<HTMLElement | null>,
  target?: RefObject<HTMLElement | null>,
): void {
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      if (!target) return;
      const frame = window.requestAnimationFrame(() => target.current?.focus());
      return () => window.cancelAnimationFrame(frame);
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      launcher.current?.focus();
    }
  }, [open]);
}
