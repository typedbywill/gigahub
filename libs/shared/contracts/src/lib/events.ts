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

export interface CareTicketEventPayload {
  ticketId: string;
  inboxId: string;
  customerId?: string;
  workOrderId?: string;
  assignedAgentId?: string;
}
