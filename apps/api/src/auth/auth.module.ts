import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import {
  ChangePasswordUseCase,
  ClearUserAvatarUseCase,
  CreateRoleUseCase,
  EnsureBootstrapAdminsUseCase,
  GetUserUseCase,
  GetUserAvatarUseCase,
  InactivateUserUseCase,
  ListPermissionsUseCase,
  ListRolesUseCase,
  ListUsersUseCase,
  LoginUseCase,
  RenewTokenUseCase,
  ReplaceRolePermissionsUseCase,
  ReplaceUserRolesUseCase,
  ResolveEffectiveAccess,
  SeedDefaultRolesUseCase,
  SetUserAvatarUseCase,
  SyncUsersFromErpUseCase,
  UpdateUserProfileUseCase,
  type ErpUserDirectory,
  type ObjectStoragePort,
} from '@gigahub/application-identity';
import { MysqlErpUserDirectory } from '@gigahub/adapters-ixc';
import type { EnvConfig } from '@gigahub/shared/config';
import { StorageModule } from '../storage/storage.module';
import { STORAGE_PORT } from '../storage/storage.port';
import { UserModel, UserSchema } from './persistence/user.schema';
import { CredentialModel, CredentialSchema } from './persistence/credential.schema';
import { SessionModel, SessionSchema } from './persistence/session.schema';
import { RoleModel, RoleSchema } from './persistence/role.schema';
import { GrantModel, GrantSchema } from './persistence/grant.schema';
import { MongoUserRepository } from './persistence/mongo-user.repository';
import { MongoCredentialRepository } from './persistence/mongo-credential.repository';
import { MongoSessionRepository } from './persistence/mongo-session.repository';
import { MongoRoleRepository } from './persistence/mongo-role.repository';
import { MongoGrantRepository } from './persistence/mongo-grant.repository';
import {
  Argon2PasswordHasher,
  CryptoRefreshTokenService,
  SystemClock,
  UuidGenerator,
} from './crypto/crypto.services';
import { JoseAccessTokenIssuer } from './crypto/jose-token.issuer';
import { AuthController } from './auth.controller';
import { UsersController } from './users.controller';
import { UserAvatarController } from './user-avatar.controller';
import { RolesController } from './roles.controller';
import { PermissionsController } from './permissions.controller';
import { AuthRolesBootstrapService } from './auth-roles-bootstrap.service';
import { SyncUsersScheduler } from './sync-users.scheduler';
import { AccessTokenGuard } from './access-token.guard';

