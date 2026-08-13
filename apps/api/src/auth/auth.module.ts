import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoginUseCase, RenewTokenUseCase } from '@gigahub/application-identity';
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

export const USER_REPOSITORY = 'USER_REPOSITORY';
export const CREDENTIAL_REPOSITORY = 'CREDENTIAL_REPOSITORY';
export const SESSION_REPOSITORY = 'SESSION_REPOSITORY';

@Module({
  imports: [
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
    AuthDevSeedService,
    {
      provide: LoginUseCase,
      useFactory: (
        users: MongoUserRepository,
        credentials: MongoCredentialRepository,
        sessions: MongoSessionRepository,
        hasher: Argon2PasswordHasher,
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
  ],
})
export class AuthModule {}
