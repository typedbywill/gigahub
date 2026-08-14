import type {
  CustomerSearchHitReadModel,
  CustomerSearchQuery,
} from '@gigahub/application-customer';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import {
  customerSearchHitFromRow,
  likePattern,
  type IxcCustomerRow,
} from './ixc-customer-mapper';

interface CustomerSearchRow extends RowDataPacket, IxcCustomerRow {
  id_exact: number;
}

export class MysqlCustomerSearchQuery implements CustomerSearchQuery {
  constructor(private readonly pool: Pool) {}

  async search(q: string, limit: number): Promise<CustomerSearchHitReadModel[]> {
    const trimmed = q.trim();
    const pattern = likePattern(trimmed);
    const isNumeric = !Number.isNaN(Number(trimmed)) && trimmed !== '';

    let rows: CustomerSearchRow[];
    if (isNumeric) {
      const id = Number(trimmed);
      [rows] = await this.pool.query<CustomerSearchRow[]>(
        `SELECT c.id,
                c.razao,
                c.cnpj_cpf,
                c.endereco,
                c.numero,
                c.bairro,
                c.cep,
                c.email,
                c.fone,
                c.ativo,
                c.status_internet,
                c.latitude,
                c.longitude,
                c.data,
                (c.id = ? OR c.idx = ?) AS id_exact
         FROM cliente c
         WHERE c.id = ?
            OR c.idx = ?
            OR c.cnpj_cpf = ?
            OR c.razao LIKE ?
         ORDER BY id_exact DESC, c.razao ASC
         LIMIT ?`,
        [id, id, id, id, trimmed, pattern, limit],
      );
    } else {
      [rows] = await this.pool.query<CustomerSearchRow[]>(
        `SELECT c.id,
                c.razao,
                c.cnpj_cpf,
                c.endereco,
                c.numero,
                c.bairro,
                c.cep,
                c.email,
                c.fone,
                c.ativo,
                c.status_internet,
                c.latitude,
                c.longitude,
                c.data,
                0 AS id_exact
         FROM cliente c
         WHERE c.razao LIKE ?
            OR c.cnpj_cpf = ?
         ORDER BY c.razao ASC
         LIMIT ?`,
        [pattern, trimmed, limit],
      );
    }

    return rows.map(customerSearchHitFromRow);
  }
}
