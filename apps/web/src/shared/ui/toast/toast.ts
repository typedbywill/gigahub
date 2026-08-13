import {
  addToast,
  dismissAllToasts,
  dismissToast,
} from './toast.store';
import type { ToastInput, ToastOptions } from './types';

function show(title: string, options?: ToastOptions): string {
  return addToast({ title, ...options });
}

function showVariant(
  variant: NonNullable<ToastOptions['variant']>,
  title: string,
  options?: Omit<ToastOptions, 'variant'>,
): string {
  return addToast({ title, variant, ...options });
}

export const toast = Object.assign(
  (input: string | ToastInput, options?: ToastOptions) => {
    if (typeof input === 'string') {
      return show(input, options);
    }
    return addToast(input);
  },
  {
    success: (title: string, options?: Omit<ToastOptions, 'variant'>) =>
      showVariant('success', title, options),
    error: (title: string, options?: Omit<ToastOptions, 'variant'>) =>
      showVariant('error', title, options),
    warning: (title: string, options?: Omit<ToastOptions, 'variant'>) =>
      showVariant('warning', title, options),
    info: (title: string, options?: Omit<ToastOptions, 'variant'>) =>
      showVariant('info', title, options),
    dismiss: dismissToast,
    dismissAll: dismissAllToasts,
  },
);
