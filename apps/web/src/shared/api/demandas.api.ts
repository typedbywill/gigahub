import type {
  AssignDemandInputDto,
  DemandDto,
  OpenDemandInputDto,
  TransferDemandInputDto,
  UpdateDemandValuesInputDto,
} from '@gigahub/shared/contracts';
import { apiFetch } from './http';

export interface ListDemandsParams {
  view?: 'mine' | 'queue' | 'claimed' | 'all';
  status?: string;
  subjectId?: string;
  queueId?: string;
  customerId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedDemandsResponse {
  items: DemandDto[];
  total: number;
}

export interface DemandCountsResponse {
  inbox: number;
  queue: number;
  claimed: number;
  all: number;
}

export function listDemandsRequest(
  accessToken: string,
  params: ListDemandsParams = {},
  signal?: AbortSignal,
): Promise<PaginatedDemandsResponse> {
  return apiFetch<PaginatedDemandsResponse>('/api/v1/demands', {
    accessToken,
    signal,
    query: {
      view: params.view,
      status: params.status,
      subjectId: params.subjectId,
      queueId: params.queueId,
      customerId: params.customerId,
      q: params.q,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    },
  });
}

export function getDemandCountsRequest(
  accessToken: string,
  signal?: AbortSignal,
): Promise<DemandCountsResponse> {
  return apiFetch<DemandCountsResponse>('/api/v1/demands/counts', {
    accessToken,
    signal,
  });
}

export function getDemandRequest(
  accessToken: string,
  id: string,
  signal?: AbortSignal,
): Promise<DemandDto> {
  return apiFetch<DemandDto>(`/api/v1/demands/${encodeURIComponent(id)}`, {
    accessToken,
    signal,
  });
}

export function openDemandRequest(
  accessToken: string,
  body: OpenDemandInputDto,
): Promise<DemandDto> {
  return apiFetch<DemandDto>('/api/v1/demands', {
    method: 'POST',
    accessToken,
    body,
  });
}

export function claimDemandRequest(
  accessToken: string,
  id: string,
): Promise<DemandDto> {
  return apiFetch<DemandDto>(
    `/api/v1/demands/${encodeURIComponent(id)}/claim`,
    {
      method: 'POST',
      accessToken,
    },
  );
}

export function assignDemandRequest(
  accessToken: string,
  id: string,
  body: AssignDemandInputDto,
): Promise<DemandDto> {
  return apiFetch<DemandDto>(
    `/api/v1/demands/${encodeURIComponent(id)}/assign`,
    {
      method: 'POST',
      accessToken,
      body,
    },
  );
}

export function transferDemandRequest(
  accessToken: string,
  id: string,
  body: TransferDemandInputDto,
): Promise<DemandDto> {
  return apiFetch<DemandDto>(
    `/api/v1/demands/${encodeURIComponent(id)}/transfer`,
    {
      method: 'POST',
      accessToken,
      body,
    },
  );
}

export function resolveDemandRequest(
  accessToken: string,
  id: string,
): Promise<DemandDto> {
  return apiFetch<DemandDto>(
    `/api/v1/demands/${encodeURIComponent(id)}/resolve`,
    {
      method: 'POST',
      accessToken,
    },
  );
}

export function closeDemandRequest(
  accessToken: string,
  id: string,
): Promise<DemandDto> {
  return apiFetch<DemandDto>(
    `/api/v1/demands/${encodeURIComponent(id)}/close`,
    {
      method: 'POST',
      accessToken,
    },
  );
}

export function reopenDemandRequest(
  accessToken: string,
  id: string,
): Promise<DemandDto> {
  return apiFetch<DemandDto>(
    `/api/v1/demands/${encodeURIComponent(id)}/reopen`,
    {
      method: 'POST',
      accessToken,
    },
  );
}

export function updateDemandValuesRequest(
  accessToken: string,
  id: string,
  body: UpdateDemandValuesInputDto,
): Promise<DemandDto> {
  return apiFetch<DemandDto>(
    `/api/v1/demands/${encodeURIComponent(id)}/values`,
    {
      method: 'PATCH',
      accessToken,
      body,
    },
  );
}
