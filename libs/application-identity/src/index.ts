export {
  ApplicationError,
  ApplicationErrorCodes,
  type UserRepository,
  type UserListQuery,
  type UserListResult,
  type RoleRepository,
  type GrantRepository,
  type ObjectStoragePort,
  type CredentialRepository,
  type SessionRepository,
  type ErpCollaborator,
  type ErpUserDirectory,
  type PasswordHasher,
  type TokenIssuer,
  type RefreshTokenService,
  type IdGenerator,
  type Clock,
  type AuthTokens,
} from './lib/ports';
export {
  toPublicUserDto,
  toUserListItemDto,
  toUserDetailDto,
  toRoleSummaryDto,
  resolveAvatarUrl,
} from './lib/mappers';
export { buildUserDetailDto } from './lib/build-user-detail';
export { LoginUseCase, type LoginCommand } from './lib/login.use-case';
export {
  RenewTokenUseCase,
  type RenewTokenCommand,
} from './lib/renew-token.use-case';
export {
  ChangePasswordUseCase,
  type ChangePasswordCommand,
} from './lib/change-password.use-case';
export {
  SyncUsersFromErpUseCase,
  type SyncUsersFromErpResult,
} from './lib/sync-users-from-erp.use-case';
export {
  ListUsersUseCase,
  type ListUsersCommand,
} from './lib/list-users.use-case';
export { GetUserUseCase, type GetUserCommand } from './lib/get-user.use-case';
export {
  InactivateUserUseCase,
  type InactivateUserCommand,
} from './lib/inactivate-user.use-case';
export {
  UpdateUserProfileUseCase,
  type UpdateUserProfileCommand,
} from './lib/update-user-profile.use-case';
export {
  SetUserAvatarUseCase,
  ClearUserAvatarUseCase,
  type SetUserAvatarCommand,
  type ClearUserAvatarCommand,
} from './lib/set-user-avatar.use-case';
export {
  SeedDefaultRolesUseCase,
  type SeedDefaultRolesResult,
} from './lib/seed-default-roles.use-case';
export {
  EnsureBootstrapAdminsUseCase,
  type EnsureBootstrapAdminsResult,
} from './lib/ensure-bootstrap-admins.use-case';
export { ListRolesUseCase } from './lib/list-roles.use-case';
export { ListPermissionsUseCase } from './lib/list-permissions.use-case';
export {
  CreateRoleUseCase,
  type CreateRoleCommand,
} from './lib/create-role.use-case';
export {
  ReplaceRolePermissionsUseCase,
  type ReplaceRolePermissionsCommand,
} from './lib/replace-role-permissions.use-case';
export {
  ReplaceUserRolesUseCase,
  type ReplaceUserRolesCommand,
} from './lib/replace-user-roles.use-case';
export { ResolveEffectiveAccess } from './lib/resolve-effective-access';
