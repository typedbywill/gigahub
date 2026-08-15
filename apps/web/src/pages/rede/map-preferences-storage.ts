import {
  DEFAULT_MAP_LAYERS,
  parseMapSearchParams,
  type MapUrlState,
} from './map-search-params';
import {
  DEFAULT_MAP_BASE_STYLE,
  parseMapBaseStyleId,
  type MapBaseStyleId,
} from './map-styles';

export type MapPanelTab = 'buscar' | 'elementos' | 'mapa';

export type MapPreferences = {
  lat?: number;
  lng?: number;
  zoom?: number;
  layers: {
    fat: boolean;
    cables: boolean;
    ceo: boolean;
  };
  mapStyle: MapBaseStyleId;
  showFatLabels: boolean;
  panelCollapsed: boolean;
  activeTab: MapPanelTab;
};

export const DEFAULT_MAP_PREFERENCES: MapPreferences = {
  layers: { ...DEFAULT_MAP_LAYERS },
  mapStyle: DEFAULT_MAP_BASE_STYLE,
  showFatLabels: true,
  panelCollapsed: true,
  activeTab: 'buscar',
};

export const MAP_PREFERENCES_STORAGE_KEY = 'gigahub-rede-projeto';

const PANEL_TABS = new Set<MapPanelTab>(['buscar', 'elementos', 'mapa']);

function parseNumber(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  if (value < min || value > max) {
    return undefined;
  }
  return value;
}

function parseLayers(value: unknown): MapPreferences['layers'] {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_MAP_LAYERS };
  }
  const raw = value as Partial<MapPreferences['layers']>;
  return {
    fat: raw.fat !== false,
    cables: raw.cables !== false,
    ceo: raw.ceo !== false,
  };
}


function parseActiveTab(value: unknown): MapPanelTab {
  if (typeof value === 'string' && PANEL_TABS.has(value as MapPanelTab)) {
    return value as MapPanelTab;
  }
  // Legacy tabs from earlier UI versions
  if (value === 'aparencia' || value === 'configuracoes') {
    return 'mapa';
  }
  return DEFAULT_MAP_PREFERENCES.activeTab;
}

export function parseMapPreferences(raw: unknown): MapPreferences {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_MAP_PREFERENCES, layers: { ...DEFAULT_MAP_LAYERS } };
  }
  const data = raw as Partial<MapPreferences>;
  return {
    lat: parseNumber(data.lat, -90, 90),
    lng: parseNumber(data.lng, -180, 180),
    zoom: parseNumber(data.zoom, 0, 22),
    layers: parseLayers(data.layers),
    mapStyle: parseMapBaseStyleId(
      typeof data.mapStyle === 'string' ? data.mapStyle : null,
    ),
    showFatLabels: data.showFatLabels !== false,
    panelCollapsed: data.panelCollapsed === true,
    activeTab: parseActiveTab(data.activeTab),
  };
}

export function readMapPreferences(): MapPreferences {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_MAP_PREFERENCES, layers: { ...DEFAULT_MAP_LAYERS } };
  }
  try {
    const raw = window.localStorage.getItem(MAP_PREFERENCES_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_MAP_PREFERENCES, layers: { ...DEFAULT_MAP_LAYERS } };
    }
    return parseMapPreferences(JSON.parse(raw) as unknown);
  } catch {
    return { ...DEFAULT_MAP_PREFERENCES, layers: { ...DEFAULT_MAP_LAYERS } };
  }
}

export function writeMapPreferences(partial: Partial<MapPreferences>): void {
  if (typeof window === 'undefined') {
    return;
  }
  const current = readMapPreferences();
  const next: MapPreferences = {
    ...current,
    ...partial,
    layers: partial.layers
      ? {
          fat: partial.layers.fat,
          cables: partial.layers.cables,
          ceo: partial.layers.ceo,
        }
      : current.layers,
  };

  window.localStorage.setItem(
    MAP_PREFERENCES_STORAGE_KEY,
    JSON.stringify(next),
  );
}

export function preferencesFromUrlState(
  state: MapUrlState,
  activeTab?: MapPanelTab,
): MapPreferences {
  return {
    lat: state.lat,
    lng: state.lng,
    zoom: state.zoom,
    layers: { ...state.layers },
    mapStyle: state.mapStyle,
    showFatLabels: state.showFatLabels,
    panelCollapsed: state.panelCollapsed,
    activeTab: activeTab ?? readMapPreferences().activeTab,
  };
}

/**
 * Merge URL search params with stored preferences.
 * Explicit URL keys win; missing keys fall back to storage, then defaults.
 */
export function mergeUrlWithStorage(
  params: URLSearchParams,
  stored: MapPreferences = readMapPreferences(),
): { urlState: MapUrlState; activeTab: MapPanelTab } {
  const fromUrl = parseMapSearchParams(params);

  const hasCamera = params.has('lat') && params.has('lng');
  const hasZoom = params.has('z') || params.has('zoom');
  const hasLayers = params.has('layers');
  const hasPanel = params.has('panel');
  const hasStyle = params.has('style');
  const hasLabels = params.has('labels');

  const lat = hasCamera ? fromUrl.lat : (stored.lat ?? fromUrl.lat);
  const lng = hasCamera ? fromUrl.lng : (stored.lng ?? fromUrl.lng);
  const zoom = hasZoom ? fromUrl.zoom : (stored.zoom ?? fromUrl.zoom);

  return {
    urlState: {
      lat,
      lng,
      zoom,
      q: fromUrl.q,
      selected: fromUrl.selected,
      layers: hasLayers ? fromUrl.layers : { ...stored.layers },
      panelCollapsed: hasPanel ? fromUrl.panelCollapsed : stored.panelCollapsed,
      mapStyle: hasStyle ? fromUrl.mapStyle : stored.mapStyle,
      showFatLabels: hasLabels ? fromUrl.showFatLabels : stored.showFatLabels,
    },
    activeTab: stored.activeTab,
  };
}
