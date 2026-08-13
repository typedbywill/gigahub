import type {
  PublicUserDto,
  RoleSummaryDto,
  UserDetailDto,
  UserListItemDto,
} from '@gigahub/shared/contracts';
import type { Role, User } from '@gigahub/domain/identity';
import type { ObjectStoragePort } from './ports';

export function toPublicUserDto(
  user: User,
  options: {
    avatarUrl?: string;
    permissionIds?: readonly string[];
  } = {},
): PublicUserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    status: user.status,
    idErp: user.idErp,
    idErpEmployee: user.idErpEmployee,
    jobTitle: user.jobTitle,
    avatarUrl: options.avatarUrl,
    permissionIds: options.permissionIds ? [...options.permissionIds] : [],
  };
}

export function toUserListItemDto(
  user: User,
  avatarUrl?: string,
): UserListItemDto {
  const snap = user.toSnapshot();
  return {
    ...toPublicUserDto(user, { avatarUrl }),
    createdAt: snap.createdAt.toISOString(),
    updatedAt: snap.updatedAt.toISOString(),
  };
}

export function toRoleSummaryDto(role: Role): RoleSummaryDto {
  return {
    id: role.id,
    slug: role.slug,
    name: role.name,
  };
}

export function toUserDetailDto(
  user: User,
  options: {
    avatarUrl?: string;
    roles?: RoleSummaryDto[];
  } = {},
): UserDetailDto {
  return {
    ...toUserListItemDto(user, options.avatarUrl),
    cashboxId: user.cashboxId,
    warehouseId: user.warehouseId,
    planningId: user.planningId,
    roles: options.roles ?? [],
  };
}

export async function resolveAvatarUrl(
  user: User,
  storage: ObjectStoragePort | null,
  bucket: string,
): Promise<string | undefined> {
  const key = user.avatarObjectKey;
  if (!key || !storage) {
    return undefined;
  }
  return storage.getFileUrl(bucket, key);
}
