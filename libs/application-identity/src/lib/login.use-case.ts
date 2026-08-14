import { Session } from '@gigahub/domain/identity';
import { DomainError, type UserId } from '@gigahub/shared/kernel';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type AuthTokens,
  type Clock,
  type CredentialRepository,
  type ErpUserDirectory,
  type IdGenerator,
  type PasswordHasher,
  type RefreshTokenService,
  type SessionRepository,
  type TokenIssuer,
  type UserRepository,
} from './ports';
import { toPublicUserDto, buildAvatarUrl } from './mappers';
import type { ResolveEffectiveAccess } from './resolve-effective-access';

export interface LoginCommand {
  email: string;
  password: string;
  deviceLabel?: string;
}

/**
 * ERP-linked users authenticate against IXC (SHA-256).
 * Local-only users (manual bootstrap) use Argon2 Credential.
 */
export class LoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly credentials: CredentialRepository,
    private readonly sessions: SessionRepository,
    private readonly hasher: PasswordHasher,
    private readonly erp: ErpUserDirectory | null,
    private readonly tokens: TokenIssuer,
    private readonly refreshTokens: RefreshTokenService,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly access: ResolveEffectiveAccess,
  ) {}

  async execute(command: LoginCommand): Promise<AuthTokens> {
    const email = command.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email);
    if (!user) {
      throw new ApplicationError(
        ApplicationErrorCodes.InvalidCredentials,
        'Invalid email or password',
      );
    }

    try {
      user.assertCanAuthenticate();
    } catch (error) {
      if (error instanceof DomainError) {
        throw new ApplicationError(
          ApplicationErrorCodes.InvalidCredentials,
          'Invalid email or password',
        );
      }
      throw error;
    }

    const passwordOk = await this.verifyPassword(
      user.hasErpLink(),
      email,
      command.password,
      user.id,
    );
    if (!passwordOk) {
      throw new ApplicationError(
        ApplicationErrorCodes.InvalidCredentials,
        'Invalid email or password',
      );
    }

    const now = this.clock.now();
    const refreshToken = this.refreshTokens.generate();
    const refreshTokenHash = this.refreshTokens.hash(refreshToken);
    const session = Session.create({
      id: this.ids.generate(),
      userId: user.id,
      familyId: this.ids.generate(),
      refreshTokenHash,
      deviceLabel: command.deviceLabel,
      createdAt: now,
      updatedAt: now,
    });
    await this.sessions.save(session);

    const accessToken = await this.tokens.issueAccessToken({
      userId: user.id,
      sessionId: session.id,
      email: user.email,
    });

    const permissionIds = await this.access.permissionIds(user.id);

    return {
      accessToken,
      refreshToken,
      user: toPublicUserDto(user, {
        permissionIds,
        avatarUrl: buildAvatarUrl(user),
      }),
    };
  }

  private async verifyPassword(
    erpLinked: boolean,
    email: string,
    plaintext: string,
    userId: UserId,
  ): Promise<boolean> {
    if (erpLinked) {
      if (!this.erp) {
        throw new ApplicationError(
          ApplicationErrorCodes.ErpUnavailable,
          'ERP authentication is not configured',
        );
      }
      try {
        return await this.erp.verifyPassword(email, plaintext);
      } catch (error) {
        if (error instanceof ApplicationError) throw error;
        throw new ApplicationError(
          ApplicationErrorCodes.ErpUnavailable,
          'ERP authentication is unavailable',
        );
      }
    }

    const credential = await this.credentials.findByUserId(userId);
    if (!credential) {
      return false;
    }
    return this.hasher.verify(plaintext, credential.passwordHash);
  }
}
