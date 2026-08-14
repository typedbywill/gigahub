import type {
  CreateDemandQueueInputDto,
  CreateSubjectInputDto,
  DemandQueueDto,
  DemandSubjectDto,
  UpdateSubjectInputDto,
} from '@gigahub/shared/contracts';
import { apiFetch } from './http';

export function listSubjectsRequest(
  accessToken: string,
  activeOnly?: boolean,
  signal?: AbortSignal,
): Promise<DemandSubjectDto[]> {
  return apiFetch<DemandSubjectDto[]>('/api/v1/subjects', {
    accessToken,
    signal,
    query: {
      activeOnly: activeOnly ? 'true' : undefined,
    },
  });
}

export function getSubjectRequest(
  accessToken: string,
  id: string,
  signal?: AbortSignal,
): Promise<DemandSubjectDto> {
  return apiFetch<DemandSubjectDto>(
    `/api/v1/subjects/${encodeURIComponent(id)}`,
    {
      accessToken,
      signal,
    },
  );
}

export function createSubjectRequest(
  accessToken: string,
  body: CreateSubjectInputDto,
): Promise<DemandSubjectDto> {
  return apiFetch<DemandSubjectDto>('/api/v1/subjects', {
    method: 'POST',
    accessToken,
    body,
  });
}

export function updateSubjectRequest(
  accessToken: string,
  id: string,
  body: UpdateSubjectInputDto,
): Promise<DemandSubjectDto> {
  return apiFetch<DemandSubjectDto>(
    `/api/v1/subjects/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      accessToken,
      body,
    },
  );
}

export function listDemandQueuesRequest(
  accessToken: string,
  activeOnly?: boolean,
  signal?: AbortSignal,
): Promise<DemandQueueDto[]> {
  return apiFetch<DemandQueueDto[]>('/api/v1/demand-queues', {
    accessToken,
    signal,
    query: {
      activeOnly: activeOnly ? 'true' : undefined,
    },
  });
}

export function createDemandQueueRequest(
  accessToken: string,
  body: CreateDemandQueueInputDto,
): Promise<DemandQueueDto> {
  return apiFetch<DemandQueueDto>('/api/v1/demand-queues', {
    method: 'POST',
    accessToken,
    body,
  });
}
