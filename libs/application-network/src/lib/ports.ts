import type { GeoPoint } from '@gigahub/shared/kernel';

export interface NearbyFiberAccessTerminalReadModel {
  id: string;
  idErp: string;
  name: string;
  location: GeoPoint;
  distanceMeters: number;
}

export interface NearbyFiberCableReadModel {
  id: string;
  idErp: string;
  name: string;
  projectIdErp: string;
  lengthMeters?: number;
  path: ReadonlyArray<GeoPoint>;
  distanceMeters: number;
}

export interface FiberAccessTerminalNearbyQuery {
  findNearby(
    center: GeoPoint,
    radiusMeters: number,
  ): Promise<NearbyFiberAccessTerminalReadModel[]>;
}

export interface FiberCableNearbyQuery {
  findNearby(
    center: GeoPoint,
    radiusMeters: number,
  ): Promise<NearbyFiberCableReadModel[]>;
}

export class ApplicationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export const ApplicationErrorCodes = {
  InvalidNearbyQuery: 'INVALID_NEARBY_QUERY',
  Unauthorized: 'UNAUTHORIZED',
} as const;
