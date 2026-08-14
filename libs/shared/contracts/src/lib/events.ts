export interface DomainEventActor {
  id: string;
  type: 'user' | 'system';
}

export interface DomainEventEnvelope<
  TType extends string = string,
  TPayload = unknown,
> {
  eventId: string;
  eventType: TType;
  eventVersion: number;
  occurredAt: string;
  actor?: DomainEventActor;
  payload: TPayload;
}

export const DomainEventTypes = {
  WorkOrderDisplacementStarted: 'fieldwork.order.displacement.started',
  WorkOrderExecutionStarted: 'fieldwork.order.execution.started',
  WorkOrderCompletionRequested: 'fieldwork.order.completion.requested',
  WorkOrderCompleted: 'fieldwork.order.completed',
  DemandOpened: 'demand.opened',
  DemandClaimed: 'demand.claimed',
  DemandAssigned: 'demand.assigned',
  DemandTransferred: 'demand.transferred',
  DemandResolved: 'demand.resolved',
  DemandClosed: 'demand.closed',
  DemandReopened: 'demand.reopened',
  DemandValuesUpdated: 'demand.values.updated',
  // Backward-compat aliases if needed
  CareTicketAssigned: 'customer.care.ticket.assigned',
  CareTicketTransferred: 'customer.care.ticket.transferred',
  CareTicketResolved: 'customer.support.resolved',
} as const;

export type DomainEventType =
  (typeof DomainEventTypes)[keyof typeof DomainEventTypes];

export interface WorkOrderEventPayload {
  workOrderId: string;
  customerId: string;
  status: string;
}

export interface DemandEventPayload {
  demandId: string;
  queueId: string;
  subjectId: string;
  customerIds?: string[];
  assignedAgentId?: string;
  status: string;
}

export interface CareTicketEventPayload {
  ticketId: string;
  inboxId: string;
  customerId?: string;
  workOrderId?: string;
  assignedAgentId?: string;
}
