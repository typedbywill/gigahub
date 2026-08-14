import {
  type CustomerId,
  type DemandId,
  type DemandQueueId,
  type SubjectId,
  type UserId,
  DomainError,
  DomainErrorCodes,
  assertNonEmpty,
  customerId,
  demandId,
  demandQueueId,
  subjectId,
  userId,
} from '@gigahub/shared/kernel';
import {
  ALLOWED_DEMAND_TRANSITIONS,
  DEMAND_STATUSES,
  type DemandStatus,
} from './demand-status';
import { DemandQueue } from './demand-queue';
import { Subject } from './subject';

export interface DemandSnapshot {
  id: DemandId;
  queueId: DemandQueueId;
  subjectId: SubjectId;
  title: string;
  values: Record<string, unknown>;
  customerIds: CustomerId[];
  openedByUserId: UserId;
  status: DemandStatus;
  assignedAgentId?: UserId;
  openedAt: Date;
  updatedAt: Date;
}

export type CreateDemandInput = {
  id: string;
  queueId?: string;
  subjectId: string;
  title: string;
  values?: Record<string, unknown>;
  customerIds?: string[];
  openedByUserId: string;
  status?: DemandStatus;
  assignedAgentId?: string;
  openedAt?: Date;
  updatedAt?: Date;
};

export class Demand {
  private constructor(private props: DemandSnapshot) {}

  static open(
    input: CreateDemandInput,
    subject: Subject,
    queue: DemandQueue,
  ): Demand {
    subject.assertCanAcceptDemands();
    queue.assertCanAcceptDemands();

    if (input.subjectId !== subject.id) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        'Demand subjectId must match the target subject',
        { inputSubjectId: input.subjectId, subjectId: subject.id },
      );
    }

    const resolvedQueueId = input.queueId ?? subject.defaultQueueId ?? queue.id;
    if (resolvedQueueId !== queue.id) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        'Demand queueId must match the target queue',
        { demandQueueId: resolvedQueueId, queueId: queue.id },
      );
    }

    const values = input.values ?? {};
    subject.validateValues(values);

    const initialStatus =
      input.status ??
      (input.assignedAgentId ? 'in_progress' : 'queued');

    const now = input.openedAt ?? new Date();

    return Demand.fromSnapshot({
      id: demandId(input.id),
      queueId: demandQueueId(queue.id),
      subjectId: subjectId(subject.id),
      title: assertNonEmpty(input.title, 'title'),
      values: { ...values },
      customerIds: (input.customerIds ?? []).map((cid) => customerId(cid)),
      openedByUserId: userId(input.openedByUserId),
      status: initialStatus,
      assignedAgentId: input.assignedAgentId
        ? userId(input.assignedAgentId)
        : undefined,
      openedAt: now,
      updatedAt: input.updatedAt ?? now,
    });
  }

  static fromSnapshot(snapshot: DemandSnapshot): Demand {
    if (!DEMAND_STATUSES.includes(snapshot.status)) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        `Unknown demand status: ${String(snapshot.status)}`,
      );
    }
    return new Demand({
      ...snapshot,
      values: { ...snapshot.values },
      customerIds: [...snapshot.customerIds],
    });
  }

  get id(): DemandId {
    return this.props.id;
  }

  get queueId(): DemandQueueId {
    return this.props.queueId;
  }

  get subjectId(): SubjectId {
    return this.props.subjectId;
  }

  get title(): string {
    return this.props.title;
  }

  get values(): Readonly<Record<string, unknown>> {
    return this.props.values;
  }

  get customerIds(): readonly CustomerId[] {
    return this.props.customerIds;
  }

  get openedByUserId(): UserId {
    return this.props.openedByUserId;
  }

  get status(): DemandStatus {
    return this.props.status;
  }

  get assignedAgentId(): UserId | undefined {
    return this.props.assignedAgentId;
  }

  get openedAt(): Date {
    return this.props.openedAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  claim(agentId: string): void {
    if (this.props.status !== 'queued' && this.props.status !== 'open') {
      throw new DomainError(
        DomainErrorCodes.DemandNotAssignable,
        `Only queued demands can be claimed (current status: ${this.props.status})`,
        { demandId: this.props.id, status: this.props.status },
      );
    }
    this.props.assignedAgentId = userId(agentId);
    this.transitionTo('in_progress');
  }

  assign(agentId: string, queue?: DemandQueue): void {
    if (queue) {
      queue.assertCanAcceptDemands();
      if (this.props.queueId !== queue.id) {
        throw new DomainError(
          DomainErrorCodes.DemandNotAssignable,
          'Demand does not belong to this queue',
          { demandId: this.props.id, queueId: queue.id },
        );
      }
    }
    if (this.props.status === 'closed') {
      throw new DomainError(
        DomainErrorCodes.DemandNotAssignable,
        'Closed demands cannot be assigned',
        { demandId: this.props.id },
      );
    }
    this.props.assignedAgentId = userId(agentId);
    if (this.props.status === 'open' || this.props.status === 'queued') {
      this.transitionTo('in_progress');
    } else {
      this.touch();
    }
  }

  transferTo(queue: DemandQueue): void {
    queue.assertCanAcceptDemands();
    this.props.queueId = queue.id;
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

  updateValues(values: Record<string, unknown>, subject: Subject): void {
    if (subject.id !== this.props.subjectId) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        'Subject mismatch for updating values',
        { currentSubjectId: this.props.subjectId, providedSubjectId: subject.id },
      );
    }
    subject.validateValues(values);
    this.props.values = { ...values };
    this.touch();
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

  toSnapshot(): DemandSnapshot {
    return {
      ...this.props,
      values: { ...this.props.values },
      customerIds: [...this.props.customerIds],
    };
  }

  private transitionTo(next: DemandStatus): void {
    const allowed = ALLOWED_DEMAND_TRANSITIONS[this.props.status];
    if (!allowed.includes(next)) {
      throw new DomainError(
        DomainErrorCodes.InvalidStatusTransition,
        `Cannot transition demand from ${this.props.status} to ${next}`,
        { from: this.props.status, to: next, demandId: this.props.id },
      );
    }
    this.props.status = next;
    this.touch();
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}
