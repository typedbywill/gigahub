export type MapBaseStyleId =
  | 'auto'
  | 'streets'
  | 'satellite'
  | 'light'
  | 'dark';

export type MapBaseStyleOption = {
  id: MapBaseStyleId;
  label: string;
  description: string;
  /** Mapbox style URL; null means follow app theme. */
  styleUrl: string | null;
  darkChrome: boolean;
};

export const MAP_BASE_STYLES: readonly MapBaseStyleOption[] = [
  {
    id: 'auto',
    label: 'Automático',
    description: 'Segue o tema claro/escuro do app',
    styleUrl: null,
    darkChrome: false,
  },
  {
    id: 'streets',
    label: 'Ruas',
    description: 'Mapa padrão com ruas e bairros',
    styleUrl: 'mapbox://styles/mapbox/streets-v12',
    darkChrome: false,
  },
  {
    id: 'satellite',
    label: 'Satélite',
    description: 'Imagem de satélite com ruas',
    styleUrl: 'mapbox://styles/mapbox/satellite-streets-v12',
    darkChrome: true,
  },
  {
    id: 'light',
    label: 'Flat',
    description: 'Base clara e minimalista',
    styleUrl: 'mapbox://styles/mapbox/light-v11',
    darkChrome: false,
  },
  {
    id: 'dark',
    label: 'Escuro',
    description: 'Base escura para contraste',
    styleUrl: 'mapbox://styles/mapbox/dark-v11',
    darkChrome: true,
  },
] as const;

export const DEFAULT_MAP_BASE_STYLE: MapBaseStyleId = 'auto';

const STYLE_BY_ID = new Map(
  MAP_BASE_STYLES.map((style) => [style.id, style] as const),
);

export function parseMapBaseStyleId(
  value: string | null | undefined,
): MapBaseStyleId {
  if (!value) {
    return DEFAULT_MAP_BASE_STYLE;
  }
  const id = value.trim().toLowerCase();
  if (STYLE_BY_ID.has(id as MapBaseStyleId)) {
    return id as MapBaseStyleId;
  }
  return DEFAULT_MAP_BASE_STYLE;
}

export function resolveMapStyleUrl(
  styleId: MapBaseStyleId,
  isAppDark: boolean,
): string {
  const option = STYLE_BY_ID.get(styleId) ?? STYLE_BY_ID.get('auto')!;
  if (option.styleUrl) {
    return option.styleUrl;
  }
  return isAppDark
    ? 'mapbox://styles/mapbox/dark-v11'
    : 'mapbox://styles/mapbox/streets-v12';
}

export function mapStyleUsesDarkChrome(
  styleId: MapBaseStyleId,
  isAppDark: boolean,
): boolean {
  const option = STYLE_BY_ID.get(styleId) ?? STYLE_BY_ID.get('auto')!;
  if (option.id === 'auto') {
    return isAppDark;
  }
  return option.darkChrome;
}
