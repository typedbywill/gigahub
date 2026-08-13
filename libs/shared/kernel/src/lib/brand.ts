export type Brand<T, B extends string> = T & { readonly __brand: B };

export function assertNonEmpty(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} cannot be empty`);
  }
  return trimmed;
}
