export type MapBaseStyleId =
  | 'auto'
  | 'streets'
  | 'satellite'
  | 'outdoors'
  | 'light'
  | 'dark'
  | 'navigation-day'
  | 'navigation-night';

export type MapBaseStyleOption = {
  id: MapBaseStyleId;
  label: string;
  category: string;
  description: string;
  /** Mapbox style URL; null means follow app theme. */
  styleUrl: string | null;
  darkChrome: boolean;
};

export const MAP_BASE_STYLES: readonly MapBaseStyleOption[] = [
  {
    id: 'auto',
    label: 'Automático',
    category: 'Dinâmico',
    description: 'Acompanha o tema claro/escuro do aplicativo',
    styleUrl: null,
    darkChrome: false,
  },
  {
    id: 'streets',
    label: 'Ruas',
    category: 'Vetor',
    description: 'Mapa vetorial completo com logradouros e bairros',
    styleUrl: 'mapbox://styles/mapbox/streets-v12',
    darkChrome: false,
  },
  {
    id: 'satellite',
    label: 'Satélite',
    category: 'Híbrido',
    description: 'Imagem aérea de alta resolução sobreposta com vias',
    styleUrl: 'mapbox://styles/mapbox/satellite-streets-v12',
    darkChrome: true,
  },
  {
    id: 'outdoors',
    label: 'Relevo',
    category: 'Terreno',
    description: 'Curvas de nível, topografia e áreas verdes',
    styleUrl: 'mapbox://styles/mapbox/outdoors-v12',
    darkChrome: false,
  },
  {
    id: 'light',
    label: 'Flat (Claro)',
    category: 'Minimal',
    description: 'Base neutra clara ideal para focar na infraestrutura',
    styleUrl: 'mapbox://styles/mapbox/light-v11',
    darkChrome: false,
  },
  {
    id: 'dark',
    label: 'Escuro',
    category: 'Noturno',
    description: 'Base escura de alto contraste para destaque das fibras',
    styleUrl: 'mapbox://styles/mapbox/dark-v11',
    darkChrome: true,
  },
  {
    id: 'navigation-day',
    label: 'Navegação Claro',
    category: 'Tráfego',
    description: 'Foco em malha viária e rotas urbanas de dia',
    styleUrl: 'mapbox://styles/mapbox/navigation-day-v1',
    darkChrome: false,
  },
  {
    id: 'navigation-night',
    label: 'Navegação Escuro',
    category: 'Tráfego',
    description: 'Malha viária e vias expressas em contraste noturno',
    styleUrl: 'mapbox://styles/mapbox/navigation-night-v1',
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
