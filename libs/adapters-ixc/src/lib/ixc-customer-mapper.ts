import { Customer, mapIxcCustomerStatus } from '@gigahub/domain/customer';
import { parseIxcCoordinate } from './ixc-geo';

export interface IxcCustomerRow {
  id: number;
  razao: string;
  cnpj_cpf: string | null;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cep: string | null;
  email: string | null;
  fone: string | null;
  ativo: string | null;
  status_internet: string | null;
  latitude: string | null;
  longitude: string | null;
  data: Date | string | null;
}

export function mapIxcCustomerRow(row: IxcCustomerRow): Customer {
  const idErp = String(row.id);
  const location = parseIxcCoordinate(row.latitude, row.longitude);
  const createdAt =
    row.data instanceof Date
      ? row.data
      : row.data
        ? new Date(row.data)
        : new Date();

  return Customer.create({
    id: idErp,
    idErp,
    name: (row.razao ?? '').trim() || `Cliente ${idErp}`,
    document: row.cnpj_cpf?.trim() || undefined,
    email: row.email?.trim() || undefined,
    phone: row.fone?.trim() || undefined,
    status: mapIxcCustomerStatus(row.ativo, row.status_internet),
    address: {
      street: row.endereco?.trim() || undefined,
      number: row.numero?.trim() || undefined,
      neighborhood: row.bairro?.trim() || undefined,
      zipCode: row.cep?.trim() || undefined,
      location: location ?? undefined,
    },
    createdAt,
    updatedAt: createdAt,
  });
}

export function customerSearchHitFromRow(row: IxcCustomerRow) {
  const idErp = String(row.id);
  const location = parseIxcCoordinate(row.latitude, row.longitude);
  return {
    id: idErp,
    idErp,
    name: (row.razao ?? '').trim() || `Cliente ${idErp}`,
    document: row.cnpj_cpf?.trim() || undefined,
    location: location ?? undefined,
  };
}

export function parseCustomerIdErp(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function likePattern(q: string): string {
  return `%${q.replace(/[%_\\]/g, '\\$&')}%`;
}
