import type {
  NearbyFiberAccessTerminalsResponseDto,
  NearbyFiberCablesResponseDto,
  NearbyFiberSpliceEnclosuresResponseDto,
  SearchProjectNetworkResponseDto,
  CtoSplittingDiagramResponseDto,
} from '@gigahub/shared/contracts';
import { apiFetch } from './http';

export interface NearbyProjectParams {
  lat: number;
  lng: number;
  radius?: number;
}

export interface SearchProjectNetworkParams {
  q: string;
  kind?: 'all' | 'fat' | 'cable' | 'ceo';
  limit?: number;
}

export function listNearbyFatsRequest(
  accessToken: string,
  params: NearbyProjectParams,
  signal?: AbortSignal,
): Promise<NearbyFiberAccessTerminalsResponseDto> {
  return apiFetch<NearbyFiberAccessTerminalsResponseDto>('/api/v1/projeto/fat', {
    accessToken,
    signal,
    query: {
      lat: params.lat,
      lng: params.lng,
      radius: params.radius,
    },
  });
}

export function listNearbyCablesRequest(
  accessToken: string,
  params: NearbyProjectParams,
  signal?: AbortSignal,
): Promise<NearbyFiberCablesResponseDto> {
  return apiFetch<NearbyFiberCablesResponseDto>('/api/v1/projeto/cabos', {
    accessToken,
    signal,
    query: {
      lat: params.lat,
      lng: params.lng,
      radius: params.radius,
    },
  });
}

export function listNearbyCeosRequest(
  accessToken: string,
  params: NearbyProjectParams,
  signal?: AbortSignal,
): Promise<NearbyFiberSpliceEnclosuresResponseDto> {
  return apiFetch<NearbyFiberSpliceEnclosuresResponseDto>('/api/v1/projeto/ceo', {
    accessToken,
    signal,
    query: {
      lat: params.lat,
      lng: params.lng,
      radius: params.radius,
    },
  });
}


export function searchProjectNetworkRequest(
  accessToken: string,
  params: SearchProjectNetworkParams,
  signal?: AbortSignal,
): Promise<SearchProjectNetworkResponseDto> {
  return apiFetch<SearchProjectNetworkResponseDto>('/api/v1/projeto/busca', {
    accessToken,
    signal,
    query: {
      q: params.q,
      kind: params.kind,
      limit: params.limit,
    },
  });
}

export function getCtoSplittingDiagramRequest(
  accessToken: string,
  fatId: string,
  signal?: AbortSignal,
): Promise<CtoSplittingDiagramResponseDto> {
  return apiFetch<CtoSplittingDiagramResponseDto>(
    `/api/v1/projeto/fat/${encodeURIComponent(fatId)}/splitagem`,
    {
      accessToken,
      signal,
    },
  );
}

