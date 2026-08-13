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
  createdAt: Date;
  updatedAt: Date;
}

export type CreateUserInput = Omit<UserSnapshot, 'id' | 'createdAt' | 'updatedAt'> & {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
};

function normalizeEmail(email: string): string {
  return assertNonEmpty(email, 'email').toLowerCase();
}

export class User {
  private constructor(private props: UserSnapshot) {}

  static create(input: CreateUserInput): User {
    const now = input.createdAt ?? new Date();
    return User.fromSnapshot({
      id: userId(input.id),
      email: normalizeEmail(input.email),
      name: assertNonEmpty(input.name, 'name'),
      status: input.status,
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

  toSnapshot(): UserSnapshot {
    return { ...this.props };
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}
