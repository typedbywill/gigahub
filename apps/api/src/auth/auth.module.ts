import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import {
  ChangePasswordUseCase,
  GetUserUseCase,
  InactivateUserUseCase,
  ListUsersUseCase,
  LoginUseCase,
  RenewTokenUseCase,
  SeedDefaultRolesUseCase,
  SyncUsersFromErpUseCase,
  type ErpUserDirectory,
} from '@gigahub/application-identity';
import { MysqlErpUserDirectory } from '@gigahub/adapters-ixc';
import type { EnvConfig } from '@gigahub/shared/config';
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
import { AuthRolesBootstrapService } from './auth-roles-bootstrap.service';
import { SyncUsersScheduler } from './sync-users.scheduler';
import { AccessTokenGuard } from './access-token.guard';

export const ERP_USER_DIRECTORY = 'ERP_USER_DIRECTORY';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: UserModel.name, schema: UserSchema },
      { name: CredentialModel.name, schema: CredentialSchema },
      { name: SessionModel.name, schema: SessionSchema },
      { name: RoleModel.name, schema: RoleSchema },
      { name: GrantModel.name, schema: GrantSchema },
    ]),
  ],
  controllers: [AuthController, UsersController],
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
      provide: SeedDefaultRolesUseCase,
      useFactory: (roles: MongoRoleRepository, ids: UuidGenerator) =>
        new SeedDefaultRolesUseCase(roles, ids),
      inject: [MongoRoleRepository, UuidGenerator],
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
      ) => new RenewTokenUseCase(users, sessions, tokens, refresh, clock),
      inject: [
        MongoUserRepository,
        MongoSessionRepository,
        JoseAccessTokenIssuer,
        CryptoRefreshTokenService,
        SystemClock,
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
      ) =>
        new ChangePasswordUseCase(users, credentials, sessions, hasher, erp, clock),
      inject: [
        MongoUserRepository,
        MongoCredentialRepository,
        MongoSessionRepository,
        Argon2PasswordHasher,
        ERP_USER_DIRECTORY,
        SystemClock,
      ],
    },
    {
      provide: ListUsersUseCase,
      useFactory: (users: MongoUserRepository) => new ListUsersUseCase(users),
      inject: [MongoUserRepository],
    },
    {
      provide: GetUserUseCase,
      useFactory: (
        users: MongoUserRepository,
        roles: MongoRoleRepository,
        grants: MongoGrantRepository,
        config: ConfigService<EnvConfig, true>,
      ) =>
        new GetUserUseCase(
          users,
          roles,
          grants,
          null,
          config.get('MINIO_BUCKET', { infer: true }),
        ),
      inject: [
        MongoUserRepository,
        MongoRoleRepository,
        MongoGrantRepository,
        ConfigService,
      ],
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
        config: ConfigService<EnvConfig, true>,
      ) =>
        new InactivateUserUseCase(
          users,
          sessions,
          erp,
          clock,
          roles,
          grants,
          null,
          config.get('MINIO_BUCKET', { infer: true }),
        ),
      inject: [
        MongoUserRepository,
        MongoSessionRepository,
        ERP_USER_DIRECTORY,
        SystemClock,
        MongoRoleRepository,
        MongoGrantRepository,
        ConfigService,
      ],
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
  exports: [AccessTokenGuard],
})
export class AuthModule {}
