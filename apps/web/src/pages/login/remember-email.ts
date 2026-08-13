const STORAGE_KEY = 'gigahub-remember-email';

export function readRememberedEmail(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const value = window.localStorage.getItem(STORAGE_KEY);
  if (!value?.trim()) {
    return null;
  }
  return value.trim();
}

export function writeRememberedEmail(email: string): void {
  window.localStorage.setItem(STORAGE_KEY, email.trim());
}

export function clearRememberedEmail(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
