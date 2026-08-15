import { routes } from '../../shared/routes';
import {
  DEFAULT_MAP_BASE_STYLE,
  parseMapBaseStyleId,
  type MapBaseStyleId,
} from './map-styles';

export type MapSelectedRef = {
  kind: 'fat' | 'cable' | 'customer' | 'ceo';
  id: string;
};

export type MapUrlState = {
  lat?: number;
  lng?: number;
  zoom?: number;
  q: string;
  selected: MapSelectedRef | null;
  layers: {
    fat: boolean;
    cables: boolean;
    ceo: boolean;
  };
  panelCollapsed: boolean;
  mapStyle: MapBaseStyleId;
  showFatLabels: boolean;
};

export const DEFAULT_MAP_LAYERS = {
  fat: true,
  cables: true,
  ceo: true,
} as const;

function parseNumber(
  value: string | null,
  min: number,
  max: number,
): number | undefined {
  if (value == null || value.trim() === '') {
    return undefined;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) {
    return undefined;
  }
  return n;
}

function parseSelected(value: string | null): MapSelectedRef | null {
  if (!value) {
    return null;
  }
  const sep = value.indexOf(':');
  if (sep <= 0) {
    return null;
  }
  const kind = value.slice(0, sep);
  const id = value.slice(sep + 1).trim();
  if (
    (kind !== 'fat' &&
      kind !== 'cable' &&
      kind !== 'customer' &&
      kind !== 'ceo') ||
    !id
  ) {
    return null;
  }
  return { kind, id };
}

function parseLayers(value: string | null): MapUrlState['layers'] {
  if (value == null) {
    return { ...DEFAULT_MAP_LAYERS };
  }
  const parts = value
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  return {
    fat: parts.includes('fat') || parts.includes('cto'),
    cables: parts.includes('cables') || parts.includes('cabos'),
    ceo: parts.includes('ceo') || parts.includes('ceos'),
  };
}

export function parseMapSearchParams(params: URLSearchParams): MapUrlState {
  let selected = parseSelected(params.get('sel'));
  if (!selected) {
    const fatId = params.get('fatId');
    const cableId = params.get('cableId');
    const ceoId = params.get('ceoId');
    if (fatId) {
      selected = { kind: 'fat', id: fatId };
    } else if (cableId) {
      selected = { kind: 'cable', id: cableId };
    } else if (ceoId) {
      selected = { kind: 'ceo', id: ceoId };
    }
  }

  return {
    lat: parseNumber(params.get('lat'), -90, 90),
    lng: parseNumber(params.get('lng'), -180, 180),
    zoom: parseNumber(params.get('z') ?? params.get('zoom'), 0, 22),
    q: params.get('q')?.trim() ?? '',
    selected,
    layers: parseLayers(params.get('layers')),
    panelCollapsed: params.get('panel') === 'collapsed',
    mapStyle: parseMapBaseStyleId(params.get('style')),
    showFatLabels: params.get('labels') !== '0',
  };
}

export function toMapSearchParams(state: MapUrlState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.lat != null && state.lng != null) {
    params.set('lat', state.lat.toFixed(6));
    params.set('lng', state.lng.toFixed(6));
  }
  if (state.zoom != null) {
    params.set('z', String(Math.round(state.zoom * 100) / 100));
  }
  if (state.q) {
    params.set('q', state.q);
  }
  if (state.selected) {
    params.set('sel', `${state.selected.kind}:${state.selected.id}`);
  }

  const layerParts: string[] = [];
  if (state.layers.fat) {
    layerParts.push('fat');
  }
  if (state.layers.cables) {
    layerParts.push('cables');
  }
  if (state.layers.ceo) {
    layerParts.push('ceo');
  }
  if (
    state.layers.fat !== DEFAULT_MAP_LAYERS.fat ||
    state.layers.cables !== DEFAULT_MAP_LAYERS.cables ||
    state.layers.ceo !== DEFAULT_MAP_LAYERS.ceo
  ) {
    params.set('layers', layerParts.join(','));
  }


  if (state.panelCollapsed) {
    params.set('panel', 'collapsed');
  }

  if (state.mapStyle !== DEFAULT_MAP_BASE_STYLE) {
    params.set('style', state.mapStyle);
  }

  if (!state.showFatLabels) {
    params.set('labels', '0');
  }

  return params;
}

export function mapHref(state: MapUrlState): string {
  const query = toMapSearchParams(state).toString();
  return query ? `${routes.redeProjeto}?${query}` : routes.redeProjeto;
}

export function mapUrlStatesEqual(a: MapUrlState, b: MapUrlState): boolean {
  return toMapSearchParams(a).toString() === toMapSearchParams(b).toString();
}
