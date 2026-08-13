import {
  type UserId,
  DomainError,
  DomainErrorCodes,
  assertNonEmpty,
  userId,
} from '@gigahub/shared/kernel';

export const USER_STATUSES = ['active', 'blocked'] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export interface UserSnapshot {
  id: UserId;
  email: string;
  name: string;
  status: UserStatus;
  authorizationVersion: number;
  idErp?: string;
  idErpEmployee?: string;
  jobTitle?: string;
  cashboxId?: string;
  warehouseId?: string;
  planningId?: string;
  avatarObjectKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateUserInput = Omit<
  UserSnapshot,
  'id' | 'createdAt' | 'updatedAt' | 'authorizationVersion'
> & {
  id: string;
  authorizationVersion?: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export interface LinkErpInput {
  idErp: string;
  idErpEmployee: string;
}

export interface SyncProfessionalProfileInput {
  name?: string;
  jobTitle?: string;
  cashboxId?: string;
  warehouseId?: string;
  planningId?: string;
}

function normalizeEmail(email: string): string {
  return assertNonEmpty(email, 'email').toLowerCase();
}

function optionalNonEmpty(value: string | undefined, label: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? assertNonEmpty(trimmed, label) : undefined;
}

export class User {
  private constructor(private props: UserSnapshot) {}

  static create(input: CreateUserInput): User {
    const now = input.createdAt ?? new Date();
    const idErp = optionalNonEmpty(input.idErp, 'idErp');
    const idErpEmployee = optionalNonEmpty(input.idErpEmployee, 'idErpEmployee');
    if ((idErp && !idErpEmployee) || (!idErp && idErpEmployee)) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        'idErp and idErpEmployee must both be set or both omitted',
      );
    }
    return User.fromSnapshot({
      id: userId(input.id),
      email: normalizeEmail(input.email),
      name: assertNonEmpty(input.name, 'name'),
      status: input.status,
      authorizationVersion: input.authorizationVersion ?? 0,
      idErp,
      idErpEmployee,
      jobTitle: optionalNonEmpty(input.jobTitle, 'jobTitle'),
      cashboxId: optionalNonEmpty(input.cashboxId, 'cashboxId'),
      warehouseId: optionalNonEmpty(input.warehouseId, 'warehouseId'),
      planningId: optionalNonEmpty(input.planningId, 'planningId'),
      avatarObjectKey: optionalNonEmpty(input.avatarObjectKey, 'avatarObjectKey'),
      createdAt: now,
      updatedAt: input.updatedAt ?? now,
    });
  }

  static fromSnapshot(snapshot: UserSnapshot): User {
    if (!USER_STATUSES.includes(snapshot.status)) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        `Unknown user status: ${String(snapshot.status)}`,
      );
    }
    if (
      !Number.isInteger(snapshot.authorizationVersion) ||
      snapshot.authorizationVersion < 0
    ) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        'authorizationVersion must be a non-negative integer',
        { authorizationVersion: snapshot.authorizationVersion },
      );
    }
    const hasIdErp = Boolean(snapshot.idErp);
    const hasIdErpEmployee = Boolean(snapshot.idErpEmployee);
    if (hasIdErp !== hasIdErpEmployee) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        'idErp and idErpEmployee must both be set or both omitted',
      );
    }
    return new User({ ...snapshot });
  }

  get id(): UserId {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get name(): string {
    return this.props.name;
  }

  get status(): UserStatus {
    return this.props.status;
  }

  get authorizationVersion(): number {
    return this.props.authorizationVersion;
  }

  get idErp(): string | undefined {
    return this.props.idErp;
  }

  get idErpEmployee(): string | undefined {
    return this.props.idErpEmployee;
  }

  get jobTitle(): string | undefined {
    return this.props.jobTitle;
  }

  get cashboxId(): string | undefined {
    return this.props.cashboxId;
  }

  get warehouseId(): string | undefined {
    return this.props.warehouseId;
  }

  get planningId(): string | undefined {
    return this.props.planningId;
  }

  get avatarObjectKey(): string | undefined {
    return this.props.avatarObjectKey;
  }

  hasErpLink(): boolean {
    return Boolean(this.props.idErp && this.props.idErpEmployee);
  }

  isActive(): boolean {
    return this.props.status === 'active';
  }

  assertCanAuthenticate(): void {
    if (!this.isActive()) {
      throw new DomainError(
        DomainErrorCodes.UserCannotAuthenticate,
        'User cannot authenticate',
        { userId: this.props.id, status: this.props.status },
      );
    }
  }

  block(): void {
    this.props.status = 'blocked';
    this.touch();
  }

  activate(): void {
    this.props.status = 'active';
    this.touch();
  }

  rename(name: string): void {
    this.props.name = assertNonEmpty(name, 'name');
    this.touch();
  }

  changeEmail(email: string): void {
    this.props.email = normalizeEmail(email);
    this.touch();
  }

  linkErp(input: LinkErpInput): void {
    this.props.idErp = assertNonEmpty(input.idErp, 'idErp');
    this.props.idErpEmployee = assertNonEmpty(input.idErpEmployee, 'idErpEmployee');
    this.touch();
  }

  unlinkErp(): void {
    this.props.idErp = undefined;
    this.props.idErpEmployee = undefined;
    this.touch();
  }

  syncProfessionalProfile(input: SyncProfessionalProfileInput): void {
    if (input.name !== undefined) {
      this.props.name = assertNonEmpty(input.name, 'name');
    }
    if (input.jobTitle !== undefined) {
      this.props.jobTitle = optionalNonEmpty(input.jobTitle, 'jobTitle');
    }
    if (input.cashboxId !== undefined) {
      this.props.cashboxId = optionalNonEmpty(input.cashboxId, 'cashboxId');
    }
    if (input.warehouseId !== undefined) {
      this.props.warehouseId = optionalNonEmpty(input.warehouseId, 'warehouseId');
    }
    if (input.planningId !== undefined) {
      this.props.planningId = optionalNonEmpty(input.planningId, 'planningId');
    }
    this.touch();
  }

  applyErpActive(active: boolean): void {
    if (active) {
      this.activate();
    } else {
      this.block();
    }
  }

  bumpAuthorizationVersion(): void {
    this.props.authorizationVersion += 1;
    this.touch();
  }

  setAvatar(objectKey: string): void {
    this.props.avatarObjectKey = assertNonEmpty(objectKey, 'avatarObjectKey');
    this.touch();
  }

  clearAvatar(): void {
    this.props.avatarObjectKey = undefined;
    this.touch();
  }

  toSnapshot(): UserSnapshot {
    return { ...this.props };
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}
