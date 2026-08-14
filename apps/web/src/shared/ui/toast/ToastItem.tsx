import React, { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  LuCircleCheck,
  LuCircleX,
  LuInfo,
  LuTriangleAlert,
  LuX,
} from 'react-icons/lu';
import { useToastStore } from './toast.store';
import type { ToastItem, ToastPosition, ToastVariant } from './types';

const VARIANT_ICON: Record<ToastVariant, React.ReactNode> = {
  success: <LuCircleCheck className="size-5" aria-hidden />,
  warning: <LuTriangleAlert className="size-5" aria-hidden />,
  error: <LuCircleX className="size-5" aria-hidden />,
  info: <LuInfo className="size-5" aria-hidden />,
};

const VARIANT_ICON_CLASS: Record<ToastVariant, string> = {
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-danger',
  info: 'text-sky-500 dark:text-sky-400',
};

function isTopPosition(position: ToastPosition): boolean {
  return position.startsWith('top');
}

type ToastItemProps = {
  item: ToastItem;
  position: ToastPosition;
};

export const ToastItemView: React.FC<ToastItemProps> = ({ item, position }) => {
  const dismiss = useToastStore((s) => s.dismiss);
  const reduceMotion = useReducedMotion();
  const fromTop = isTopPosition(position);
  const slide = fromTop ? -12 : 12;

  useEffect(() => {
    if (item.duration <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      dismiss(item.id);
    }, item.duration);
    return () => window.clearTimeout(timer);
  }, [dismiss, item.duration, item.id]);

  const role = item.variant === 'error' || item.variant === 'warning'
    ? 'alert'
    : 'status';

  return (
    <motion.div
      layout={!reduceMotion}
      initial={
        reduceMotion
          ? { opacity: 0 }
          : { opacity: 0, y: slide, scale: 0.96 }
      }
      animate={
        reduceMotion
          ? { opacity: 1 }
          : { opacity: 1, y: 0, scale: 1 }
      }
      exit={
        reduceMotion
          ? { opacity: 0 }
          : { opacity: 0, y: slide, scale: 0.96 }
      }
      transition={
        reduceMotion
          ? { duration: 0.15 }
          : { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }
      }
      role={role}
      className="pointer-events-auto flex w-full max-w-88 items-start gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-lg sm:w-88"
    >
      <span
        className={`mt-0.5 shrink-0 ${VARIANT_ICON_CLASS[item.variant]}`}
      >
        {item.icon ?? VARIANT_ICON[item.variant]}
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-medium text-foreground">{item.title}</p>
        {item.description ? (
          <p className="mt-0.5 text-sm text-muted">{item.description}</p>
        ) : null}
      </div>

      {item.canDismiss ? (
        <button
          type="button"
          aria-label="Fechar"
          onClick={() => dismiss(item.id)}
          className="shrink-0 rounded-lg p-1 text-muted transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <LuX className="size-4" aria-hidden />
        </button>
      ) : null}
    </motion.div>
  );
};
