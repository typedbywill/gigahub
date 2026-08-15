import type { Pool, RowDataPacket } from 'mysql2/promise';
import type {
  ActorUser,
  WorkOrderQueryRepository,
} from '@gigahub/application-work-order';
import type {
  MyScheduleQueryDto,
  WorkOrderDetailDto,
  WorkOrderListQueryDto,
  WorkOrderListResponseDto,
  WorkOrderStatus,
  WorkOrderSummaryDto,
} from '@gigahub/shared/contracts';
import { parseIxcCoordinate } from './ixc-geo';

interface OsRow extends RowDataPacket {
  id: number;
  id_cliente: number;
  cliente_nome: string | null;
  cliente_fone: string | null;
  cliente_endereco: string | null;
  cliente_numero: string | null;
  cliente_bairro: string | null;
  cliente_cidade: string | null;
  cliente_latitude: string | number | null;
  cliente_longitude: string | number | null;
  cliente_cnpj_cpf?: string | null;
  cliente_email?: string | null;
  cliente_status_internet?: string | null;
  id_assunto: number | null;
  assunto_nome: string | null;
  id_tecnico: string | number | null;
  tecnico_nome: string | null;
  status: string;
  data_agenda: Date | string | null;
  data_inicio: Date | string | null;
  data_fechamento: Date | string | null;
  data_abertura: Date | string | null;
  data_modificacao: Date | string | null;
  prioridade: string | null;
  setor: string | null;
  mensagem: string | null;
  id_contrato?: number | null;
}

interface MensagemRow extends RowDataPacket {
  id: number;
  id_chamado: number;
  mensagem: string | null;
  data_hora: Date | string | null;
  nome_usuario: string | null;
}

function cleanString(val: unknown): string | undefined {
  if (val == null) return undefined;
  const str = String(val).trim();
  return str.length > 0 ? str : undefined;
}

function formatDateToIso(val: Date | string | null | undefined): string | undefined {
  if (!val) return undefined;
  if (typeof val === 'string') {
    const s = val.trim();
    if (!s || s.startsWith('0000-00-00') || s.startsWith('0000/00/00')) {
      return undefined;
    }
  }
  try {
    const dateObj = val instanceof Date ? val : new Date(val);
    const time = dateObj.getTime();
    if (Number.isNaN(time) || time <= 0) {
      return undefined;
    }
    return dateObj.toISOString();
  } catch {
    return undefined;
  }
}

function mapStatus(val: string | null | undefined): WorkOrderStatus {
  const norm = (val ?? 'A').toUpperCase().trim();
  const valid: WorkOrderStatus[] = [
    'A',
    'AN',
    'EN',
    'AS',
    'AG',
    'DS',
    'EX',
    'F',
    'RAG',
  ];
  return valid.includes(norm as WorkOrderStatus)
    ? (norm as WorkOrderStatus)
    : 'A';
}

export class MysqlWorkOrderQueryAdapter implements WorkOrderQueryRepository {
  constructor(private readonly pool: Pool) {}

  private mapRowToSummary(row: OsRow): WorkOrderSummaryDto {
    const rawLat = row.cliente_latitude;
    const rawLng = row.cliente_longitude;
    const location = parseIxcCoordinate(
      rawLat != null ? String(rawLat) : null,
      rawLng != null ? String(rawLng) : null,
    );

    const endereco = [
      cleanString(row.cliente_endereco),
      cleanString(row.cliente_numero) ? `nº ${cleanString(row.cliente_numero)}` : null,
    ]
      .filter(Boolean)
      .join(', ');

    return {
      id: `os-${row.id}`,
      idErp: String(row.id),
      status: mapStatus(row.status),
      customerId: String(row.id_cliente),
      customerName: cleanString(row.cliente_nome) || 'Cliente sem nome',
      customerPhone: cleanString(row.cliente_fone),
      customerAddress: endereco || undefined,
      customerNeighborhood: cleanString(row.cliente_bairro),
      customerCity: cleanString(row.cliente_cidade),
      subjectId: row.id_assunto != null ? String(row.id_assunto) : undefined,
      subjectName: cleanString(row.assunto_nome),
      technicianId: row.id_tecnico != null ? String(row.id_tecnico) : undefined,
      technicianName: cleanString(row.tecnico_nome),
      scheduledAt: formatDateToIso(row.data_agenda),
      executionStartedAt: formatDateToIso(row.data_inicio),
      contractId: row.id_contrato != null ? String(row.id_contrato) : undefined,
      priority: cleanString(row.prioridade),
      sector: cleanString(row.setor),
      description: cleanString(row.mensagem),
      location: location
        ? { latitude: location.latitude, longitude: location.longitude }
        : undefined,
      createdAt:
        formatDateToIso(row.data_abertura) ||
        formatDateToIso(row.data_agenda) ||
        new Date().toISOString(),
      updatedAt:
        formatDateToIso(row.data_modificacao) || new Date().toISOString(),
    };
  }

