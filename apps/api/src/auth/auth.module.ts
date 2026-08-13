import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import {
  ChangePasswordUseCase,
  LoginUseCase,
  RenewTokenUseCase,
  SyncUsersFromErpUseCase,
  type ErpUserDirectory,
} from '@gigahub/application-identity';
import { MysqlErpUserDirectory } from '@gigahub/adapters-ixc';
import type { EnvConfig } from '@gigahub/shared/config';
import { UserModel, UserSchema } from './persistence/user.schema';
import { CredentialModel, CredentialSchema } from './persistence/credential.schema';
import { SessionModel, SessionSchema } from './persistence/session.schema';
import { MongoUserRepository } from './persistence/mongo-user.repository';
import { MongoCredentialRepository } from './persistence/mongo-credential.repository';
import { MongoSessionRepository } from './persistence/mongo-session.repository';
import {
  Argon2PasswordHasher,
  CryptoRefreshTokenService,
  SystemClock,
  UuidGenerator,
} from './crypto/crypto.services';
import { JoseAccessTokenIssuer } from './crypto/jose-token.issuer';
import { AuthController } from './auth.controller';
import { AuthDevSeedService } from './auth-dev-seed.service';
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
    ]),
  ],
  controllers: [AuthController],
  providers: [
    MongoUserRepository,
    MongoCredentialRepository,
    MongoSessionRepository,
    Argon2PasswordHasher,
    CryptoRefreshTokenService,
    UuidGenerator,
    SystemClock,
    JoseAccessTokenIssuer,
    AccessTokenGuard,
    AuthDevSeedService,
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
      useFactory: (
        config: ConfigService<EnvConfig, true>,
        sync: SyncUsersFromErpUseCase | null,
      ) => new SyncUsersScheduler(config, sync),
      inject: [ConfigService, SyncUsersFromErpUseCase],
    },
  ],
  exports: [AccessTokenGuard],
})
export class AuthModule {}
