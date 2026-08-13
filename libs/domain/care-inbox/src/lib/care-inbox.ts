import {
  type CareInboxId,
  DomainError,
  DomainErrorCodes,
  assertNonEmpty,
  careInboxId,
} from '@gigahub/shared/kernel';
import { CARE_CHANNELS, type CareChannel } from './care-status';

export interface CareInboxSnapshot {
  id: CareInboxId;
  name: string;
  department?: string;
  channel: CareChannel;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateCareInboxInput = Omit<
  CareInboxSnapshot,
  'id' | 'createdAt' | 'updatedAt'
> & {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export class CareInbox {
  private constructor(private props: CareInboxSnapshot) {}

  static create(input: CreateCareInboxInput): CareInbox {
    if (!CARE_CHANNELS.includes(input.channel)) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        `Unknown care channel: ${String(input.channel)}`,
      );
    }
    const now = input.createdAt ?? new Date();
    return new CareInbox({
      id: careInboxId(input.id),
      name: assertNonEmpty(input.name, 'name'),
      department: input.department?.trim() || undefined,
      channel: input.channel,
      isActive: input.isActive,
      createdAt: now,
      updatedAt: input.updatedAt ?? now,
    });
  }

  static fromSnapshot(snapshot: CareInboxSnapshot): CareInbox {
    return new CareInbox({ ...snapshot });
  }

  get id(): CareInboxId {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get channel(): CareChannel {
    return this.props.channel;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  assertCanAcceptTickets(): void {
    if (!this.props.isActive) {
      throw new DomainError(
        DomainErrorCodes.InboxInactive,
        'Care inbox is inactive and cannot accept tickets',
        { inboxId: this.props.id },
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

  toSnapshot(): CareInboxSnapshot {
    return { ...this.props };
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}
