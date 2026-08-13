import { Credential } from '@gigahub/domain/identity';
import { DomainError, DomainErrorCodes, userId } from '@gigahub/shared/kernel';
import type { UserId } from '@gigahub/shared/kernel';
import type { PublicUserDto } from '@gigahub/shared/contracts';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type Clock,
  type CredentialRepository,
  type ErpUserDirectory,
  type PasswordHasher,
  type SessionRepository,
  type UserRepository,
} from './ports';
import { toPublicUserDto } from './mappers';
import type { ResolveEffectiveAccess } from './resolve-effective-access';

export interface ChangePasswordCommand {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

/**
 * ERP-linked: verify + update password in IXC (SHA-256).
 * Local-only: Argon2 Credential in GigaHub.
 */
export class ChangePasswordUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly credentials: CredentialRepository,
    private readonly sessions: SessionRepository,
    private readonly hasher: PasswordHasher,
    private readonly erp: ErpUserDirectory | null,
    private readonly clock: Clock,
    private readonly access: ResolveEffectiveAccess,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<{ user: PublicUserDto }> {
    const id: UserId = userId(command.userId);
    const user = await this.users.findById(id);
    if (!user) {
      throw new ApplicationError(
        ApplicationErrorCodes.Unauthorized,
        'Unauthorized',
      );
    }

    try {
      Credential.assertPasswordPolicy(command.newPassword);
    } catch (error) {
      if (
        error instanceof DomainError &&
        error.code === DomainErrorCodes.WeakPassword
      ) {
        throw new ApplicationError(
          ApplicationErrorCodes.WeakPassword,
          error.message,
        );
      }
      throw error;
    }

    if (user.hasErpLink()) {
      await this.changeErpPassword(user.email, user.idErp!, command);
    } else {
      await this.changeLocalPassword(user.id, command);
    }

    await this.sessions.revokeAllForUser(user.id, this.clock.now());
    const permissionIds = await this.access.permissionIds(user.id);
    return { user: toPublicUserDto(user, { permissionIds }) };
  }

  private async changeErpPassword(
    email: string,
    idErp: string,
    command: ChangePasswordCommand,
  ): Promise<void> {
    if (!this.erp) {
      throw new ApplicationError(
        ApplicationErrorCodes.ErpUnavailable,
        'ERP authentication is not configured',
      );
    }
    let currentOk: boolean;
    try {
      currentOk = await this.erp.verifyPassword(email, command.currentPassword);
    } catch {
      throw new ApplicationError(
        ApplicationErrorCodes.ErpUnavailable,
        'ERP authentication is unavailable',
      );
    }
    if (!currentOk) {
      throw new ApplicationError(
        ApplicationErrorCodes.InvalidCredentials,
        'Invalid current password',
      );
    }
    try {
      await this.erp.updatePassword(idErp, command.newPassword);
    } catch {
      throw new ApplicationError(
        ApplicationErrorCodes.ErpUnavailable,
        'Failed to update password in ERP',
      );
    }
  }

  private async changeLocalPassword(
    userIdValue: UserId,
    command: ChangePasswordCommand,
  ): Promise<void> {
    const credential = await this.credentials.findByUserId(userIdValue);
    if (!credential) {
      throw new ApplicationError(
        ApplicationErrorCodes.InvalidCredentials,
        'Invalid current password',
      );
    }
    const matches = await this.hasher.verify(
      command.currentPassword,
      credential.passwordHash,
    );
    if (!matches) {
      throw new ApplicationError(
        ApplicationErrorCodes.InvalidCredentials,
        'Invalid current password',
      );
    }
    credential.replaceHash(await this.hasher.hash(command.newPassword));
    await this.credentials.save(credential);
  }
}
