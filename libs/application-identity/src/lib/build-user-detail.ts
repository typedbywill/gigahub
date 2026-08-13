import type { Role, User } from '@gigahub/domain/identity';
import type { UserDetailDto } from '@gigahub/shared/contracts';
import type {
  GrantRepository,
  ObjectStoragePort,
  RoleRepository,
} from './ports';
import {
  resolveAvatarUrl,
  toRoleSummaryDto,
  toUserDetailDto,
} from './mappers';

export async function buildUserDetailDto(
  user: User,
  deps: {
    roles: RoleRepository;
    grants: GrantRepository;
    storage: ObjectStoragePort | null;
    avatarBucket: string;
  },
): Promise<UserDetailDto> {
  const [avatarUrl, roleGrants] = await Promise.all([
    resolveAvatarUrl(user, deps.storage, deps.avatarBucket),
    deps.grants.listRoleGrantsByUserId(user.id),
  ]);

  const effectiveGrants = roleGrants.filter((grant) => grant.isEffective());
  const roles: Role[] = [];
  for (const grant of effectiveGrants) {
    const role = await deps.roles.findById(grant.roleId);
    if (role && role.isActive()) {
      roles.push(role);
    }
  }

  return toUserDetailDto(user, {
    avatarUrl,
    roles: roles.map(toRoleSummaryDto),
  });
}
