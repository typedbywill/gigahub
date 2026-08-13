import { useEffect, useState, type RefObject } from 'react';

export interface FitPageSizeOptions {
  /** Estimated height of one data row in px. */
  rowHeight?: number;
  /** Estimated height of the table header row in px. */
  headerHeight?: number;
  min?: number;
  max?: number;
}

/**
 * Computes how many table body rows fit inside `containerRef` (the scroll/body
 * viewport). Recomputes on resize.
 */
export function useFitPageSize(
  containerRef: RefObject<HTMLElement | null>,
  options: FitPageSizeOptions = {},
): number {
  const rowHeight = options.rowHeight ?? 44;
  const headerHeight = options.headerHeight ?? 40;
  const min = options.min ?? 5;
  const max = options.max ?? 100;

  const [pageSize, setPageSize] = useState(min);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    let frame = 0;

    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const available = el.clientHeight - headerHeight;
        const rows = Math.floor(available / rowHeight);
        const next = Math.min(max, Math.max(min, rows));
        setPageSize((prev) => (prev === next ? prev : next));
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [containerRef, headerHeight, max, min, rowHeight]);

  return pageSize;
}
