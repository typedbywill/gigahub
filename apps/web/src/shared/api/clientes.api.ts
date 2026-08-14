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
  const query: Record<string, string | string[] | number | undefined> = {
    include: params.include,
    contractId: params.contractId,
    fiberId: params.fiberId,
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
