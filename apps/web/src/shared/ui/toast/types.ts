import type { ReactNode } from 'react';

export type ToastVariant = 'success' | 'warning' | 'error' | 'info';

export type ToastPosition =
  | 'top-start'
  | 'top'
  | 'top-end'
  | 'bottom-start'
  | 'bottom'
  | 'bottom-end';

export type ToastOptions = {
  description?: string;
  variant?: ToastVariant;
  icon?: ReactNode;
  position?: ToastPosition;
  /** Auto-dismiss in ms. `0` keeps the toast until dismissed. */
  duration?: number;
  canDismiss?: boolean;
};

export type ToastInput = {
  title: string;
} & ToastOptions;

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  icon?: ReactNode;
  position?: ToastPosition;
  duration: number;
  canDismiss: boolean;
  createdAt: number;
};

export const TOAST_MAX_VISIBLE = 3;

export const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 6000,
};
