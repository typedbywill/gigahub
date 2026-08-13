import React, { useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '../../hooks/use-media-query';
import { ToastItemView } from './ToastItem';
import { useToastStore } from './toast.store';
import type { ToastPosition } from './types';

const POSITION_CLASS: Record<ToastPosition, string> = {
  'top-start': 'top-0 left-0 items-start',
  top: 'top-0 inset-x-0 mx-auto items-center',
  'top-end': 'top-0 right-0 items-end',
  'bottom-start': 'bottom-0 left-0 items-start',
  bottom: 'bottom-0 inset-x-0 mx-auto items-center',
  'bottom-end': 'bottom-0 right-0 items-end',
};

const ALL_POSITIONS: ToastPosition[] = [
  'top-start',
  'top',
  'top-end',
  'bottom-start',
  'bottom',
  'bottom-end',
];

export const Toaster: React.FC = () => {
  const items = useToastStore((s) => s.items);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const resolvedDefault: ToastPosition = isMobile ? 'bottom' : 'bottom-end';

  const byPosition = useMemo(() => {
    const map = new Map<ToastPosition, typeof items>();
    for (const item of items) {
      const position = item.position ?? resolvedDefault;
      const list = map.get(position) ?? [];
      list.push(item);
      map.set(position, list);
    }
    return map;
  }, [items, resolvedDefault]);

  return (
    <>
      {ALL_POSITIONS.map((position) => {
        const group = byPosition.get(position);
        if (!group || group.length === 0) {
          return null;
        }
        const isTop = position.startsWith('top');
        return (
          <div
            key={position}
            className={`pointer-events-none fixed z-[100] flex w-full max-w-[min(100%,24rem)] flex-col gap-3 p-4 sm:w-auto sm:max-w-none ${POSITION_CLASS[position]}`}
            aria-live="polite"
            aria-relevant="additions"
          >
            <div
              className={`flex w-full flex-col gap-3 ${isTop ? 'flex-col-reverse' : 'flex-col'}`}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {group.map((item) => (
                  <ToastItemView
                    key={item.id}
                    item={item}
                    position={position}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </>
  );
};
