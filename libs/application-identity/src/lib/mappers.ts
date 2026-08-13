import type {
  PublicUserDto,
  UserDetailDto,
  UserListItemDto,
} from '@gigahub/shared/contracts';
import type { User } from '@gigahub/domain/identity';

export function toPublicUserDto(user: User): PublicUserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    status: user.status,
    idErp: user.idErp,
    idErpEmployee: user.idErpEmployee,
    jobTitle: user.jobTitle,
  };
}

export function toUserListItemDto(user: User): UserListItemDto {
  const snap = user.toSnapshot();
  return {
    ...toPublicUserDto(user),
    createdAt: snap.createdAt.toISOString(),
    updatedAt: snap.updatedAt.toISOString(),
  };
}

export function toUserDetailDto(user: User): UserDetailDto {
  return {
    ...toUserListItemDto(user),
    cashboxId: user.cashboxId,
    warehouseId: user.warehouseId,
    planningId: user.planningId,
  };
}
