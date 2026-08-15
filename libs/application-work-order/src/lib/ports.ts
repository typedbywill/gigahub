import type { GeoPoint } from '@gigahub/shared/kernel';
import type {
  MyScheduleQueryDto,
  WorkOrderDetailDto,
  WorkOrderListQueryDto,
  WorkOrderListResponseDto,
  WorkOrderSummaryDto,
} from '@gigahub/shared/contracts';

export interface ActorUser {
  userId: string;
  idErp?: string;
  idErpEmployee?: string;
  name: string;
  email?: string;
}

export interface WorkOrderQueryRepository {
  getMySchedule(
    actor: ActorUser,
    query: MyScheduleQueryDto,
  ): Promise<WorkOrderSummaryDto[]>;
  listActive(actor?: ActorUser): Promise<WorkOrderSummaryDto[]>;
  list(query: WorkOrderListQueryDto): Promise<WorkOrderListResponseDto>;
  findById(idOrIdErp: string): Promise<WorkOrderDetailDto | null>;
  listByCustomer(customerIdErp: string): Promise<WorkOrderSummaryDto[]>;
}

export interface WorkOrderCommandRepository {
  startDisplacement(
    idErp: string,
    technician: ActorUser,
    location?: GeoPoint,
  ): Promise<void>;
  startExecution(
    idErp: string,
    input: {
      technician: ActorUser;
      estimatedDurationMinutes: number;
      reason: string;
      location?: GeoPoint;
    },
  ): Promise<void>;
  reschedule(
    idErp: string,
    input: {
      technician: ActorUser;
      newDate: string;
      reason: string;
    },
  ): Promise<void>;
  complete(
    idErp: string,
    input: {
      technician: ActorUser;
      location: GeoPoint;
      reason?: string;
      answers?: Record<string, unknown>;
    },
  ): Promise<void>;
  addMessage(
    idErp: string,
    input: {
      authorName: string;
      message: string;
    },
  ): Promise<void>;
}

export interface UserLookupPort {
  findActorUser(userId: string): Promise<ActorUser | null>;
}

export interface AccessPort {
  assertCan(actorUserId: string, permission: string): Promise<void>;
}

export interface EventPublisherPort {
  publish<T>(
    eventType: string,
    payload: T,
    actor?: { id: string; type: 'user' | 'system' },
  ): Promise<void>;
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
  UserNotFound: 'USER_NOT_FOUND',
} as const;
