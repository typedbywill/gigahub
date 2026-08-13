import { useEffect, useRef, useState, type RefObject } from 'react';

export interface FitPageSizeOptions {
  /** Estimated height of one data row in px. */
  rowHeight?: number;
  /** Estimated height of the table header row in px. */
  headerHeight?: number;
  min?: number;
  max?: number;
  /** Ignore rapid resize churn (ms). */
  debounceMs?: number;
}

/**
 * Computes how many table body rows fit inside `containerRef`.
 * Debounced so content reflows / scrollbar changes do not thrash pageSize.
 */
export function useFitPageSize(
  containerRef: RefObject<HTMLElement | null>,
  options: FitPageSizeOptions = {},
): number {
  const rowHeight = options.rowHeight ?? 44;
  const headerHeight = options.headerHeight ?? 40;
  const min = options.min ?? 5;
  const max = options.max ?? 100;
  const debounceMs = options.debounceMs ?? 150;

  const [pageSize, setPageSize] = useState(0);
  const lastAppliedRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    let debounceTimer = 0;
    let raf = 0;

    const apply = (next: number) => {
      if (next === lastAppliedRef.current) {
        return;
      }
      lastAppliedRef.current = next;
      setPageSize(next);
    };

    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const available = el.clientHeight - headerHeight;
        if (available < rowHeight) {
          return;
        }
        const rows = Math.floor(available / rowHeight);
        const next = Math.min(max, Math.max(min, rows));
        window.clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(() => apply(next), debounceMs);
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(debounceTimer);
      observer.disconnect();
    };
  }, [containerRef, debounceMs, headerHeight, max, min, rowHeight]);

  return pageSize;
}
