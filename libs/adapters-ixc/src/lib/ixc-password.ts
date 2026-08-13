import { createHash } from 'crypto';

/** IXC stores `usuarios.senha` as lowercase SHA-256 hex of the plaintext password. */
export function hashIxcPassword(plaintext: string): string {
  return createHash('sha256').update(plaintext, 'utf8').digest('hex');
}

export function formatIxcName(raw: string): string {
  const cleaned = raw
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-zA-ZÀ-ÿ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) {
    return raw.trim() || 'Colaborador';
  }
  return cleaned
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
