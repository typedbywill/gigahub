import type { GeoPoint } from '@gigahub/shared/kernel';
import type { CustomerConsultSection } from '@gigahub/shared/contracts';
import type { Customer } from '@gigahub/domain/customer';

export interface CustomerSearchHitReadModel {
  id: string;
  idErp: string;
  name: string;
  document?: string;
  location?: GeoPoint;
}

export interface PaginatedReadModel<T> {
  total: number;
  items: T[];
}

export interface CustomerContractReadModel {
  id: string;
  idErp: string;
  status: string;
  activatedAt?: Date;
}

export interface CustomerLoginReadModel {
  id: string;
  idErp: string;
  active: boolean;
  contractIdErp?: string;
  ip?: string;
  login?: string;
}

export interface CustomerFibraReadModel {
  id: string;
  idErp: string;
  loginIdErp?: string;
  onuSerial?: string;
  mac?: string;
}

export interface CustomerFibraHistoricoReadModel {
  recordedAt: Date;
  signalRx?: number;
}

export interface CustomerFaturaReadModel {
  id: string;
  idErp: string;
  status: string;
  dueDate?: Date;
  issuedAt?: Date;
  openAmount?: number;
}

export interface CustomerComodatoReadModel {
  id: string;
  idErp: string;
  productDescription?: string;
  status: string;
}

export interface CustomerSnapshotBundle {
  activeContractIdErp?: string;
  activeLoginIdErp?: string;
  activeFiberIdErp?: string;
  loginIp?: string;
}

export interface CustomerSearchQuery {
  search(q: string, limit: number): Promise<CustomerSearchHitReadModel[]>;
}

export interface CustomerRegistrationQuery {
  findByIdErp(idErp: string): Promise<Customer | null>;
}

export interface CustomerContractsQueryParams {
  limit?: number;
  offset?: number;
  status?: string;
}

export interface CustomerLoginsQueryParams {
  limit?: number;
  offset?: number;
  ativo?: 'S' | 'N';
}

export interface CustomerFibraHistoricoQueryParams {
  limit?: number;
  offset?: number;
}

export interface CustomerFaturasQueryParams {
  limit?: number;
  offset?: number;
  status?: 'A' | 'R' | 'P' | 'C';
  onlyOpen?: boolean;
}

export interface CustomerComodatosQueryParams {
  limit?: number;
  offset?: number;
  statusComodato?: 'E' | 'D' | 'B' | 'A';
}

export interface CustomerConsultationQuery {
  loadSnapshot(idErp: string): Promise<CustomerSnapshotBundle | null>;
  loadContracts(
    idErp: string,
    params: CustomerContractsQueryParams,
  ): Promise<PaginatedReadModel<CustomerContractReadModel>>;
  loadLogins(
    idErp: string,
    params: CustomerLoginsQueryParams,
  ): Promise<PaginatedReadModel<CustomerLoginReadModel>>;
  loadFibra(
    idErp: string,
    fiberIdErp?: string,
    loginIdErp?: string,
  ): Promise<PaginatedReadModel<CustomerFibraReadModel>>;
  loadFibraHistorico(
    fiberIdErp: string,
    params: CustomerFibraHistoricoQueryParams,
  ): Promise<PaginatedReadModel<CustomerFibraHistoricoReadModel>>;
  loadFaturas(
    contractIdErp: string,
    params: CustomerFaturasQueryParams,
  ): Promise<PaginatedReadModel<CustomerFaturaReadModel>>;
  loadComodatos(
    contractIdErp: string,
    params: CustomerComodatosQueryParams,
  ): Promise<PaginatedReadModel<CustomerComodatoReadModel>>;
  loadSenhasWifi(idErp: string): Promise<string[]>;
}

export interface CustomerSignalReaderPort {
  readSignal(fiberIdsErp: string[]): Promise<
    Array<{
      fiberIdErp: string;
      value?: string;
      error?: string;
    }>
  >;
}

export interface CustomerRemoteAccessPort {
  checkPorts(
    ip: string,
    ports: readonly number[],
    timeoutMs: number,
  ): Promise<Array<{ port: number; isOpen: boolean }>>;
}

export interface CustomerConsultationCommand {
  actorUserId: string;
  customerIdErp: string;
  include: CustomerConsultSection[];
  contractIdErp?: string;
  fiberIdErp?: string;
  contracts?: CustomerContractsQueryParams;
  logins?: CustomerLoginsQueryParams;
  fibraHistorico?: CustomerFibraHistoricoQueryParams;
  faturas?: CustomerFaturasQueryParams;
  comodatos?: CustomerComodatosQueryParams;
}

export class ApplicationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export const ApplicationErrorCodes = {
  InvalidSearchQuery: 'INVALID_CUSTOMER_SEARCH_QUERY',
  InvalidConsultationQuery: 'INVALID_CUSTOMER_CONSULTATION_QUERY',
  NotFound: 'CUSTOMER_NOT_FOUND',
  PermissionDenied: 'PERMISSION_DENIED',
  Unauthorized: 'UNAUTHORIZED',
} as const;

export const REMOTE_ACCESS_PORTS = [80, 443] as const;
export const REMOTE_ACCESS_TIMEOUT_MS = 10_000;
