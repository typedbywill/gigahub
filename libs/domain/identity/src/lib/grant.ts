import {
  type GrantId,
  type RoleId,
  type UserId,
  DomainError,
  DomainErrorCodes,
  grantId,
  roleId,
  userId,
} from '@gigahub/shared/kernel';
import { type PermissionId, permissionId } from './permission';
import { MIN_GRANT_REASON_LENGTH } from './policies';

export type GrantKind = 'role' | 'permission';

interface GrantBaseSnapshot {
  id: GrantId;
  userId: UserId;
  grantedByUserId: UserId;
  reason?: string;
  expiresAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GrantRoleSnapshot extends GrantBaseSnapshot {
  kind: 'role';
  roleId: RoleId;
}

export interface GrantPermissionSnapshot extends GrantBaseSnapshot {
  kind: 'permission';
  permissionId: PermissionId;
}

export type GrantSnapshot = GrantRoleSnapshot | GrantPermissionSnapshot;

type CreateGrantBaseInput = {
  id: string;
  userId: string;
  grantedByUserId: string;
  reason?: string;
  expiresAt?: Date;
  revokedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

export type CreateGrantRoleInput = CreateGrantBaseInput & {
  roleId: string;
};

export type CreateGrantPermissionInput = CreateGrantBaseInput & {
  permissionId: string;
  reason: string;
};

function optionalReason(reason: string | undefined): string | undefined {
  if (reason === undefined) {
    return undefined;
  }
  const trimmed = reason.trim();
  return trimmed || undefined;
}

function requireGrantReason(reason: string | undefined): string {
  const trimmed = optionalReason(reason);
  if (!trimmed || trimmed.length < MIN_GRANT_REASON_LENGTH) {
    throw new DomainError(
      DomainErrorCodes.GrantReasonRequired,
      `Direct permission grant requires a reason of at least ${MIN_GRANT_REASON_LENGTH} characters`,
      { minLength: MIN_GRANT_REASON_LENGTH },
    );
  }
  return trimmed;
}

function isEffectiveAt(
  props: Pick<GrantBaseSnapshot, 'revokedAt' | 'expiresAt'>,
  at: Date,
): boolean {
  if (props.revokedAt) {
    return false;
  }
  if (props.expiresAt && props.expiresAt.getTime() <= at.getTime()) {
    return false;
  }
  return true;
}

abstract class GrantBase<TSnapshot extends GrantBaseSnapshot> {
  protected constructor(protected props: TSnapshot) {}

  get id(): GrantId {
    return this.props.id;
  }

  get userId(): UserId {
    return this.props.userId;
  }

  get grantedByUserId(): UserId {
    return this.props.grantedByUserId;
  }

  get reason(): string | undefined {
    return this.props.reason;
  }

  get expiresAt(): Date | undefined {
    return this.props.expiresAt;
  }

  get revokedAt(): Date | undefined {
    return this.props.revokedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  isEffective(at: Date = new Date()): boolean {
    return isEffectiveAt(this.props, at);
  }

  assertEffective(at: Date = new Date()): void {
    if (!this.isEffective(at)) {
      throw new DomainError(
        DomainErrorCodes.GrantNotActive,
        'Grant is not effective',
        {
          grantId: this.props.id,
          revokedAt: this.props.revokedAt,
          expiresAt: this.props.expiresAt,
          at,
        },
      );
    }
  }

  revoke(at: Date = new Date()): void {
    if (this.props.revokedAt) {
      return;
    }
    this.props.revokedAt = at;
    this.props.updatedAt = at;
  }
}

export class GrantRole extends GrantBase<GrantRoleSnapshot> {
  static create(input: CreateGrantRoleInput): GrantRole {
    const now = input.createdAt ?? new Date();
    return GrantRole.fromSnapshot({
      kind: 'role',
      id: grantId(input.id),
      userId: userId(input.userId),
      roleId: roleId(input.roleId),
      grantedByUserId: userId(input.grantedByUserId),
      reason: optionalReason(input.reason),
      expiresAt: input.expiresAt,
      revokedAt: input.revokedAt,
      createdAt: now,
      updatedAt: input.updatedAt ?? now,
    });
  }

  static fromSnapshot(snapshot: GrantRoleSnapshot): GrantRole {
    return new GrantRole({ ...snapshot });
  }

  get kind(): 'role' {
    return 'role';
  }

  get roleId(): RoleId {
    return this.props.roleId;
  }

  toSnapshot(): GrantRoleSnapshot {
    return { ...this.props };
  }
}

export class GrantPermission extends GrantBase<GrantPermissionSnapshot> {
  static create(input: CreateGrantPermissionInput): GrantPermission {
    const now = input.createdAt ?? new Date();
    return GrantPermission.fromSnapshot({
      kind: 'permission',
      id: grantId(input.id),
      userId: userId(input.userId),
      permissionId: permissionId(input.permissionId),
      grantedByUserId: userId(input.grantedByUserId),
      reason: requireGrantReason(input.reason),
      expiresAt: input.expiresAt,
      revokedAt: input.revokedAt,
      createdAt: now,
      updatedAt: input.updatedAt ?? now,
    });
  }

  static fromSnapshot(snapshot: GrantPermissionSnapshot): GrantPermission {
    return new GrantPermission({
      ...snapshot,
      permissionId: permissionId(snapshot.permissionId),
    });
  }

  get kind(): 'permission' {
    return 'permission';
  }

  get permissionId(): PermissionId {
    return this.props.permissionId;
  }

  toSnapshot(): GrantPermissionSnapshot {
    return { ...this.props };
  }
}
