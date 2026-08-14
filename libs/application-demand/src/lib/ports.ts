import type {
  Demand,
  DemandQueue,
  DemandStatus,
  Subject,
} from '@gigahub/domain/demand';
import type {
  DemandId,
  DemandQueueId,
  SubjectId,
  UserId,
} from '@gigahub/shared/kernel';

export interface DemandListQuery {
  view?: 'mine' | 'queue' | 'claimed' | 'all';
  status?: DemandStatus;
  subjectId?: string;
  queueId?: string;
  customerId?: string;
  q?: string;
  actorUserId?: UserId;
  page?: number;
  pageSize?: number;
}

export interface DemandListResult {
  items: Demand[];
  total: number;
}

export interface DemandCountsResult {
  inbox: number;
  queue: number;
  claimed: number;
  all: number;
}

export interface DemandRepository {
  findById(id: DemandId): Promise<Demand | null>;
  list(query: DemandListQuery): Promise<DemandListResult>;
  countByViews(actorUserId: UserId): Promise<DemandCountsResult>;
  save(demand: Demand): Promise<void>;
}

export interface DemandQueueRepository {
  findById(id: DemandQueueId): Promise<DemandQueue | null>;
  list(activeOnly?: boolean): Promise<DemandQueue[]>;
  save(queue: DemandQueue): Promise<void>;
}

export interface SubjectRepository {
  findById(id: SubjectId): Promise<Subject | null>;
  list(activeOnly?: boolean): Promise<Subject[]>;
  save(subject: Subject): Promise<void>;
}

export interface AccessPort {
  assertCan(actorUserId: UserId | string, permission: string): Promise<void>;
}

export interface EventPublisherPort {
  publish<T>(
    eventType: string,
    payload: T,
    actor?: { id: string; type: 'user' | 'system' },
  ): Promise<void>;
}

export interface IdGeneratorPort {
  generate(): string;
}

export class ApplicationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export const ApplicationErrorCodes = {
  NotFound: 'NOT_FOUND',
  PermissionDenied: 'PERMISSION_DENIED',
  ValidationError: 'VALIDATION_ERROR',
  Conflict: 'CONFLICT',
  InvariantViolation: 'INVARIANT_VIOLATION',
} as const;
