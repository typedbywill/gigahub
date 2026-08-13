import type {
  Credential,
  Session,
  User,
} from '@gigahub/domain/identity';
import type { SessionId, UserId } from '@gigahub/shared/kernel';
import type { PublicUserDto } from '@gigahub/shared/contracts';

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: UserId): Promise<User | null>;
  save(user: User): Promise<void>;
}

export interface CredentialRepository {
  findByUserId(userId: UserId): Promise<Credential | null>;
  save(credential: Credential): Promise<void>;
}

export interface SessionRepository {
  findById(id: SessionId): Promise<Session | null>;
  findByRefreshTokenHash(hash: string): Promise<Session | null>;
  save(session: Session): Promise<void>;
  revokeFamily(familyId: string, at: Date): Promise<void>;
}

export interface PasswordHasher {
  hash(plaintext: string): Promise<string>;
  verify(plaintext: string, passwordHash: string): Promise<boolean>;
}

export interface TokenIssuer {
  issueAccessToken(input: {
    userId: UserId;
    sessionId: SessionId;
    email: string;
  }): Promise<string>;
}

export interface RefreshTokenService {
  generate(): string;
  hash(token: string): string;
}

export interface IdGenerator {
  generate(): string;
}

export interface Clock {
  now(): Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: PublicUserDto;
}

export class ApplicationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export const ApplicationErrorCodes = {
  InvalidCredentials: 'INVALID_CREDENTIALS',
  InvalidRefreshToken: 'INVALID_REFRESH_TOKEN',
  RefreshTokenReuse: 'REFRESH_TOKEN_REUSE',
} as const;
