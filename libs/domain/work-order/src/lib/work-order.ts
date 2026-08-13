import {
  type CustomerId,
  type GeoPoint,
  type SubjectId,
  type UserId,
  type WorkOrderId,
  DomainError,
  DomainErrorCodes,
  assertNonEmpty,
  customerId,
  isWithinRadius,
  subjectId,
  userId,
  workOrderId,
} from '@gigahub/shared/kernel';
import {
  ALLOWED_STATUS_TRANSITIONS,
  EXECUTION_REASON_MIN_LENGTH,
  FIELD_WORK_STATUSES,
  GEOFENCE_RADIUS_METERS,
  WORK_ORDER_STATUSES,
  type WorkOrderStatus,
} from './work-order-status';

export interface WorkOrderSnapshot {
  id: WorkOrderId;
  idErp: string;
  status: WorkOrderStatus;
  customerId: CustomerId;
  technicianId?: UserId;
  subjectId?: SubjectId;
  location?: GeoPoint;
  scheduledAt?: Date;
  estimatedDurationMinutes?: number;
  executionReason?: string;
  completionRequestedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateWorkOrderInput = Omit<
  WorkOrderSnapshot,
  'id' | 'customerId' | 'technicianId' | 'subjectId' | 'createdAt' | 'updatedAt'
> & {
  id: string;
  customerId: string;
  technicianId?: string;
  subjectId?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export class WorkOrder {
  private constructor(private props: WorkOrderSnapshot) {}

  static create(input: CreateWorkOrderInput): WorkOrder {
    const now = input.createdAt ?? new Date();
    return WorkOrder.fromSnapshot({
      id: workOrderId(input.id),
      idErp: assertNonEmpty(input.idErp, 'idErp'),
      status: input.status,
      customerId: customerId(input.customerId),
      technicianId: input.technicianId
        ? userId(input.technicianId)
        : undefined,
      subjectId: input.subjectId ? subjectId(input.subjectId) : undefined,
      location: input.location,
      scheduledAt: input.scheduledAt,
      estimatedDurationMinutes: input.estimatedDurationMinutes,
      executionReason: input.executionReason,
      completionRequestedAt: input.completionRequestedAt,
      createdAt: now,
      updatedAt: input.updatedAt ?? now,
    });
  }

  static fromSnapshot(snapshot: WorkOrderSnapshot): WorkOrder {
    if (!WORK_ORDER_STATUSES.includes(snapshot.status)) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        `Unknown work order status: ${String(snapshot.status)}`,
      );
    }
    return new WorkOrder({ ...snapshot });
  }

  get id(): WorkOrderId {
    return this.props.id;
  }

  get status(): WorkOrderStatus {
    return this.props.status;
  }

  get customerId(): CustomerId {
    return this.props.customerId;
  }

  get location(): GeoPoint | undefined {
    return this.props.location;
  }

  get completionRequestedAt(): Date | undefined {
    return this.props.completionRequestedAt;
  }

  isInFieldFlow(): boolean {
    return FIELD_WORK_STATUSES.includes(this.props.status);
  }

  isWithinGeofence(
    technicianLocation: GeoPoint,
    radiusMeters = GEOFENCE_RADIUS_METERS,
  ): boolean {
    if (!this.props.location) {
      return false;
    }
    return isWithinRadius(
      technicianLocation,
      this.props.location,
      radiusMeters,
    );
  }

  startDisplacement(): void {
    this.transitionTo('DS');
  }

  startExecution(input: {
    estimatedDurationMinutes: number;
    reason: string;
  }): void {
    if (input.estimatedDurationMinutes <= 0) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        'Estimated duration must be greater than 0 minutes',
      );
    }
    const reason = assertNonEmpty(input.reason, 'reason');
    if (reason.length < EXECUTION_REASON_MIN_LENGTH) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        `Execution reason must have at least ${EXECUTION_REASON_MIN_LENGTH} characters`,
      );
    }
    this.transitionTo('EX');
    this.props.estimatedDurationMinutes = input.estimatedDurationMinutes;
    this.props.executionReason = reason;
  }

  requestCompletion(technicianLocation: GeoPoint): void {
    if (this.props.status !== 'EX') {
      this.failTransition('EX');
    }
    if (!this.isWithinGeofence(technicianLocation)) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        `Technician must be within ${GEOFENCE_RADIUS_METERS} m of the work order`,
        { workOrderId: this.props.id },
      );
    }
    this.props.completionRequestedAt = new Date();
    this.touch();
  }

  completeFromReview(): void {
    if (!this.props.completionRequestedAt) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        'Work order completion was not requested',
      );
    }
    this.transitionTo('F');
  }

  reschedule(): void {
    this.transitionTo('RAG');
  }

  returnToSchedule(): void {
    this.transitionTo('AG');
  }

  toSnapshot(): WorkOrderSnapshot {
    return { ...this.props };
  }

  private transitionTo(next: WorkOrderStatus): void {
    const allowed = ALLOWED_STATUS_TRANSITIONS[this.props.status];
    if (!allowed.includes(next)) {
      this.failTransition(next);
    }
    this.props.status = next;
    this.touch();
  }

  private failTransition(next: WorkOrderStatus): never {
    throw new DomainError(
      DomainErrorCodes.InvalidStatusTransition,
      `Cannot transition work order from ${this.props.status} to ${next}`,
      { from: this.props.status, to: next, workOrderId: this.props.id },
    );
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}
