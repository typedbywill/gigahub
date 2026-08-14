import type { Customer } from '@gigahub/domain/customer';
import type {
  CustomerComodatoReadModel,
  CustomerComodatosQueryParams,
  CustomerConsultationQuery,
  CustomerContractReadModel,
  CustomerContractsQueryParams,
  CustomerFaturaReadModel,
  CustomerFaturasQueryParams,
  CustomerFibraHistoricoQueryParams,
  CustomerFibraHistoricoReadModel,
  CustomerFibraReadModel,
  CustomerLoginReadModel,
  CustomerLoginsQueryParams,
  CustomerRegistrationQuery,
  CustomerSnapshotBundle,
  PaginatedReadModel,
} from '@gigahub/application-customer';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import {
  mapIxcCustomerRow,
  parseCustomerIdErp,
  type IxcCustomerRow,
} from './ixc-customer-mapper';

interface IdRow extends RowDataPacket {
  id: number;
}

interface ContractRow extends RowDataPacket {
  id: number;
  status: string;
  data_ativacao: Date | string | null;
}

interface LoginRow extends RowDataPacket {
  id: number;
  ativo: string;
  id_contrato: number | null;
  ip: string | null;
  login: string | null;
}

interface FibraRow extends RowDataPacket {
  id: number;
  id_login: number | null;
  mac: string | null;
  nome: string | null;
}

interface FibraHistoricoRow extends RowDataPacket {
  data_sinal: Date | string | null;
  sinal_rx: number | string | null;
}

interface FaturaRow extends RowDataPacket {
  id: number | string;
  status: string;
  data_vencimento: Date | string | null;
  data_emissao: Date | string | null;
  valor_aberto: number | string | null;
}

interface ComodatoRow extends RowDataPacket {
  id: number;
  status_comodato: string | null;
  numero_serie: string | null;
}

interface MensagemRow extends RowDataPacket {
  mensagem: string;
}

function clampLimit(limit: number | undefined, fallback = 10): number {
  return Math.min(Math.max(limit ?? fallback, 1), 100);
}

function toDate(value: Date | string | null | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  return value instanceof Date ? value : new Date(value);
}

function toNumber(value: number | string | null | undefined): number | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function wifiPasswordLine(message: string): string | false {
  const lines = message.split('\n');
  for (const line of lines) {
    if (line.toLowerCase().includes('senha')) {
      return line;
    }
  }
  return false;
}

