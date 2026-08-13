import {
  type RoleId,
  DomainError,
  DomainErrorCodes,
  assertNonEmpty,
  roleId,
} from '@gigahub/shared/kernel';
import {
  type PermissionId,
  permissionId,
} from './permission';

export const ROLE_STATUSES = ['active', 'archived'] as const;

export type RoleStatus = (typeof ROLE_STATUSES)[number];

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface RoleSnapshot {
  id: RoleId;
  slug: string;
  name: string;
  permissionIds: PermissionId[];
  status: RoleStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateRoleInput = {
  id: string;
  slug: string;
  name: string;
  permissionIds?: string[];
  status?: RoleStatus;
  createdAt?: Date;
  updatedAt?: Date;
};

function normalizeSlug(slug: string): string {
  const normalized = assertNonEmpty(slug, 'slug').toLowerCase();
  if (!SLUG_PATTERN.test(normalized)) {
    throw new DomainError(
      DomainErrorCodes.InvariantViolation,
      'Role slug must be kebab-case',
      { slug: normalized },
    );
  }
  return normalized;
}

function normalizePermissionIds(ids: string[] | undefined): PermissionId[] {
  const resolved = (ids ?? []).map((id) => permissionId(id));
  return [...new Set(resolved)];
}

export class Role {
  private constructor(private props: RoleSnapshot) {}

  static create(input: CreateRoleInput): Role {
    const now = input.createdAt ?? new Date();
    return Role.fromSnapshot({
      id: roleId(input.id),
      slug: normalizeSlug(input.slug),
      name: assertNonEmpty(input.name, 'name'),
      permissionIds: normalizePermissionIds(input.permissionIds),
      status: input.status ?? 'active',
      createdAt: now,
      updatedAt: input.updatedAt ?? now,
    });
  }

  static fromSnapshot(snapshot: RoleSnapshot): Role {
    if (!ROLE_STATUSES.includes(snapshot.status)) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        `Unknown role status: ${String(snapshot.status)}`,
      );
    }
    return new Role({
      ...snapshot,
      permissionIds: [...snapshot.permissionIds],
    });
  }

  get id(): RoleId {
    return this.props.id;
  }

  get slug(): string {
    return this.props.slug;
  }

  get name(): string {
    return this.props.name;
  }

  get permissionIds(): readonly PermissionId[] {
    return this.props.permissionIds;
  }

  get status(): RoleStatus {
    return this.props.status;
  }

  isActive(): boolean {
    return this.props.status === 'active';
  }

  has(id: PermissionId | string): boolean {
    const resolved = typeof id === 'string' ? permissionId(id) : id;
    return this.props.permissionIds.includes(resolved);
  }

  assertAssignable(): void {
    if (!this.isActive()) {
      throw new DomainError(
        DomainErrorCodes.RoleNotAssignable,
        'Archived role cannot be assigned',
        { roleId: this.props.id, status: this.props.status },
      );
    }
  }

  rename(name: string): void {
    this.props.name = assertNonEmpty(name, 'name');
    this.touch();
  }

  replacePermissions(ids: string[]): void {
    this.props.permissionIds = normalizePermissionIds(ids);
    this.touch();
  }

  addPermission(id: string): void {
    const resolved = permissionId(id);
    if (!this.props.permissionIds.includes(resolved)) {
      this.props.permissionIds = [...this.props.permissionIds, resolved];
      this.touch();
    }
  }

  removePermission(id: string): void {
    const resolved = permissionId(id);
    const next = this.props.permissionIds.filter(
      (permission) => permission !== resolved,
    );
    if (next.length !== this.props.permissionIds.length) {
      this.props.permissionIds = next;
      this.touch();
    }
  }

  archive(): void {
    this.props.status = 'archived';
    this.touch();
  }

  activate(): void {
    this.props.status = 'active';
    this.touch();
  }

  toSnapshot(): RoleSnapshot {
    return {
      ...this.props,
      permissionIds: [...this.props.permissionIds],
    };
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}
