import type { GeoPoint } from '@gigahub/shared/kernel';

export interface NearbyFiberAccessTerminalReadModel {
  id: string;
  idErp: string;
  name: string;
  location: GeoPoint;
  distanceMeters: number;
  /** Map fill/stroke from IXC "Estilo da Caixa" (`codigo_estilo_caixa`). */
  mapColorHex: string;
}

export interface NearbyFiberCableReadModel {
  id: string;
  idErp: string;
  name: string;
  projectIdErp: string;
  lengthMeters?: number;
  path: ReadonlyArray<GeoPoint>;
  distanceMeters: number;
  /** Line color from `df_tipo_elemento.cor_ativa`. */
  strokeColorHex: string;
  strokeWidth: number;
  strokeDashed: boolean;
  cableTypeName?: string;
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
