import type {
  FiberCableNearbyQuery,
  NearbyFiberCableReadModel,
} from '@gigahub/application-network';
import type { GeoPoint } from '@gigahub/shared/kernel';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import {
  boundingBoxDegrees,
  minDistanceToPath,
  parseIxcCoordinate,
} from './ixc-geo';
import { mapCableStrokeFromTipo } from './ixc-map-colors';

/**
 * IXC Soft stores fiber cables as `df_elemento.tipo = 'CB'`.
 * Keep this filter in the adapter so a Mongo adapter can use another taxonomy.
 */
export const IXC_FIBER_CABLE_ELEMENT_TIPO = 'CB';

interface CoordRow extends RowDataPacket {
  id: number;
  latitude: string;
  longitude: string;
}

interface LinkRow extends RowDataPacket {
  id_elemento: number;
  id_coordenada: number;
  sequencia: number;
}

interface ElementRow extends RowDataPacket {
  id: number;
  descricao: string;
  id_projeto: number;
  comprimento: number | null;
  ativo: string;
  cor_ativa: string | null;
  especura_linha: number | null;
  pontilhada: string | null;
  nome_tipo: string | null;
}

export class MysqlFiberCableNearbyQuery implements FiberCableNearbyQuery {
  constructor(private readonly pool: Pool) {}

  async findNearby(
    center: GeoPoint,
    radiusMeters: number,
  ): Promise<NearbyFiberCableReadModel[]> {
    const delta = boundingBoxDegrees(radiusMeters);
    const [coordRows] = await this.pool.query<CoordRow[]>(
      `SELECT id, latitude, longitude
       FROM df_coordenada
       WHERE latitude IS NOT NULL
         AND longitude IS NOT NULL
         AND latitude <> ''
         AND longitude <> ''`,
    );

    const nearbyCoordIds: number[] = [];
    const coordById = new Map<number, GeoPoint>();
    for (const row of coordRows) {
      const point = parseIxcCoordinate(row.latitude, row.longitude);
      if (!point) {
        continue;
      }
      // Cheap bbox first, exact radius via path distance later.
      if (
        Math.abs(point.latitude - center.latitude) > delta ||
        Math.abs(point.longitude - center.longitude) > delta
      ) {
        continue;
      }
      coordById.set(row.id, point);
      nearbyCoordIds.push(row.id);
    }

    if (nearbyCoordIds.length === 0) {
      return [];
    }

    const [links] = await this.pool.query<LinkRow[]>(
      `SELECT id_elemento, id_coordenada, sequencia
       FROM df_elemento_coordenada
       WHERE id_coordenada IN (?)`,
      [nearbyCoordIds],
    );

    const candidateElementIds = [
      ...new Set(links.map((link) => link.id_elemento)),
    ];
    if (candidateElementIds.length === 0) {
      return [];
    }

    const [elements] = await this.pool.query<ElementRow[]>(
      `SELECT e.id,
              e.descricao,
              e.id_projeto,
              e.comprimento,
              e.ativo,
              t.cor_ativa,
              t.especura_linha,
              t.pontilhada,
              t.nome_tipo
       FROM df_elemento e
       LEFT JOIN df_tipo_elemento t ON t.id = e.id_tipo_elemento
       WHERE e.id IN (?)
         AND e.tipo = ?
         AND e.ativo = 'S'`,
      [candidateElementIds, IXC_FIBER_CABLE_ELEMENT_TIPO],
    );

    if (elements.length === 0) {
      return [];
    }

    const cableIds = elements.map((element) => element.id);
    const [pathLinks] = await this.pool.query<LinkRow[]>(
      `SELECT id_elemento, id_coordenada, sequencia
       FROM df_elemento_coordenada
       WHERE id_elemento IN (?)
       ORDER BY id_elemento ASC, sequencia ASC`,
      [cableIds],
    );

    const missingCoordIds = [
      ...new Set(
        pathLinks
          .map((link) => link.id_coordenada)
          .filter((id) => !coordById.has(id)),
      ),
    ];
    if (missingCoordIds.length > 0) {
      const [extraCoords] = await this.pool.query<CoordRow[]>(
        `SELECT id, latitude, longitude
         FROM df_coordenada
         WHERE id IN (?)`,
        [missingCoordIds],
      );
      for (const row of extraCoords) {
        const point = parseIxcCoordinate(row.latitude, row.longitude);
        if (point) {
          coordById.set(row.id, point);
        }
      }
    }

    const pathByElement = new Map<number, GeoPoint[]>();
    for (const link of pathLinks) {
      const point = coordById.get(link.id_coordenada);
      if (!point) {
        continue;
      }
      const path = pathByElement.get(link.id_elemento) ?? [];
      path.push(point);
      pathByElement.set(link.id_elemento, path);
    }

    const items: NearbyFiberCableReadModel[] = [];
    for (const element of elements) {
      const path = pathByElement.get(element.id) ?? [];
      if (path.length < 2) {
        continue;
      }
      const distance = minDistanceToPath(center, path);
      if (distance > radiusMeters) {
        continue;
      }
      const idErp = String(element.id);
      const stroke = mapCableStrokeFromTipo({
        corAtiva: element.cor_ativa,
        especuraLinha: element.especura_linha,
        pontilhada: element.pontilhada,
      });
      const typeName = (element.nome_tipo ?? '').trim();
      items.push({
        id: idErp,
        idErp,
        name: (element.descricao ?? '').trim() || `Cable ${idErp}`,
        projectIdErp: String(element.id_projeto),
        lengthMeters:
          element.comprimento == null ||
          !Number.isFinite(Number(element.comprimento))
            ? undefined
            : Number(element.comprimento),
        path,
        distanceMeters: distance,
        strokeColorHex: stroke.strokeColorHex,
        strokeWidth: stroke.strokeWidth,
        strokeDashed: stroke.strokeDashed,
        cableTypeName: typeName || undefined,
      });
    }
    return items;
  }
}
