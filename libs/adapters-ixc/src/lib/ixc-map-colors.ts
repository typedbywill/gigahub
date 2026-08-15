/**
 * IXC Fiberdocs map colors for CTOs (`rad_caixa_ftth.codigo_estilo_caixa`)
 * and cable types (`df_tipo_elemento.cor_ativa`).
 *
 * CTO style codes equal `df_tipo_elemento.codigo_identificador` for
 * "Caixa de Atendimento …" types (preta, azul, verde, …).
 */

const DEFAULT_CAIXA_COLOR = '#000000';
const DEFAULT_CABLE_COLOR = '#0284c7';
const DEFAULT_CABLE_WIDTH = 3;

/** Known Fiberdocs "Estilo da Caixa" codes → hex (from tipo nome / icon). */
const CAIXA_ESTILO_HEX: Readonly<Record<string, string>> = {
  '50r7nh0u': '#000000', // Preta (default)
  '7eTTWpDR': '#1565C0', // Azul
  '1Pr4jX4X': '#2E7D32', // Verde
  '8PbLzK3P': '#F9A825', // Amarela
  '9S83YSCh': '#F5F5F5', // Branca
  '5T4gmUHG': '#C62828', // Vermelha
  '752EWQuj': '#EF6C00', // Laranja
  '3HHYsgRp': '#757575', // Cinza
  AhsuSS1u: '#29B6F6', // Azul Claro
  AssUd3h7: '#6D4C41', // Marrom
  a8sFy8ff: '#EC407A', // Rosa
  ASydas32: '#8E24AA', // Roxa
  LIgAKPfY: '#0D47A1', // Azul Escuro
  YveVV4Ka: '#BA68C8', // Lilás
  H63QbvyX: '#C0FF00', // Limão
  w5bHIgOc: '#1B5E20', // Verde Escuro
};

/** Longer / more specific names first. */
const NOME_TIPO_COLOR_RULES: ReadonlyArray<{ match: RegExp; hex: string }> = [
  { match: /azul\s*claro/i, hex: '#29B6F6' },
  { match: /azul\s*escuro/i, hex: '#0D47A1' },
  { match: /verde\s*escuro/i, hex: '#1B5E20' },
  { match: /verde\s*lim[aã]o|lim[aã]o/i, hex: '#C0FF00' },
  { match: /lil[aá]s/i, hex: '#BA68C8' },
  { match: /amarel/i, hex: '#F9A825' },
  { match: /vermelh/i, hex: '#C62828' },
  { match: /laranja/i, hex: '#EF6C00' },
  { match: /branc/i, hex: '#F5F5F5' },
  { match: /cinza/i, hex: '#757575' },
  { match: /marr?om/i, hex: '#6D4C41' },
  { match: /rosa/i, hex: '#EC407A' },
  { match: /rox/i, hex: '#8E24AA' },
  { match: /azul/i, hex: '#1565C0' },
  { match: /verde/i, hex: '#2E7D32' },
  { match: /pret/i, hex: '#000000' },
];

export function normalizeIxcHex(
  raw: string | null | undefined,
  fallback: string,
): string {
  if (raw == null) {
    return fallback;
  }
  const trimmed = String(raw).trim();
  if (!trimmed) {
    return fallback;
  }
  const withoutHash = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  if (/^[0-9a-fA-F]{6}$/.test(withoutHash)) {
    return `#${withoutHash.toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{3}$/.test(withoutHash)) {
    const [r, g, b] = withoutHash.toLowerCase().split('');
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  // rgba(...) or other — keep only if already a #hex we accept above
  return fallback;
}

export function mapColorFromCaixaEstilo(
  codigoEstilo: string | null | undefined,
  nomeTipo?: string | null,
): string {
  const code = (codigoEstilo ?? '').trim();
  if (code && CAIXA_ESTILO_HEX[code]) {
    return CAIXA_ESTILO_HEX[code];
  }
  const nome = (nomeTipo ?? '').trim();
  if (nome) {
    for (const rule of NOME_TIPO_COLOR_RULES) {
      if (rule.match.test(nome)) {
        return rule.hex;
      }
    }
  }
  return DEFAULT_CAIXA_COLOR;
}

export const DEFAULT_CEO_COLOR = '#8b5cf6';

export function mapColorFromCeoEstilo(
  codigoEstilo: string | null | undefined,
  nomeTipo?: string | null,
  corAtiva?: string | null,
): string {
  if (corAtiva) {
    const normalized = normalizeIxcHex(corAtiva, '');
    if (normalized) {
      return normalized;
    }
  }
  const code = (codigoEstilo ?? '').trim();
  if (code && CAIXA_ESTILO_HEX[code]) {
    return CAIXA_ESTILO_HEX[code];
  }
  const nome = (nomeTipo ?? '').trim();
  if (nome) {
    for (const rule of NOME_TIPO_COLOR_RULES) {
      if (rule.match.test(nome)) {
        return rule.hex;
      }
    }
  }
  return DEFAULT_CEO_COLOR;
}

export function mapCableStrokeFromTipo(input: {
  corAtiva?: string | null;
  especuraLinha?: number | null;
  pontilhada?: string | null;
}): {
  strokeColorHex: string;
  strokeWidth: number;
  strokeDashed: boolean;
} {
  const width =
    input.especuraLinha != null &&
    Number.isFinite(Number(input.especuraLinha)) &&
    Number(input.especuraLinha) > 0
      ? Number(input.especuraLinha)
      : DEFAULT_CABLE_WIDTH;
  return {
    strokeColorHex: normalizeIxcHex(input.corAtiva, DEFAULT_CABLE_COLOR),
    strokeWidth: width,
    strokeDashed: String(input.pontilhada ?? 'N').toUpperCase() === 'S',
  };
}