export class MysqlCustomerQueryAdapter
  implements CustomerRegistrationQuery, CustomerConsultationQuery
{
  constructor(private readonly pool: Pool) {}

  async findByIdErp(idErp: string): Promise<Customer | null> {
    const id = parseCustomerIdErp(idErp);
    if (id == null) {
      return null;
    }
    const row = await this.findCustomerRow(id);
    return row ? mapIxcCustomerRow(row) : null;
  }

  async loadSnapshot(idErp: string): Promise<CustomerSnapshotBundle | null> {
    const id = parseCustomerIdErp(idErp);
    if (id == null) {
      return null;
    }

    const customer = await this.findCustomerRow(id);
    if (!customer) {
      return null;
    }

    const [loginRows] = await this.pool.query<LoginRow[]>(
      `SELECT id, ativo, id_contrato, ip, login
       FROM radusuarios
       WHERE id_cliente = ?
         AND ativo = 'S'
       ORDER BY id DESC
       LIMIT 1`,
      [id],
    );
    const activeLogin = loginRows[0];

    let activeContractIdErp: string | undefined;
    if (activeLogin?.id_contrato) {
      activeContractIdErp = String(activeLogin.id_contrato);
    } else {
      const [contractRows] = await this.pool.query<ContractRow[]>(
        `SELECT id, status, data_ativacao
         FROM cliente_contrato
         WHERE id_cliente = ?
           AND status = 'A'
         ORDER BY data_ativacao DESC
         LIMIT 1`,
        [id],
      );
      activeContractIdErp = contractRows[0]
        ? String(contractRows[0].id)
        : undefined;
    }

    let activeFiberIdErp: string | undefined;
    if (activeLogin) {
      const [fibraRows] = await this.pool.query<FibraRow[]>(
        `SELECT id, id_login, mac, nome
         FROM radpop_radio_cliente_fibra
         WHERE id_login = ?
         LIMIT 1`,
        [activeLogin.id],
      );
      activeFiberIdErp = fibraRows[0] ? String(fibraRows[0].id) : undefined;
    }

    return {
      activeContractIdErp,
      activeLoginIdErp: activeLogin ? String(activeLogin.id) : undefined,
      activeFiberIdErp,
      loginIp: activeLogin?.ip?.trim() || undefined,
    };
  }

  async loadContracts(
    idErp: string,
    params: CustomerContractsQueryParams,
  ): Promise<PaginatedReadModel<CustomerContractReadModel>> {
    const id = parseCustomerIdErp(idErp);
    if (id == null) {
      return { total: 0, items: [] };
    }

    const limit = clampLimit(params.limit);
    const offset = params.offset ?? 0;
    const values: Array<string | number> = [id];
    let where = 'id_cliente = ?';
    if (params.status) {
      where += ' AND status = ?';
      values.push(params.status);
    }

    const [countRows] = await this.pool.query<Array<RowDataPacket & { total: number }>>(
      `SELECT COUNT(*) AS total FROM cliente_contrato WHERE ${where}`,
      values,
    );

    values.push(limit, offset);
    const [rows] = await this.pool.query<ContractRow[]>(
      `SELECT id, status, data_ativacao
       FROM cliente_contrato
       WHERE ${where}
       ORDER BY data_ativacao DESC
       LIMIT ? OFFSET ?`,
      values,
    );

    return {
      total: Number(countRows[0]?.total ?? 0),
      items: rows.map((row) => ({
        id: String(row.id),
        idErp: String(row.id),
        status: row.status,
        activatedAt: toDate(row.data_ativacao),
      })),
    };
  }

  async loadLogins(
    idErp: string,
    params: CustomerLoginsQueryParams,
  ): Promise<PaginatedReadModel<CustomerLoginReadModel>> {
    const id = parseCustomerIdErp(idErp);
    if (id == null) {
      return { total: 0, items: [] };
    }

    const limit = clampLimit(params.limit);
    const offset = params.offset ?? 0;
    const values: Array<string | number> = [id];
    let where = 'id_cliente = ?';
    if (params.ativo) {
      where += ' AND ativo = ?';
      values.push(params.ativo);
    }

    const [countRows] = await this.pool.query<Array<RowDataPacket & { total: number }>>(
      `SELECT COUNT(*) AS total FROM radusuarios WHERE ${where}`,
      values,
    );

    values.push(limit, offset);
    const [rows] = await this.pool.query<LoginRow[]>(
      `SELECT id, ativo, id_contrato, ip, login
       FROM radusuarios
       WHERE ${where}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      values,
    );

    return {
      total: Number(countRows[0]?.total ?? 0),
      items: rows.map((row) => ({
        id: String(row.id),
        idErp: String(row.id),
        active: row.ativo === 'S',
        contractIdErp: row.id_contrato ? String(row.id_contrato) : undefined,
        ip: row.ip?.trim() || undefined,
        login: row.login?.trim() || undefined,
      })),
    };
  }

  async loadFibra(
    idErp: string,
    fiberIdErp?: string,
    loginIdErp?: string,
  ): Promise<PaginatedReadModel<CustomerFibraReadModel>> {
    if (fiberIdErp) {
      const fiberId = parseCustomerIdErp(fiberIdErp);
      if (fiberId == null) {
        return { total: 0, items: [] };
      }
      const [rows] = await this.pool.query<FibraRow[]>(
        `SELECT id, id_login, mac, nome
         FROM radpop_radio_cliente_fibra
         WHERE id = ?
         LIMIT 1`,
        [fiberId],
      );
      return {
        total: rows.length,
        items: rows.map((row) => this.mapFibraRow(row)),
      };
    }

    if (loginIdErp) {
      const loginId = parseCustomerIdErp(loginIdErp);
      if (loginId == null) {
        return { total: 0, items: [] };
      }
      const [rows] = await this.pool.query<FibraRow[]>(
        `SELECT id, id_login, mac, nome
         FROM radpop_radio_cliente_fibra
         WHERE id_login = ?`,
        [loginId],
      );
      return {
        total: rows.length,
        items: rows.map((row) => this.mapFibraRow(row)),
      };
    }

    const id = parseCustomerIdErp(idErp);
    if (id == null) {
      return { total: 0, items: [] };
    }

    const [loginRows] = await this.pool.query<IdRow[]>(
      `SELECT id FROM radusuarios WHERE id_cliente = ?`,
      [id],
    );
    if (loginRows.length === 0) {
      return { total: 0, items: [] };
    }

    const loginIds = loginRows.map((row) => row.id);
    const [rows] = await this.pool.query<FibraRow[]>(
      `SELECT id, id_login, mac, nome
       FROM radpop_radio_cliente_fibra
       WHERE id_login IN (?)`,
      [loginIds],
    );

    return {
      total: rows.length,
      items: rows.map((row) => this.mapFibraRow(row)),
    };
  }

  async loadFibraHistorico(
    fiberIdErp: string,
    params: CustomerFibraHistoricoQueryParams,
  ): Promise<PaginatedReadModel<CustomerFibraHistoricoReadModel>> {
    const fiberId = parseCustomerIdErp(fiberIdErp);
    if (fiberId == null) {
      return { total: 0, items: [] };
    }

    const limit = clampLimit(params.limit);
    const offset = params.offset ?? 0;

    const [countRows] = await this.pool.query<Array<RowDataPacket & { total: number }>>(
      `SELECT COUNT(*) AS total
       FROM radpop_radio_cliente_fibra_historico
       WHERE id_cliente_fibra = ?`,
      [fiberId],
    );

    const [rows] = await this.pool.query<FibraHistoricoRow[]>(
      `SELECT data_sinal, sinal_rx
       FROM radpop_radio_cliente_fibra_historico
       WHERE id_cliente_fibra = ?
       ORDER BY data_sinal DESC
       LIMIT ? OFFSET ?`,
      [fiberId, limit, offset],
    );

    return {
      total: Number(countRows[0]?.total ?? 0),
      items: rows.map((row) => ({
        recordedAt: toDate(row.data_sinal) ?? new Date(0),
        signalRx: toNumber(row.sinal_rx),
      })),
    };
  }

  async loadFaturas(
    contractIdErp: string,
    params: CustomerFaturasQueryParams,
  ): Promise<PaginatedReadModel<CustomerFaturaReadModel>> {
    const contractId = parseCustomerIdErp(contractIdErp);
    if (contractId == null) {
      return { total: 0, items: [] };
    }

    const limit = clampLimit(params.limit);
    const offset = params.offset ?? 0;
    const values: Array<string | number | boolean> = [contractId];
    let where = 'id_contrato = ?';

    if (params.status) {
      where += ' AND status = ?';
      values.push(params.status);
    }
    if (params.onlyOpen) {
      where += " AND status = 'A' AND valor_aberto > 0";
    }

    const [countRows] = await this.pool.query<Array<RowDataPacket & { total: number }>>(
      `SELECT COUNT(*) AS total FROM fn_areceber WHERE ${where}`,
      values,
    );

    values.push(limit, offset);
    const [rows] = await this.pool.query<FaturaRow[]>(
      `SELECT id, status, data_vencimento, data_emissao, valor_aberto
       FROM fn_areceber
       WHERE ${where}
       ORDER BY data_vencimento DESC
       LIMIT ? OFFSET ?`,
      values,
    );

    return {
      total: Number(countRows[0]?.total ?? 0),
      items: rows.map((row) => ({
        id: String(row.id),
        idErp: String(row.id),
        status: row.status,
        dueDate: toDate(row.data_vencimento),
        issuedAt: toDate(row.data_emissao),
        openAmount: toNumber(row.valor_aberto),
      })),
    };
  }

  async loadComodatos(
    contractIdErp: string,
    params: CustomerComodatosQueryParams,
  ): Promise<PaginatedReadModel<CustomerComodatoReadModel>> {
    const contractId = parseCustomerIdErp(contractIdErp);
    if (contractId == null) {
      return { total: 0, items: [] };
    }

    const limit = clampLimit(params.limit);
    const offset = params.offset ?? 0;
    const values: Array<string | number> = [contractId];
    let where = 'id_contrato = ?';

    if (params.statusComodato) {
      where += ' AND status_comodato = ?';
      values.push(params.statusComodato);
    } else {
      where += " AND status_comodato = 'E'";
    }

    const [countRows] = await this.pool.query<Array<RowDataPacket & { total: number }>>(
      `SELECT COUNT(*) AS total FROM movimento_produtos WHERE ${where}`,
      values,
    );

    values.push(limit, offset);
    const [rows] = await this.pool.query<ComodatoRow[]>(
      `SELECT id, status_comodato, numero_serie
       FROM movimento_produtos
       WHERE ${where}
       LIMIT ? OFFSET ?`,
      values,
    );

    return {
      total: Number(countRows[0]?.total ?? 0),
      items: rows.map((row) => ({
        id: String(row.id),
        idErp: String(row.id),
        productDescription: row.numero_serie?.trim() || undefined,
        status: row.status_comodato ?? '',
      })),
    };
  }

  async loadSenhasWifi(idErp: string): Promise<string[]> {
    const id = parseCustomerIdErp(idErp);
    if (id == null) {
      return [];
    }

    const [osRows] = await this.pool.query<IdRow[]>(
      `SELECT id FROM su_oss_chamado WHERE id_cliente = ?`,
      [id],
    );
    if (osRows.length === 0) {
      return [];
    }

    const osIds = osRows.map((row) => row.id);
    const [messageRows] = await this.pool.query<MensagemRow[]>(
      `SELECT mensagem
       FROM su_oss_chamado_mensagem
       WHERE id_chamado IN (?)`,
      [osIds],
    );

    const lines: string[] = [];
    for (const row of messageRows) {
      const found = wifiPasswordLine(row.mensagem ?? '');
      if (found) {
        lines.push(found);
      }
    }
    return lines;
  }

  private async findCustomerRow(id: number): Promise<IxcCustomerRow | null> {
    const [rows] = await this.pool.query<Array<RowDataPacket & IxcCustomerRow>>(
      `SELECT id,
              razao,
              cnpj_cpf,
              endereco,
              numero,
              bairro,
              cep,
              email,
              fone,
              ativo,
              status_internet,
              latitude,
              longitude,
              data
       FROM cliente
       WHERE id = ? OR idx = ?
       LIMIT 1`,
      [id, id],
    );
    return rows[0] ?? null;
  }

  private mapFibraRow(row: FibraRow): CustomerFibraReadModel {
    return {
      id: String(row.id),
      idErp: String(row.id),
      loginIdErp: row.id_login ? String(row.id_login) : undefined,
      onuSerial: row.nome?.trim() || undefined,
      mac: row.mac?.trim() || undefined,
    };
  }
}
