import type {
  CustomerConsultationResponseDto,
  CustomerSearchResponseDto,
} from '@gigahub/shared/contracts';
import { apiFetch } from './http';

export interface SearchCustomersParams {
  q: string;
  limit?: number;
}

export interface CustomerConsultationParams {
  include: string[];
  contractId?: number;
  fiberId?: number;
  contractsLimit?: number;
  contractsOffset?: number;
  contractsStatus?: string;
  loginsLimit?: number;
  loginsOffset?: number;
  loginsAtivo?: 'S' | 'N';
  fibraHistoricoLimit?: number;
  fibraHistoricoOffset?: number;
  faturasLimit?: number;
  faturasOffset?: number;
  faturasStatus?: 'A' | 'R' | 'P' | 'C';
  faturasOnlyOpen?: boolean;
  comodatosLimit?: number;
  comodatosOffset?: number;
  comodatosStatus?: 'E' | 'D' | 'B' | 'A';
}

export function searchCustomersRequest(
  accessToken: string,
  params: SearchCustomersParams,
  signal?: AbortSignal,
): Promise<CustomerSearchResponseDto> {
  return apiFetch<CustomerSearchResponseDto>('/api/v1/clientes/busca', {
    accessToken,
    signal,
    query: {
      q: params.q,
      limit: params.limit,
    },
  });
}

export function getCustomerConsultationRequest(
  accessToken: string,
  customerId: string,
  params: CustomerConsultationParams,
  signal?: AbortSignal,
): Promise<CustomerConsultationResponseDto> {
  const query: Record<string, string | string[] | number | boolean | undefined> = {
    include: Array.isArray(params.include) ? params.include.join(',') : params.include,
    contractId: params.contractId,
    fiberId: params.fiberId,
    contractsLimit: params.contractsLimit,
    contractsOffset: params.contractsOffset,
    contractsStatus: params.contractsStatus,
    loginsLimit: params.loginsLimit,
    loginsOffset: params.loginsOffset,
    loginsAtivo: params.loginsAtivo,
    fibraHistoricoLimit: params.fibraHistoricoLimit,
    fibraHistoricoOffset: params.fibraHistoricoOffset,
    faturasLimit: params.faturasLimit,
    faturasOffset: params.faturasOffset,
    faturasStatus: params.faturasStatus,
    faturasOnlyOpen: params.faturasOnlyOpen,
    comodatosLimit: params.comodatosLimit,
    comodatosOffset: params.comodatosOffset,
    comodatosStatus: params.comodatosStatus,
  };

  return apiFetch<CustomerConsultationResponseDto>(
    `/api/v1/clientes/${encodeURIComponent(customerId)}/consulta`,
    {
      accessToken,
      signal,
      query,
    },
  );
}
