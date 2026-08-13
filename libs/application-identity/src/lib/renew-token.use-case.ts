import { DomainError, DomainErrorCodes } from '@gigahub/shared/kernel';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type AuthTokens,
  type Clock,
  type RefreshTokenService,
  type SessionRepository,
  type TokenIssuer,
  type UserRepository,
} from './ports';
import { toPublicUserDto } from './mappers';
import type { ResolveEffectiveAccess } from './resolve-effective-access';

export interface RenewTokenCommand {
  refreshToken: string;
}

export class RenewTokenUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly tokens: TokenIssuer,
    private readonly refreshTokens: RefreshTokenService,
    private readonly clock: Clock,
    private readonly access: ResolveEffectiveAccess,
  ) {}

  async execute(command: RenewTokenCommand): Promise<AuthTokens> {
    const presented = command.refreshToken?.trim();
    if (!presented) {
      throw new ApplicationError(
        ApplicationErrorCodes.InvalidRefreshToken,
        'Refresh token is required',
      );
    }

    const presentedHash = this.refreshTokens.hash(presented);
    const session = await this.sessions.findByRefreshTokenHash(presentedHash);
    if (!session) {
      throw new ApplicationError(
        ApplicationErrorCodes.InvalidRefreshToken,
        'Invalid refresh token',
      );
    }

    const now = this.clock.now();
    const nextRefresh = this.refreshTokens.generate();
    const nextHash = this.refreshTokens.hash(nextRefresh);

    let rotateResult;
    try {
      rotateResult = session.rotateRefresh(presentedHash, nextHash, now);
    } catch (error) {
      if (
        error instanceof DomainError &&
        error.code === DomainErrorCodes.SessionNotUsable
      ) {
        throw new ApplicationError(
          ApplicationErrorCodes.InvalidRefreshToken,
          'Invalid refresh token',
        );
      }
      throw error;
    }

    if (rotateResult.kind === 'reuse') {
      await this.sessions.save(session);
      await this.sessions.revokeFamily(session.familyId, now);
      throw new ApplicationError(
        ApplicationErrorCodes.RefreshTokenReuse,
        'Refresh token reuse detected',
      );
    }

    await this.sessions.save(session);

    const user = await this.users.findById(session.userId);
    if (!user) {
      throw new ApplicationError(
        ApplicationErrorCodes.InvalidRefreshToken,
        'Invalid refresh token',
      );
    }

    try {
      user.assertCanAuthenticate();
    } catch {
      throw new ApplicationError(
        ApplicationErrorCodes.InvalidRefreshToken,
        'Invalid refresh token',
      );
    }

    const accessToken = await this.tokens.issueAccessToken({
      userId: user.id,
      sessionId: session.id,
      email: user.email,
    });

    const permissionIds = await this.access.permissionIds(user.id);

    return {
      accessToken,
      refreshToken: nextRefresh,
      user: toPublicUserDto(user, { permissionIds }),
    };
  }
}
