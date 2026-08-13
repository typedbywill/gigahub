import type {
  ErpCollaborator,
  ErpUserDirectory,
} from '@gigahub/application-identity';
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { createPool } from 'mysql2/promise';
import { formatIxcName, hashIxcPassword } from './ixc-password';

/** IXC `usuarios.status`: active = A, inactive = I. */
export const IXC_USER_STATUS_ACTIVE = 'A';
export const IXC_USER_STATUS_INACTIVE = 'I';

export interface IxcDbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

interface CollaboratorRow extends RowDataPacket {
  idErp: number | string;
  idErpEmployee: number | string;
  email: string | null;
  name: string | null;
  status: string | null;
  jobTitle: string | null;
  cashboxId: number | string | null;
  warehouseId: number | string | null;
  planningId: number | string | null;
}

function asOptionalId(value: number | string | null | undefined): string | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  return String(value);
}

export class MysqlErpUserDirectory implements ErpUserDirectory {
  private readonly pool: Pool;

  constructor(config: IxcDbConfig) {
    this.pool = createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 5,
      namedPlaceholders: false,
    });
  }

  async listCollaborators(): Promise<ErpCollaborator[]> {
    const sql = `
      SELECT
        u.id AS idErp,
        u.funcionario AS idErpEmployee,
        u.email AS email,
        u.nome AS name,
        u.status AS status,
        COALESCE(NULLIF(TRIM(s.setor), ''), 'Não Vinculado') AS jobTitle,
        u.caixa_fn_receber AS cashboxId,
        (
          SELECT a.id_almox
          FROM almox_usuario a
          WHERE a.id_usuario = u.id
          ORDER BY a.padrao_usuario ASC
          LIMIT 1
        ) AS warehouseId,
        u.id_caixa AS planningId
      FROM usuarios u
      LEFT JOIN funcionarios f ON f.id = u.funcionario
      LEFT JOIN empresa_setor s ON s.id = f.id_departamento
    `;
    const [rows] = await this.pool.query<CollaboratorRow[]>(sql);
    return rows.map((row) => ({
      idErp: String(row.idErp),
      idErpEmployee: String(row.idErpEmployee ?? ''),
      email: (row.email ?? '').trim(),
      name: formatIxcName(row.name ?? ''),
      active: row.status === IXC_USER_STATUS_ACTIVE,
      jobTitle: row.jobTitle?.trim() || undefined,
      cashboxId: asOptionalId(row.cashboxId),
      warehouseId: asOptionalId(row.warehouseId),
      planningId: asOptionalId(row.planningId),
    }));
  }

  async verifyPassword(email: string, plaintext: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT senha FROM usuarios WHERE LOWER(email) = ? LIMIT 1`,
      [normalized],
    );
    const stored = rows[0]?.senha as string | undefined;
    if (!stored) {
      return false;
    }
    return stored.toLowerCase() === hashIxcPassword(plaintext);
  }

  async updatePassword(idErp: string, plaintext: string): Promise<void> {
    const hash = hashIxcPassword(plaintext);
    const [result] = await this.pool.execute<ResultSetHeader>(
      `UPDATE usuarios SET senha = ? WHERE id = ?`,
      [hash, idErp],
    );
    if (result.affectedRows < 1) {
      throw new Error(`IXC user ${idErp} not found for password update`);
    }
  }

  async setCollaboratorActive(idErp: string, active: boolean): Promise<void> {
    const status = active ? IXC_USER_STATUS_ACTIVE : IXC_USER_STATUS_INACTIVE;
    const [result] = await this.pool.execute<ResultSetHeader>(
      `UPDATE usuarios SET status = ? WHERE id = ?`,
      [status, idErp],
    );
    if (result.affectedRows < 1) {
      throw new Error(`IXC user ${idErp} not found for status update`);
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
