import {
  type CareInboxId,
  type CareTicketId,
  type CustomerId,
  type UserId,
  type WorkOrderId,
  DomainError,
  DomainErrorCodes,
  careInboxId,
  careTicketId,
  customerId,
  userId,
  workOrderId,
} from '@gigahub/shared/kernel';
import {
  ALLOWED_TICKET_TRANSITIONS,
  CARE_CHANNELS,
  CARE_TICKET_STATUSES,
  type CareChannel,
  type CareTicketStatus,
} from './care-status';
import { CareInbox } from './care-inbox';

export interface CareTicketSnapshot {
  id: CareTicketId;
  inboxId: CareInboxId;
  customerId?: CustomerId;
  workOrderId?: WorkOrderId;
  status: CareTicketStatus;
  channel: CareChannel;
  assignedAgentId?: UserId;
  externalId?: string;
  openedAt: Date;
  updatedAt: Date;
}

export type CreateCareTicketInput = Omit<
  CareTicketSnapshot,
  | 'id'
  | 'inboxId'
  | 'customerId'
  | 'workOrderId'
  | 'assignedAgentId'
  | 'openedAt'
  | 'updatedAt'
> & {
  id: string;
  inboxId: string;
  customerId?: string;
  workOrderId?: string;
  assignedAgentId?: string;
  openedAt?: Date;
  updatedAt?: Date;
};

export class CareTicket {
  private constructor(private props: CareTicketSnapshot) {}

  static open(input: CreateCareTicketInput, inbox: CareInbox): CareTicket {
    inbox.assertCanAcceptTickets();
    if (input.inboxId !== inbox.id) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        'Ticket inboxId must match the target inbox',
        { ticketInboxId: input.inboxId, inboxId: inbox.id },
      );
    }
    if (input.channel !== inbox.channel) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        'Ticket channel must match the inbox channel',
        { ticketChannel: input.channel, inboxChannel: inbox.channel },
      );
    }
    const now = input.openedAt ?? new Date();
    return CareTicket.fromSnapshot({
      id: careTicketId(input.id),
      inboxId: careInboxId(input.inboxId),
      customerId: input.customerId ? customerId(input.customerId) : undefined,
      workOrderId: input.workOrderId
        ? workOrderId(input.workOrderId)
        : undefined,
      status: input.status,
      channel: input.channel,
      assignedAgentId: input.assignedAgentId
        ? userId(input.assignedAgentId)
        : undefined,
      externalId: input.externalId,
      openedAt: now,
      updatedAt: input.updatedAt ?? now,
    });
  }

  static fromSnapshot(snapshot: CareTicketSnapshot): CareTicket {
    if (!CARE_TICKET_STATUSES.includes(snapshot.status)) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        `Unknown care ticket status: ${String(snapshot.status)}`,
      );
    }
    if (!CARE_CHANNELS.includes(snapshot.channel)) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        `Unknown care channel: ${String(snapshot.channel)}`,
      );
    }
    return new CareTicket({ ...snapshot });
  }

  get id(): CareTicketId {
    return this.props.id;
  }

  get inboxId(): CareInboxId {
    return this.props.inboxId;
  }

  get status(): CareTicketStatus {
    return this.props.status;
  }

  get assignedAgentId(): UserId | undefined {
    return this.props.assignedAgentId;
  }

  enqueue(): void {
    this.transitionTo('queued');
  }

  assign(agentId: string, inbox: CareInbox): void {
    inbox.assertCanAcceptTickets();
    if (this.props.inboxId !== inbox.id) {
      throw new DomainError(
        DomainErrorCodes.TicketNotAssignable,
        'Ticket does not belong to this inbox',
        { ticketId: this.props.id, inboxId: inbox.id },
      );
    }
    if (this.props.status === 'closed') {
      throw new DomainError(
        DomainErrorCodes.TicketNotAssignable,
        'Closed tickets cannot be assigned',
        { ticketId: this.props.id },
      );
    }
    this.props.assignedAgentId = userId(agentId);
    if (this.props.status === 'open' || this.props.status === 'queued') {
      this.transitionTo('in_progress');
    } else {
      this.touch();
    }
  }

  transferTo(inbox: CareInbox): void {
    inbox.assertCanAcceptTickets();
    this.props.inboxId = inbox.id;
    this.props.channel = inbox.channel;
    this.props.assignedAgentId = undefined;
    if (
      this.props.status === 'in_progress' ||
      this.props.status === 'waiting'
    ) {
      this.transitionTo('queued');
    } else {
      this.touch();
    }
  }

  markWaiting(): void {
    this.transitionTo('waiting');
  }

  resolve(): void {
    this.transitionTo('resolved');
  }

  close(): void {
    this.transitionTo('closed');
  }

  reopen(): void {
    this.transitionTo('in_progress');
  }

  toSnapshot(): CareTicketSnapshot {
    return { ...this.props };
  }

  private transitionTo(next: CareTicketStatus): void {
    const allowed = ALLOWED_TICKET_TRANSITIONS[this.props.status];
    if (!allowed.includes(next)) {
      throw new DomainError(
        DomainErrorCodes.InvalidStatusTransition,
        `Cannot transition care ticket from ${this.props.status} to ${next}`,
        { from: this.props.status, to: next, ticketId: this.props.id },
      );
    }
    this.props.status = next;
    this.touch();
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}
