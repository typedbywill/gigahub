import {
  type DemandQueueId,
  DomainError,
  DomainErrorCodes,
  assertNonEmpty,
  demandQueueId,
} from '@gigahub/shared/kernel';

export interface DemandQueueSnapshot {
  id: DemandQueueId;
  name: string;
  department?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateDemandQueueInput = Omit<
  DemandQueueSnapshot,
  'id' | 'createdAt' | 'updatedAt'
> & {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export class DemandQueue {
  private constructor(private props: DemandQueueSnapshot) {}

  static create(input: CreateDemandQueueInput): DemandQueue {
    const now = input.createdAt ?? new Date();
    return new DemandQueue({
      id: demandQueueId(input.id),
      name: assertNonEmpty(input.name, 'name'),
      department: input.department?.trim() || undefined,
      description: input.description?.trim() || undefined,
      isActive: input.isActive,
      createdAt: now,
      updatedAt: input.updatedAt ?? now,
    });
  }

  static fromSnapshot(snapshot: DemandQueueSnapshot): DemandQueue {
    return new DemandQueue({ ...snapshot });
  }

  get id(): DemandQueueId {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get department(): string | undefined {
    return this.props.department;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  assertCanAcceptDemands(): void {
    if (!this.props.isActive) {
      throw new DomainError(
        DomainErrorCodes.QueueInactive,
        'Demand queue is inactive and cannot accept demands',
        { queueId: this.props.id },
      );
    }
  }

  deactivate(): void {
    this.props.isActive = false;
    this.touch();
  }

  activate(): void {
    this.props.isActive = true;
    this.touch();
  }

  toSnapshot(): DemandQueueSnapshot {
    return { ...this.props };
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}
