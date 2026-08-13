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

interface FatRow extends RowDataPacket {
  id: number;
  descricao: string;
  latitude: string | null;
  longitude: string | null;
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
      `SELECT id, descricao, latitude, longitude
       FROM rad_caixa_ftth
       WHERE status = 'A'
         AND latitude IS NOT NULL
         AND longitude IS NOT NULL
         AND latitude <> ''
         AND longitude <> ''`,
    );

    const items: NearbyFiberAccessTerminalReadModel[] = [];
    for (const row of rows) {
      const location = parseIxcCoordinate(row.latitude, row.longitude);
      if (!location || !isWithinRadius(center, location, radiusMeters)) {
        continue;
      }
      const idErp = String(row.id);
      items.push({
        id: idErp,
        idErp,
        name: (row.descricao ?? '').trim() || `FAT ${idErp}`,
        location,
        distanceMeters: distanceMeters(center, location),
      });
    }
    return items;
  }
}
