import { Session } from '@gigahub/domain/identity';
import { DomainError } from '@gigahub/shared/kernel';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type AuthTokens,
  type Clock,
  type CredentialRepository,
  type IdGenerator,
  type PasswordHasher,
  type RefreshTokenService,
  type SessionRepository,
  type TokenIssuer,
  type UserRepository,
} from './ports';
import { toPublicUserDto } from './mappers';

export interface LoginCommand {
  email: string;
  password: string;
  deviceLabel?: string;
}

export class LoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly credentials: CredentialRepository,
    private readonly sessions: SessionRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenIssuer,
    private readonly refreshTokens: RefreshTokenService,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
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

    const credential = await this.credentials.findByUserId(user.id);
    if (!credential) {
      throw new ApplicationError(
        ApplicationErrorCodes.InvalidCredentials,
        'Invalid email or password',
      );
    }

    const matches = await this.hasher.verify(
      command.password,
      credential.passwordHash,
    );
    if (!matches) {
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

    return {
      accessToken,
      refreshToken,
      user: toPublicUserDto(user),
    };
  }
}