export const ERP_USER_DIRECTORY = 'ERP_USER_DIRECTORY';
export const AVATAR_BUCKET = 'AVATAR_BUCKET';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    StorageModule,
    MongooseModule.forFeature([
      { name: UserModel.name, schema: UserSchema },
      { name: CredentialModel.name, schema: CredentialSchema },
      { name: SessionModel.name, schema: SessionSchema },
      { name: RoleModel.name, schema: RoleSchema },
      { name: GrantModel.name, schema: GrantSchema },
    ]),
  ],
  controllers: [
    AuthController,
    UsersController,
    UserAvatarController,
    RolesController,
    PermissionsController,
  ],
  providers: [
    MongoUserRepository,
    MongoCredentialRepository,
    MongoSessionRepository,
    MongoRoleRepository,
    MongoGrantRepository,
    Argon2PasswordHasher,
    CryptoRefreshTokenService,
    UuidGenerator,
    SystemClock,
    JoseAccessTokenIssuer,
    AccessTokenGuard,
    {
      provide: ResolveEffectiveAccess,
      useFactory: (
        roles: MongoRoleRepository,
        grants: MongoGrantRepository,
      ) => new ResolveEffectiveAccess(roles, grants),
      inject: [MongoRoleRepository, MongoGrantRepository],
    },
    {
      provide: AVATAR_BUCKET,
      useFactory: (config: ConfigService<EnvConfig, true>) =>
        config.get('MINIO_BUCKET', { infer: true }),
      inject: [ConfigService],
    },
    {
      provide: SeedDefaultRolesUseCase,
      useFactory: (roles: MongoRoleRepository, ids: UuidGenerator) =>
        new SeedDefaultRolesUseCase(roles, ids),
      inject: [MongoRoleRepository, UuidGenerator],
    },
    {
      provide: EnsureBootstrapAdminsUseCase,
      useFactory: (
        users: MongoUserRepository,
        roles: MongoRoleRepository,
        grants: MongoGrantRepository,
        ids: UuidGenerator,
        config: ConfigService<EnvConfig, true>,
      ) => {
        const raw = config.get('AUTH_BOOTSTRAP_ADMIN_ERP_IDS', { infer: true });
        const erpIds = raw
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
        return new EnsureBootstrapAdminsUseCase(
          users,
          roles,
          grants,
          ids,
          erpIds,
        );
      },
      inject: [
        MongoUserRepository,
        MongoRoleRepository,
        MongoGrantRepository,
        UuidGenerator,
        ConfigService,
      ],
    },
    AuthRolesBootstrapService,
    {
      provide: ERP_USER_DIRECTORY,
      useFactory: (config: ConfigService<EnvConfig, true>): ErpUserDirectory | null => {
        const user = config.get('IXC_DB_USER', { infer: true })?.trim();
        if (!user) {
          return null;
        }
        return new MysqlErpUserDirectory({
          host: config.get('IXC_DB_HOST', { infer: true }),
          port: config.get('IXC_DB_PORT', { infer: true }),
          user,
          password: config.get('IXC_DB_PASS', { infer: true }),
          database: config.get('IXC_DB_NAME', { infer: true }),
        });
      },
      inject: [ConfigService],
    },
    {
      provide: LoginUseCase,
      useFactory: (
        users: MongoUserRepository,
        credentials: MongoCredentialRepository,
        sessions: MongoSessionRepository,
        hasher: Argon2PasswordHasher,
        erp: ErpUserDirectory | null,
        tokens: JoseAccessTokenIssuer,
        refresh: CryptoRefreshTokenService,
        ids: UuidGenerator,
        clock: SystemClock,
        access: ResolveEffectiveAccess,
      ) =>
        new LoginUseCase(
          users,
          credentials,
          sessions,
          hasher,
          erp,
          tokens,
          refresh,
          ids,
          clock,
          access,
        ),
      inject: [
        MongoUserRepository,
        MongoCredentialRepository,
        MongoSessionRepository,
        Argon2PasswordHasher,
        ERP_USER_DIRECTORY,
        JoseAccessTokenIssuer,
        CryptoRefreshTokenService,
        UuidGenerator,
        SystemClock,
        ResolveEffectiveAccess,
      ],
    },
    {
      provide: RenewTokenUseCase,
      useFactory: (
        users: MongoUserRepository,
        sessions: MongoSessionRepository,
        tokens: JoseAccessTokenIssuer,
        refresh: CryptoRefreshTokenService,
        clock: SystemClock,
        access: ResolveEffectiveAccess,
      ) =>
        new RenewTokenUseCase(
          users,
          sessions,
          tokens,
          refresh,
          clock,
          access,
        ),
      inject: [
        MongoUserRepository,
        MongoSessionRepository,
        JoseAccessTokenIssuer,
        CryptoRefreshTokenService,
        SystemClock,
        ResolveEffectiveAccess,
      ],
    },
    {
      provide: ChangePasswordUseCase,
      useFactory: (
        users: MongoUserRepository,
        credentials: MongoCredentialRepository,
        sessions: MongoSessionRepository,
        hasher: Argon2PasswordHasher,
        erp: ErpUserDirectory | null,
        clock: SystemClock,
        access: ResolveEffectiveAccess,
      ) =>
        new ChangePasswordUseCase(
          users,
          credentials,
          sessions,
          hasher,
          erp,
          clock,
          access,
        ),
      inject: [
        MongoUserRepository,
        MongoCredentialRepository,
        MongoSessionRepository,
        Argon2PasswordHasher,
        ERP_USER_DIRECTORY,
        SystemClock,
        ResolveEffectiveAccess,
      ],
    },
    {
      provide: ListUsersUseCase,
      useFactory: (
        users: MongoUserRepository,
        access: ResolveEffectiveAccess,
        storage: ObjectStoragePort,
        bucket: string,
      ) => new ListUsersUseCase(users, access, storage, bucket),
      inject: [
        MongoUserRepository,
        ResolveEffectiveAccess,
        STORAGE_PORT,
        AVATAR_BUCKET,
      ],
    },
    {
      provide: GetUserUseCase,
      useFactory: (
        users: MongoUserRepository,
        roles: MongoRoleRepository,
        grants: MongoGrantRepository,
        access: ResolveEffectiveAccess,
        storage: ObjectStoragePort,
        bucket: string,
      ) => new GetUserUseCase(users, roles, grants, access, storage, bucket),
      inject: [
        MongoUserRepository,
        MongoRoleRepository,
        MongoGrantRepository,
        ResolveEffectiveAccess,
        STORAGE_PORT,
        AVATAR_BUCKET,
      ],
    },
    {
      provide: GetUserAvatarUseCase,
      useFactory: (
        users: MongoUserRepository,
        storage: ObjectStoragePort,
        bucket: string,
      ) => new GetUserAvatarUseCase(users, storage, bucket),
      inject: [MongoUserRepository, STORAGE_PORT, AVATAR_BUCKET],
    },
    {
      provide: InactivateUserUseCase,
      useFactory: (
        users: MongoUserRepository,
        sessions: MongoSessionRepository,
        erp: ErpUserDirectory | null,
        clock: SystemClock,
        roles: MongoRoleRepository,
        grants: MongoGrantRepository,
        access: ResolveEffectiveAccess,
        storage: ObjectStoragePort,
        bucket: string,
      ) =>
        new InactivateUserUseCase(
          users,
          sessions,
          erp,
          clock,
          roles,
          grants,
          access,
          storage,
          bucket,
        ),
      inject: [
        MongoUserRepository,
        MongoSessionRepository,
        ERP_USER_DIRECTORY,
        SystemClock,
        MongoRoleRepository,
        MongoGrantRepository,
        ResolveEffectiveAccess,
        STORAGE_PORT,
        AVATAR_BUCKET,
      ],
    },
    {
      provide: UpdateUserProfileUseCase,
      useFactory: (
        users: MongoUserRepository,
        roles: MongoRoleRepository,
        grants: MongoGrantRepository,
        access: ResolveEffectiveAccess,
        storage: ObjectStoragePort,
        bucket: string,
      ) =>
        new UpdateUserProfileUseCase(
          users,
          roles,
          grants,
          access,
          storage,
          bucket,
        ),
      inject: [
        MongoUserRepository,
        MongoRoleRepository,
        MongoGrantRepository,
        ResolveEffectiveAccess,
        STORAGE_PORT,
        AVATAR_BUCKET,
      ],
    },
    {
      provide: SetUserAvatarUseCase,
      useFactory: (
        users: MongoUserRepository,
        roles: MongoRoleRepository,
        grants: MongoGrantRepository,
        access: ResolveEffectiveAccess,
        storage: ObjectStoragePort,
        bucket: string,
        ids: UuidGenerator,
      ) =>
        new SetUserAvatarUseCase(
          users,
          roles,
          grants,
          access,
          storage,
          bucket,
          ids,
        ),
      inject: [
        MongoUserRepository,
        MongoRoleRepository,
        MongoGrantRepository,
        ResolveEffectiveAccess,
        STORAGE_PORT,
        AVATAR_BUCKET,
        UuidGenerator,
      ],
    },
    {
      provide: ClearUserAvatarUseCase,
      useFactory: (
        users: MongoUserRepository,
        roles: MongoRoleRepository,
        grants: MongoGrantRepository,
        access: ResolveEffectiveAccess,
        storage: ObjectStoragePort,
        bucket: string,
      ) =>
        new ClearUserAvatarUseCase(
          users,
          roles,
          grants,
          access,
          storage,
          bucket,
        ),
      inject: [
        MongoUserRepository,
        MongoRoleRepository,
        MongoGrantRepository,
        ResolveEffectiveAccess,
        STORAGE_PORT,
        AVATAR_BUCKET,
      ],
    },
    {
      provide: ReplaceUserRolesUseCase,
      useFactory: (
        users: MongoUserRepository,
        roles: MongoRoleRepository,
        grants: MongoGrantRepository,
        access: ResolveEffectiveAccess,
        storage: ObjectStoragePort,
        bucket: string,
        ids: UuidGenerator,
      ) =>
        new ReplaceUserRolesUseCase(
          users,
          roles,
          grants,
          access,
          storage,
          bucket,
          ids,
        ),
      inject: [
        MongoUserRepository,
        MongoRoleRepository,
        MongoGrantRepository,
        ResolveEffectiveAccess,
        STORAGE_PORT,
        AVATAR_BUCKET,
        UuidGenerator,
      ],
    },
    {
      provide: ListRolesUseCase,
      useFactory: (
        roles: MongoRoleRepository,
        access: ResolveEffectiveAccess,
      ) => new ListRolesUseCase(roles, access),
      inject: [MongoRoleRepository, ResolveEffectiveAccess],
    },
    {
      provide: CreateRoleUseCase,
      useFactory: (
        roles: MongoRoleRepository,
        access: ResolveEffectiveAccess,
        ids: UuidGenerator,
      ) => new CreateRoleUseCase(roles, access, ids),
      inject: [MongoRoleRepository, ResolveEffectiveAccess, UuidGenerator],
    },
    {
      provide: ListPermissionsUseCase,
      useFactory: (access: ResolveEffectiveAccess) =>
        new ListPermissionsUseCase(access),
      inject: [ResolveEffectiveAccess],
    },
    {
      provide: ReplaceRolePermissionsUseCase,
      useFactory: (
        roles: MongoRoleRepository,
        access: ResolveEffectiveAccess,
      ) => new ReplaceRolePermissionsUseCase(roles, access),
      inject: [MongoRoleRepository, ResolveEffectiveAccess],
    },
    {
      provide: SyncUsersFromErpUseCase,
      useFactory: (
        erp: ErpUserDirectory | null,
        users: MongoUserRepository,
        ids: UuidGenerator,
      ) => {
        if (!erp) {
          return null;
        }
        return new SyncUsersFromErpUseCase(erp, users, ids);
      },
      inject: [ERP_USER_DIRECTORY, MongoUserRepository, UuidGenerator],
    },
    {
      provide: SyncUsersScheduler,
      useFactory: (sync: SyncUsersFromErpUseCase | null) => new SyncUsersScheduler(sync),
      inject: [SyncUsersFromErpUseCase],
    },
  ],
  exports: [AccessTokenGuard, ResolveEffectiveAccess],
})
export class AuthModule {}
