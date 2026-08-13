import { create } from 'zustand';
import {
  DEFAULT_DURATIONS,
  TOAST_MAX_VISIBLE,
  type ToastInput,
  type ToastItem,
  type ToastVariant,
} from './types';

let toastSeq = 0;

function nextId(): string {
  toastSeq += 1;
  return `toast-${toastSeq}-${Date.now()}`;
}

function resolveDuration(
  variant: ToastVariant,
  duration: number | undefined,
): number {
  if (duration !== undefined) {
    return duration;
  }
  return DEFAULT_DURATIONS[variant];
}

interface ToastState {
  items: ToastItem[];
  add: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  add: (input) => {
    const variant = input.variant ?? 'info';
    const id = nextId();
    const item: ToastItem = {
      id,
      title: input.title,
      description: input.description,
      variant,
      icon: input.icon,
      position: input.position,
      duration: resolveDuration(variant, input.duration),
      canDismiss: input.canDismiss ?? true,
      createdAt: Date.now(),
    };

    set((state) => {
      const next = [...state.items, item];
      if (next.length <= TOAST_MAX_VISIBLE) {
        return { items: next };
      }
      return { items: next.slice(next.length - TOAST_MAX_VISIBLE) };
    });

    return id;
  },
  dismiss: (id) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));
  },
  dismissAll: () => {
    set({ items: [] });
  },
}));

export function addToast(input: ToastInput): string {
  return useToastStore.getState().add(input);
}

export function dismissToast(id: string): void {
  useToastStore.getState().dismiss(id);
}

export function dismissAllToasts(): void {
  useToastStore.getState().dismissAll();
}
