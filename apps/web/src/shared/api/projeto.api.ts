import type {
  NearbyFiberAccessTerminalsResponseDto,
  NearbyFiberCablesResponseDto,
} from '@gigahub/shared/contracts';
import { apiFetch } from './http';

export interface NearbyProjectParams {
  lat: number;
  lng: number;
  radius?: number;
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
