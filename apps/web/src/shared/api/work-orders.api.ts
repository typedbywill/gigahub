import type {
  AddWorkOrderMessageDto,
  CompleteWorkOrderDto,
  MyScheduleQueryDto,
  RescheduleWorkOrderDto,
  StartDisplacementDto,
  StartExecutionDto,
  WorkOrderDetailDto,
  WorkOrderListQueryDto,
  WorkOrderListResponseDto,
  WorkOrderSummaryDto,
} from '@gigahub/shared/contracts';
import { apiFetch } from './http';

export async function getMySchedule(
  accessToken: string,
  query?: MyScheduleQueryDto,
): Promise<WorkOrderSummaryDto[]> {
  return apiFetch<WorkOrderSummaryDto[]>('/api/v1/work-orders/minha-agenda', {
    accessToken,
    query: {
      date: query?.date,
      status: query?.status,
    },
  });
}

export async function listActiveWorkOrders(
  accessToken: string,
  onlyMine?: boolean,
): Promise<WorkOrderSummaryDto[]> {
  return apiFetch<WorkOrderSummaryDto[]>('/api/v1/work-orders/em-andamento', {
    accessToken,
    query: {
      onlyMine: onlyMine ? 'true' : undefined,
    },
  });
}

export async function listWorkOrders(
  accessToken: string,
  query: WorkOrderListQueryDto,
): Promise<WorkOrderListResponseDto> {
  return apiFetch<WorkOrderListResponseDto>('/api/v1/work-orders/todas', {
    accessToken,
    query: {
      page: query.page,
      limit: query.limit,
      status: query.status,
      q: query.q,
      technicianId: query.technicianId,
      customerId: query.customerId,
      startDate: query.startDate,
      endDate: query.endDate,
    },
  });
}

export async function getWorkOrderDetail(
  accessToken: string,
  id: string,
): Promise<WorkOrderDetailDto> {
  return apiFetch<WorkOrderDetailDto>(
    `/api/v1/work-orders/${encodeURIComponent(id)}`,
    {
      accessToken,
    },
  );
}

export async function listCustomerWorkOrders(
  accessToken: string,
  customerId: string,
): Promise<WorkOrderSummaryDto[]> {
  return apiFetch<WorkOrderSummaryDto[]>(
    `/api/v1/work-orders/cliente/${encodeURIComponent(customerId)}`,
    {
      accessToken,
    },
  );
}

export async function startWorkOrderDisplacement(
  accessToken: string,
  id: string,
  body: StartDisplacementDto,
): Promise<{ success: boolean; status: string }> {
  return apiFetch<{ success: boolean; status: string }>(
    `/api/v1/work-orders/${encodeURIComponent(id)}/deslocamento`,
    {
      method: 'POST',
      accessToken,
      body,
    },
  );
}

export async function startWorkOrderExecution(
  accessToken: string,
  id: string,
  body: StartExecutionDto,
): Promise<{ success: boolean; status: string }> {
  return apiFetch<{ success: boolean; status: string }>(
    `/api/v1/work-orders/${encodeURIComponent(id)}/execucao`,
    {
      method: 'POST',
      accessToken,
      body,
    },
  );
}

export async function rescheduleWorkOrder(
  accessToken: string,
  id: string,
  body: RescheduleWorkOrderDto,
): Promise<{ success: boolean; status: string }> {
  return apiFetch<{ success: boolean; status: string }>(
    `/api/v1/work-orders/${encodeURIComponent(id)}/reagendar`,
    {
      method: 'POST',
      accessToken,
      body,
    },
  );
}

export async function completeWorkOrder(
  accessToken: string,
  id: string,
  body: CompleteWorkOrderDto,
): Promise<{ success: boolean; status: string }> {
  return apiFetch<{ success: boolean; status: string }>(
    `/api/v1/work-orders/${encodeURIComponent(id)}/finalizar`,
    {
      method: 'POST',
      accessToken,
      body,
    },
  );
}

export async function addWorkOrderMessage(
  accessToken: string,
  id: string,
  body: AddWorkOrderMessageDto,
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(
    `/api/v1/work-orders/${encodeURIComponent(id)}/mensagens`,
    {
      method: 'POST',
      accessToken,
      body,
    },
  );
}
