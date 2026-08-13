import type {
  ProjectNetworkSearchHitReadModel,
  ProjectNetworkSearchQuery,
} from '@gigahub/application-network';
import type { ProjectNetworkSearchKind } from '@gigahub/domain/fiber-access-terminal';
import type { GeoPoint } from '@gigahub/shared/kernel';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { parseIxcCoordinate } from './ixc-geo';
import { IXC_FIBER_CABLE_ELEMENT_TIPO } from './mysql-fiber-cable-nearby-query';

interface FatSearchRow extends RowDataPacket {
  id: number;
  descricao: string;
  latitude: string | null;
  longitude: string | null;
  id_exact: number;
}

interface CableSearchRow extends RowDataPacket {
  id: number;
  descricao: string;
  nome_tipo: string | null;
  id_exact: number;
}

interface CableCoordRow extends RowDataPacket {
  id_elemento: number;
  latitude: string;
  longitude: string;
  sequencia: number;
}

function likePattern(q: string): string {
  return `%${q.replace(/[%_\\]/g, '\\$&')}%`;
}

export class MysqlProjectNetworkSearchQuery
  implements ProjectNetworkSearchQuery
{
  constructor(private readonly pool: Pool) {}

  async search(input: {
    q: string;
    kind: ProjectNetworkSearchKind;
    limit: number;
  }): Promise<ProjectNetworkSearchHitReadModel[]> {
    if (input.kind === 'fat') {
      return this.searchFats(input.q, input.limit);
    }
    if (input.kind === 'cable') {
      return this.searchCables(input.q, input.limit);
    }

    const fatLimit = Math.ceil(input.limit / 2);
    const cableLimit = Math.floor(input.limit / 2);
    const [fats, cables] = await Promise.all([
      this.searchFats(input.q, fatLimit),
      this.searchCables(input.q, cableLimit),
    ]);
    // Prefer exact id matches first, then name.
    const merged = [...fats, ...cables].sort((a, b) => {
      const aExact = a.idErp === input.q ? 0 : 1;
      const bExact = b.idErp === input.q ? 0 : 1;
      if (aExact !== bExact) {
        return aExact - bExact;
      }
      return a.name.localeCompare(b.name, 'pt-BR');
    });
    return merged.slice(0, input.limit);
  }

  private async searchFats(
    q: string,
    limit: number,
  ): Promise<ProjectNetworkSearchHitReadModel[]> {
    if (limit < 1) {
      return [];
    }
    const pattern = likePattern(q);
    const [rows] = await this.pool.query<FatSearchRow[]>(
      `SELECT c.id,
              c.descricao,
              c.latitude,
              c.longitude,
              (CAST(c.id AS CHAR) = ?) AS id_exact
       FROM rad_caixa_ftth c
       WHERE c.status = 'A'
         AND c.latitude IS NOT NULL
         AND c.longitude IS NOT NULL
         AND c.latitude <> ''
         AND c.longitude <> ''
         AND (
           c.descricao LIKE ?
           OR CAST(c.id AS CHAR) LIKE ?
         )
       ORDER BY id_exact DESC, c.descricao ASC
       LIMIT ?`,
      [q, pattern, pattern, limit],
    );

    const items: ProjectNetworkSearchHitReadModel[] = [];
    for (const row of rows) {
      const location = parseIxcCoordinate(row.latitude, row.longitude);
      if (!location) {
        continue;
      }
      const idErp = String(row.id);
      items.push({
        kind: 'fat',
        id: idErp,
        idErp,
        name: (row.descricao ?? '').trim() || `FAT ${idErp}`,
        location,
      });
    }
    return items;
  }

  private async searchCables(
    q: string,
    limit: number,
  ): Promise<ProjectNetworkSearchHitReadModel[]> {
    if (limit < 1) {
      return [];
    }
    const pattern = likePattern(q);
    const [rows] = await this.pool.query<CableSearchRow[]>(
      `SELECT e.id,
              e.descricao,
              t.nome_tipo,
              (CAST(e.id AS CHAR) = ?) AS id_exact
       FROM df_elemento e
       LEFT JOIN df_tipo_elemento t ON t.id = e.id_tipo_elemento
       WHERE e.tipo = ?
         AND e.ativo = 'S'
         AND (
           e.descricao LIKE ?
           OR CAST(e.id AS CHAR) LIKE ?
           OR t.nome_tipo LIKE ?
         )
       ORDER BY id_exact DESC, e.descricao ASC
       LIMIT ?`,
      [q, IXC_FIBER_CABLE_ELEMENT_TIPO, pattern, pattern, pattern, limit],
    );

    if (rows.length === 0) {
      return [];
    }

    const ids = rows.map((row) => row.id);
    const locationById = await this.loadCableFlyLocations(ids);

    const items: ProjectNetworkSearchHitReadModel[] = [];
    for (const row of rows) {
      const location = locationById.get(row.id);
      if (!location) {
        continue;
      }
      const idErp = String(row.id);
      const cableTypeName = row.nome_tipo?.trim() || undefined;
      items.push({
        kind: 'cable',
        id: idErp,
        idErp,
        name: (row.descricao ?? '').trim() || `Cable ${idErp}`,
        location,
        cableTypeName,
      });
    }
    return items;
  }

  /** One vertex per cable (lowest sequencia) for map fly-to. */
  private async loadCableFlyLocations(
    elementIds: number[],
  ): Promise<Map<number, GeoPoint>> {
    const [coords] = await this.pool.query<CableCoordRow[]>(
      `SELECT ec.id_elemento,
              c.latitude,
              c.longitude,
              ec.sequencia
       FROM df_elemento_coordenada ec
       INNER JOIN df_coordenada c ON c.id = ec.id_coordenada
       WHERE ec.id_elemento IN (?)
         AND c.latitude IS NOT NULL
         AND c.longitude IS NOT NULL
         AND c.latitude <> ''
         AND c.longitude <> ''
       ORDER BY ec.id_elemento ASC, ec.sequencia ASC`,
      [elementIds],
    );

    const map = new Map<number, GeoPoint>();
    for (const row of coords) {
      if (map.has(row.id_elemento)) {
        continue;
      }
      const point = parseIxcCoordinate(row.latitude, row.longitude);
      if (point) {
        map.set(row.id_elemento, point);
      }
    }
    return map;
  }
}
