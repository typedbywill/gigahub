import type {
  FiberAccessTerminalNearbyQuery,
  NearbyFiberAccessTerminalReadModel,
} from '@gigahub/application-network';
import {
  type GeoPoint,
  distanceMeters,
  isWithinRadius,
} from '@gigahub/shared/kernel';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { parseIxcCoordinate } from './ixc-geo';
import { mapColorFromCaixaEstilo } from './ixc-map-colors';

interface FatRow extends RowDataPacket {
  id: number;
  descricao: string;
  latitude: string | null;
  longitude: string | null;
  codigo_estilo_caixa: string | null;
  estilo_nome_tipo: string | null;
  capacidade: number | null;
  ocupacao: number | null;
}

export class MysqlFiberAccessTerminalNearbyQuery
  implements FiberAccessTerminalNearbyQuery
{
  constructor(private readonly pool: Pool) {}

  async findNearby(
    center: GeoPoint,
    radiusMeters: number,
  ): Promise<NearbyFiberAccessTerminalReadModel[]> {
    const [rows] = await this.pool.query<FatRow[]>(
      `SELECT c.id,
              c.descricao,
              c.latitude,
              c.longitude,
              c.codigo_estilo_caixa,
              c.capacidade,
              COALESCE(ru_count.ocupacao, 0) AS ocupacao,
              t.nome_tipo AS estilo_nome_tipo
       FROM rad_caixa_ftth c
       LEFT JOIN (
         SELECT id_caixa_ftth, COUNT(*) AS ocupacao
         FROM radusuarios
         WHERE id_caixa_ftth > 0
         GROUP BY id_caixa_ftth
       ) ru_count ON ru_count.id_caixa_ftth = c.id
       LEFT JOIN df_tipo_elemento t
         ON t.codigo_identificador = c.codigo_estilo_caixa
       WHERE c.status = 'A'
         AND c.latitude IS NOT NULL
         AND c.longitude IS NOT NULL
         AND c.latitude <> ''
         AND c.longitude <> ''`,
    );

    const items: NearbyFiberAccessTerminalReadModel[] = [];
    for (const row of rows) {
      const location = parseIxcCoordinate(row.latitude, row.longitude);
      if (!location || !isWithinRadius(center, location, radiusMeters)) {
        continue;
      }
      const idErp = String(row.id);
      const portCount = Number(row.capacidade) > 0 ? Number(row.capacidade) : 16;
      const occupiedPortCount = Number(row.ocupacao) >= 0 ? Number(row.ocupacao) : 0;
      const availablePortCount = Math.max(0, portCount - occupiedPortCount);

      items.push({
        id: idErp,
        idErp,
        name: (row.descricao ?? '').trim() || `FAT ${idErp}`,
        location,
        distanceMeters: distanceMeters(center, location),
        mapColorHex: mapColorFromCaixaEstilo(
          row.codigo_estilo_caixa,
          row.estilo_nome_tipo,
        ),
        portCount,
        occupiedPortCount,
        availablePortCount,
      });
    }
    return items;
  }
}
