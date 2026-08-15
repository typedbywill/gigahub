import type {
  CtoCustomersQuery,
  CtoCustomersReadModel,
  CtoCustomerReadModel,
} from '@gigahub/application-network';
import { generateMockOpticalSignal } from '@gigahub/domain/fiber-access-terminal';
import type { Pool, RowDataPacket } from 'mysql2/promise';

interface FatRow extends RowDataPacket {
  id: number;
  descricao: string;
  capacidade: number | null;
}

interface RadUsuarioCustomerRow extends RowDataPacket {
  rad_usuario_id: number;
  id_cliente: number;
  id_contrato: number | null;
  login: string | null;
  mac: string | null;
  ftth_porta: number | string | null;
  online: string | null;
  razao: string | null;
  fantasia: string | null;
  cnpj_cpf: string | null;
  telefone_celular: string | null;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
}

export class MysqlCtoCustomersQuery implements CtoCustomersQuery {
  constructor(private readonly pool: Pool) {}

  async findByFatId(fatId: string): Promise<CtoCustomersReadModel | null> {
    const numericId = Number(fatId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return null;
    }

    const [boxRows] = await this.pool.query<FatRow[]>(
      `SELECT id, descricao, capacidade
       FROM rad_caixa_ftth
       WHERE id = ?
       LIMIT 1`,
      [numericId],
    );

    if (boxRows.length === 0) {
      return null;
    }

    const box = boxRows[0];
    const fatName = (box.descricao ?? '').trim() || `CTO ${fatId}`;

    const [clientRows] = await this.pool.query<RadUsuarioCustomerRow[]>(
      `SELECT 
         ru.id AS rad_usuario_id,
         ru.id_cliente,
         ru.id_contrato,
         ru.login,
         ru.mac,
         ru.ftth_porta,
         ru.online,
         c.razao,
         c.fantasia,
         c.cnpj_cpf,
         c.telefone_celular,
         c.endereco,
         c.numero,
         c.bairro,
         c.cidade
       FROM radusuarios ru
       LEFT JOIN cliente c ON c.id = ru.id_cliente
       WHERE ru.id_caixa_ftth = ?
       ORDER BY CAST(ru.ftth_porta AS UNSIGNED) ASC, ru.id ASC`,
      [numericId],
    );

    const customers: CtoCustomerReadModel[] = [];
    const seenPorts = new Set<number>();

    for (const row of clientRows) {
      const portaFtth = Number(row.ftth_porta) || 1;
      // If there are duplicate port records in DB, adjust or keep first
      const uniquePort = seenPorts.has(portaFtth)
        ? Math.min(128, Math.max(...seenPorts) + 1)
        : portaFtth;
      seenPorts.add(uniquePort);

      const radUsuarioId = String(row.rad_usuario_id);
      const isOnline = String(row.online ?? '').toUpperCase() === 'S';

      const enderecoParts = [
        row.endereco,
        row.numero ? `nº ${row.numero}` : null,
        row.bairro,
        row.cidade,
      ]
        .filter(Boolean)
        .map((s) => String(s).trim())
        .filter((s) => s.length > 0);

      const mockSignal = generateMockOpticalSignal(
        radUsuarioId,
        uniquePort,
        isOnline,
      );

      customers.push({
        radUsuarioId,
        clienteId: String(row.id_cliente),
        contratoId: row.id_contrato ? String(row.id_contrato) : undefined,
        login: (row.login ?? '').trim() || `cliente_${radUsuarioId}`,
        mac: (row.mac ?? '').trim() || undefined,
        portaFtth: uniquePort,
        razaoSocial:
          (row.razao ?? '').trim() ||
          (row.login ?? '').trim() ||
          `Cliente #${row.id_cliente}`,
        nomeFantasia: (row.fantasia ?? '').trim() || undefined,
        cpfCnpj: (row.cnpj_cpf ?? '').trim() || undefined,
        telefone: (row.telefone_celular ?? '').trim() || undefined,
        endereco: enderecoParts.length > 0 ? enderecoParts.join(', ') : undefined,
        online: isOnline,
        signal: mockSignal,
      });
    }

    const totalPorts = Number(box.capacidade) > 0 ? Number(box.capacidade) : 16;
    const occupiedPorts = customers.length;
    const availablePorts = Math.max(0, totalPorts - occupiedPorts);

    return {
      fatId: String(box.id),
      fatName,
      totalPorts,
      occupiedPorts,
      availablePorts,
      customers,
    };
  }
}