  async getMySchedule(
    actor: ActorUser,
    query: MyScheduleQueryDto,
  ): Promise<WorkOrderSummaryDto[]> {
    const params: unknown[] = [];
    const conditions: string[] = [];

    // Suporte flexível para ID do técnico (tanto idErp quanto idErpEmployee)
    const techIds = [actor.idErp, actor.idErpEmployee].filter(
      Boolean,
    ) as string[];

    if (techIds.length === 0) {
      return [];
    }

    conditions.push(`o.id_tecnico IN (?)`);
    params.push(techIds);

    if (query.date) {
      conditions.push(`DATE(o.data_agenda) = ?`);
      params.push(query.date);
    }

    if (query.status) {
      conditions.push(`o.status = ?`);
      params.push(query.status);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        o.id,
        o.id_cliente,
        c.razao AS cliente_nome,
        c.fone AS cliente_fone,
        c.endereco AS cliente_endereco,
        c.numero AS cliente_numero,
        c.bairro AS cliente_bairro,
        c.cidade AS cliente_cidade,
        c.latitude AS cliente_latitude,
        c.longitude AS cliente_longitude,
        o.id_assunto,
        a.assunto AS assunto_nome,
        o.id_tecnico,
        u.nome AS tecnico_nome,
        o.status,
        o.data_agenda,
        o.data_inicio,
        o.data_fechamento,
        o.data_abertura,
        COALESCE(o.data_fechamento, o.data_inicio, o.data_agenda, o.data_abertura) AS data_modificacao,
        o.prioridade,
        o.setor,
        o.mensagem
      FROM su_oss_chamado o
      LEFT JOIN cliente c ON c.id = o.id_cliente
      LEFT JOIN su_oss_assunto a ON a.id = o.id_assunto
      LEFT JOIN usuarios u ON (u.id = o.id_tecnico OR u.funcionario = o.id_tecnico)
      ${whereClause}
      ORDER BY
        CASE
          WHEN o.status = 'EX' THEN 1
          WHEN o.status = 'DS' THEN 2
          WHEN o.status = 'AG' THEN 3
          ELSE 4
        END,
        o.data_agenda ASC,
        o.id ASC
    `;

    const [rows] = await this.pool.query<OsRow[]>(sql, params);
    return rows.map((r) => this.mapRowToSummary(r));
  }

  async listActive(actor?: ActorUser): Promise<WorkOrderSummaryDto[]> {
    const params: unknown[] = [];
    const conditions: string[] = [`o.status IN ('DS', 'EX')`];

    if (actor) {
      const techIds = [actor.idErp, actor.idErpEmployee].filter(
        Boolean,
      ) as string[];
      if (techIds.length > 0) {
        conditions.push(`o.id_tecnico IN (?)`);
        params.push(techIds);
      }
    }

    const sql = `
      SELECT
        o.id,
        o.id_cliente,
        c.razao AS cliente_nome,
        c.fone AS cliente_fone,
        c.endereco AS cliente_endereco,
        c.numero AS cliente_numero,
        c.bairro AS cliente_bairro,
        c.cidade AS cliente_cidade,
        c.latitude AS cliente_latitude,
        c.longitude AS cliente_longitude,
        o.id_assunto,
        a.assunto AS assunto_nome,
        o.id_tecnico,
        u.nome AS tecnico_nome,
        o.status,
        o.data_agenda,
        o.data_inicio,
        o.data_fechamento,
        o.data_abertura,
        COALESCE(o.data_fechamento, o.data_inicio, o.data_agenda, o.data_abertura) AS data_modificacao,
        o.prioridade,
        o.setor,
        o.mensagem
      FROM su_oss_chamado o
      LEFT JOIN cliente c ON c.id = o.id_cliente
      LEFT JOIN su_oss_assunto a ON a.id = o.id_assunto
      LEFT JOIN usuarios u ON (u.id = o.id_tecnico OR u.funcionario = o.id_tecnico)
      WHERE ${conditions.join(' AND ')}
      ORDER BY o.data_inicio DESC, o.data_agenda ASC
    `;

    const [rows] = await this.pool.query<OsRow[]>(sql, params);
    return rows.map((r) => this.mapRowToSummary(r));
  }

  async list(
    query: WorkOrderListQueryDto,
    actor?: ActorUser,
  ): Promise<WorkOrderListResponseDto> {
    const params: unknown[] = [];
    const conditions: string[] = [];

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const offset = (page - 1) * limit;

    if (query.status) {
      conditions.push(`o.status = ?`);
      params.push(query.status);
    }

    if (query.technicianId) {
      conditions.push(`o.id_tecnico = ?`);
      params.push(query.technicianId);
    }

    if (query.customerId) {
      const cleanCustomerId = Number(
        query.customerId.replace(/^cli-/, '').trim(),
      );
      if (!Number.isNaN(cleanCustomerId)) {
        conditions.push(`o.id_cliente = ?`);
        params.push(cleanCustomerId);
      }
    }

    if (query.startDate) {
      conditions.push(`DATE(o.data_agenda) >= ?`);
      params.push(query.startDate);
    }

    if (query.endDate) {
      conditions.push(`DATE(o.data_agenda) <= ?`);
      params.push(query.endDate);
    }

    if (query.q) {
      const q = `%${query.q.trim()}%`;
      conditions.push(
        `(o.id LIKE ? OR c.razao LIKE ? OR c.cnpj_cpf LIKE ? OR o.mensagem LIKE ?)`,
      );
      params.push(q, q, q, q);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) AS total
      FROM su_oss_chamado o
      LEFT JOIN cliente c ON c.id = o.id_cliente
      ${whereClause}
    `;

    const [countRows] = await this.pool.query<Array<RowDataPacket & { total: number }>>(
      countSql,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);

    const selectSql = `
      SELECT
        o.id,
        o.id_cliente,
        c.razao AS cliente_nome,
        c.fone AS cliente_fone,
        c.endereco AS cliente_endereco,
        c.numero AS cliente_numero,
        c.bairro AS cliente_bairro,
        c.cidade AS cliente_cidade,
        c.latitude AS cliente_latitude,
        c.longitude AS cliente_longitude,
        o.id_assunto,
        a.assunto AS assunto_nome,
        o.id_tecnico,
        u.nome AS tecnico_nome,
        o.status,
        o.data_agenda,
        o.data_inicio,
        o.data_fechamento,
        o.data_abertura,
        COALESCE(o.data_fechamento, o.data_inicio, o.data_agenda, o.data_abertura) AS data_modificacao,
        o.prioridade,
        o.setor,
        o.mensagem
      FROM su_oss_chamado o
      LEFT JOIN cliente c ON c.id = o.id_cliente
      LEFT JOIN su_oss_assunto a ON a.id = o.id_assunto
      LEFT JOIN usuarios u ON (u.id = o.id_tecnico OR u.funcionario = o.id_tecnico)
      ${whereClause}
      ORDER BY o.data_agenda DESC, o.id DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await this.pool.query<OsRow[]>(selectSql, [
      ...params,
      limit,
      offset,
    ]);

    return {
      items: rows.map((r) => this.mapRowToSummary(r)),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async findById(idOrIdErp: string): Promise<WorkOrderDetailDto | null> {
    const cleanId = idOrIdErp.replace(/^os-/, '').trim();
    const idNum = Number(cleanId);
    if (Number.isNaN(idNum) || idNum <= 0) {
      return null;
    }

    const sql = `
      SELECT
        o.id,
        o.id_cliente,
        c.razao AS cliente_nome,
        c.fone AS cliente_fone,
        c.endereco AS cliente_endereco,
        c.numero AS cliente_numero,
        c.bairro AS cliente_bairro,
        c.cidade AS cliente_cidade,
        c.latitude AS cliente_latitude,
        c.longitude AS cliente_longitude,
        c.cnpj_cpf AS cliente_cnpj_cpf,
        c.email AS cliente_email,
        c.status_internet AS cliente_status_internet,
        o.id_assunto,
        a.assunto AS assunto_nome,
        o.id_tecnico,
        u.nome AS tecnico_nome,
        o.status,
        o.data_agenda,
        o.data_inicio,
        o.data_fechamento,
        o.data_abertura,
        COALESCE(o.data_fechamento, o.data_inicio, o.data_agenda, o.data_abertura) AS data_modificacao,
        o.prioridade,
        o.setor,
        o.mensagem
      FROM su_oss_chamado o
      LEFT JOIN cliente c ON c.id = o.id_cliente
      LEFT JOIN su_oss_assunto a ON a.id = o.id_assunto
      LEFT JOIN usuarios u ON (u.id = o.id_tecnico OR u.funcionario = o.id_tecnico)
      WHERE o.id = ?
      LIMIT 1
    `;

    const [rows] = await this.pool.query<OsRow[]>(sql, [idNum]);
    const row = rows[0];
    if (!row) return null;

    const summary = this.mapRowToSummary(row);

    // Busca mensagens da OS
    const [msgRows] = await this.pool.query<MensagemRow[]>(
      `SELECT id, id_chamado, mensagem, data_hora, nome_usuario
       FROM su_oss_chamado_mensagem
       WHERE id_chamado = ?
       ORDER BY data_hora ASC, id ASC`,
      [idNum],
    );

    const messages = msgRows.map((m) => ({
      id: String(m.id),
      authorName: cleanString(m.nome_usuario) || 'Sistema',
      message: cleanString(m.mensagem) || '',
      createdAt: formatDateToIso(m.data_hora) || new Date().toISOString(),
    }));

    return {
      ...summary,
      messages,
      files: [],
      customerDetails: {
        idErp: String(row.id_cliente),
        razao: cleanString(row.cliente_nome) || 'Cliente sem nome',
        cnpjCpf: cleanString(row.cliente_cnpj_cpf),
        fone: cleanString(row.cliente_fone),
        email: cleanString(row.cliente_email),
        enderecoCompleto: summary.customerAddress,
        statusInternet: cleanString(row.cliente_status_internet),
        wifiPasswords: [],
      },
    };
  }

  async listByCustomer(customerIdErp: string): Promise<WorkOrderSummaryDto[]> {
    const cleanId = Number(customerIdErp.replace(/^cli-/, '').trim());
    if (Number.isNaN(cleanId) || cleanId <= 0) {
      return [];
    }

    const sql = `
      SELECT
        o.id,
        o.id_cliente,
        c.razao AS cliente_nome,
        c.fone AS cliente_fone,
        c.endereco AS cliente_endereco,
        c.numero AS cliente_numero,
        c.bairro AS cliente_bairro,
        c.cidade AS cliente_cidade,
        c.latitude AS cliente_latitude,
        c.longitude AS cliente_longitude,
        o.id_assunto,
        a.assunto AS assunto_nome,
        o.id_tecnico,
        u.nome AS tecnico_nome,
        o.status,
        o.data_agenda,
        o.data_inicio,
        o.data_fechamento,
        o.data_abertura,
        COALESCE(o.data_fechamento, o.data_inicio, o.data_agenda, o.data_abertura) AS data_modificacao,
        o.prioridade,
        o.setor,
        o.mensagem
      FROM su_oss_chamado o
      LEFT JOIN cliente c ON c.id = o.id_cliente
      LEFT JOIN su_oss_assunto a ON a.id = o.id_assunto
      LEFT JOIN usuarios u ON (u.id = o.id_tecnico OR u.funcionario = o.id_tecnico)
      WHERE o.id_cliente = ?
      ORDER BY o.data_abertura DESC, o.id DESC
      LIMIT 100
    `;

    const [rows] = await this.pool.query<OsRow[]>(sql, [cleanId]);
    return rows.map((r) => this.mapRowToSummary(r));
  }
}
