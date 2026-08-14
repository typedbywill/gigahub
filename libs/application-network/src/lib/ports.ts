import type { GeoPoint } from '@gigahub/shared/kernel';
import type { ProjectNetworkSearchKind } from '@gigahub/domain/fiber-access-terminal';

export interface NearbyFiberAccessTerminalReadModel {
  id: string;
  idErp: string;
  name: string;
  location: GeoPoint;
  distanceMeters: number;
  /** Map fill/stroke from IXC "Estilo da Caixa" (`codigo_estilo_caixa`). */
  mapColorHex: string;
  portCount?: number;
  occupiedPortCount?: number;
  availablePortCount?: number;
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

export interface ProjectNetworkSearchHitReadModel {
  kind: 'fat' | 'cable';
  id: string;
  idErp: string;
  name: string;
  location: GeoPoint;
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

export interface ProjectNetworkSearchQuery {
  search(input: {
    q: string;
    kind: ProjectNetworkSearchKind;
    limit: number;
  }): Promise<ProjectNetworkSearchHitReadModel[]>;
}

export interface CtoDiagramPortReadModel {

  portNumber: number;
  label?: string;
  colorHex?: string;
}

export interface CtoDiagramNodeReadModel {
  id: string;
  elementId?: string;
  name: string;
  kind: 'cable_in' | 'cable_out' | 'splitter_balanced' | 'splitter_unbalanced' | 'splitter';
  portsIn: ReadonlyArray<CtoDiagramPortReadModel>;
  portsOut: ReadonlyArray<CtoDiagramPortReadModel>;
  ratio?: string;
}

export interface CtoDiagramConnectionReadModel {
  id: string;
  sourceNodeId: string;
  sourcePortNumber: number;
  targetNodeId: string;
  targetPortNumber: number;
  fiberColorHex: string;
  trayNumber?: number;
  isPassThrough?: boolean;
}


export interface CtoSplittingDiagramReadModel {
  fatId: string;
  fatName: string;
  nodes: ReadonlyArray<CtoDiagramNodeReadModel>;
  connections: ReadonlyArray<CtoDiagramConnectionReadModel>;
}

export interface CtoSplittingDiagramQuery {
  findByFatId(fatId: string): Promise<CtoSplittingDiagramReadModel | null>;
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
  InvalidSearchQuery: 'INVALID_SEARCH_QUERY',
  FatNotFound: 'FAT_NOT_FOUND',
  Unauthorized: 'UNAUTHORIZED',
} as const;

