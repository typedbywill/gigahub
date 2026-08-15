/**
 * Retorna '#0f172a' (texto escuro) quando a cor de fundo for clara,
 * ou '#ffffff' (texto claro) quando a cor de fundo for escura/preta,
 * garantindo legibilidade e contraste visual ideais.
 */
export function getContrastTextColor(hexColor?: string | null): '#0f172a' | '#ffffff' {
  if (!hexColor) return '#ffffff';
  let hex = hexColor.trim();

  if (hex.startsWith('rgb')) {
    const match = hex.match(/\d+/g);
    if (match && match.length >= 3) {
      const r = Number(match[0]);
      const g = Number(match[1]);
      const b = Number(match[2]);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 135 ? '#0f172a' : '#ffffff';
    }
  }

  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (hex.length !== 6) return '#ffffff';

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return '#ffffff';
  }

  // Fórmula padrão YIQ para cálculo de contraste percebido pelo olho humano
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 135 ? '#0f172a' : '#ffffff';
}
