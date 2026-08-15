import type {
  FiberSpliceEnclosureNearbyQuery,
  NearbyFiberSpliceEnclosureReadModel,
} from '@gigahub/application-network';
import {
  type GeoPoint,
  distanceMeters,
  isWithinRadius,
} from '@gigahub/shared/kernel';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { parseIxcCoordinate } from './ixc-geo';
import { mapColorFromCeoEstilo } from './ixc-map-colors';

export const IXC_FIBER_SPLICE_ENCLOSURE_ELEMENT_TIPO = 'CA';

interface CeoRow extends RowDataPacket {
  id: number;
  descricao: string;
  id_projeto: number | null;
  codigo_estilo_caixa: string | null;
  nome_tipo: string | null;
  cor_ativa: string | null;
  total_bandejas: number | null;
  latitude: string | null;
  longitude: string | null;
}

export class MysqlFiberSpliceEnclosureNearbyQuery
  implements FiberSpliceEnclosureNearbyQuery
{
  constructor(private readonly pool: Pool) {}

  async findNearby(
    center: GeoPoint,
    radiusMeters: number,
  ): Promise<NearbyFiberSpliceEnclosureReadModel[]> {
    const [rows] = await this.pool.query<CeoRow[]>(
      `SELECT e.id,
              e.descricao,
              e.id_projeto,
              e.codigo_estilo_caixa,
              t.nome_tipo,
              t.cor_ativa,
              t.total_bandejas,
              c.latitude,
              c.longitude
       FROM df_elemento e
       LEFT JOIN df_tipo_elemento t ON t.id = e.id_tipo_elemento
       INNER JOIN df_elemento_coordenada ec ON ec.id_elemento = e.id
       INNER JOIN df_coordenada c ON c.id = ec.id_coordenada
       WHERE e.tipo = ?
         AND e.ativo = 'S'
         AND c.latitude IS NOT NULL
         AND c.longitude IS NOT NULL
         AND c.latitude <> ''
         AND c.longitude <> ''`,
      [IXC_FIBER_SPLICE_ENCLOSURE_ELEMENT_TIPO],
    );

    const items: NearbyFiberSpliceEnclosureReadModel[] = [];
    const seenIds = new Set<number>();

    for (const row of rows) {
      if (seenIds.has(row.id)) {
        continue;
      }
      const location = parseIxcCoordinate(row.latitude, row.longitude);
      if (!location || !isWithinRadius(center, location, radiusMeters)) {
        continue;
      }
      seenIds.add(row.id);
      const idErp = String(row.id);
      const name = (row.descricao ?? '').trim() || `CEO ${idErp}`;
      const traysCount =
        row.total_bandejas != null && Number.isFinite(Number(row.total_bandejas))
          ? Number(row.total_bandejas)
          : 1;

      items.push({
        id: idErp,
        idErp,
        name,
        projectIdErp:
          row.id_projeto != null ? String(row.id_projeto) : undefined,
        location,
        distanceMeters: distanceMeters(center, location),
        mapColorHex: mapColorFromCeoEstilo(
          row.codigo_estilo_caixa,
          row.nome_tipo,
          row.cor_ativa,
        ),
        traysCount,
      });
    }

    return items;
  }
}
