import {
  type CredentialId,
  type UserId,
  DomainError,
  DomainErrorCodes,
  assertNonEmpty,
  credentialId,
  userId,
} from '@gigahub/shared/kernel';
import { MIN_PASSWORD_LENGTH } from './policies';

export interface CredentialSnapshot {
  id: CredentialId;
  userId: UserId;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateCredentialInput = {
  id: string;
  userId: string;
  passwordHash: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export class Credential {
  private constructor(private props: CredentialSnapshot) {}

  static assertPasswordPolicy(plaintext: string): void {
    const value = plaintext ?? '';
    if (value.length < MIN_PASSWORD_LENGTH) {
      throw new DomainError(
        DomainErrorCodes.WeakPassword,
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        { minLength: MIN_PASSWORD_LENGTH },
      );
    }
  }

  static create(input: CreateCredentialInput): Credential {
    const now = input.createdAt ?? new Date();
    return Credential.fromSnapshot({
      id: credentialId(input.id),
      userId: userId(input.userId),
      passwordHash: assertNonEmpty(input.passwordHash, 'passwordHash'),
      createdAt: now,
      updatedAt: input.updatedAt ?? now,
    });
  }

  static fromSnapshot(snapshot: CredentialSnapshot): Credential {
    return new Credential({ ...snapshot });
  }

  get id(): CredentialId {
    return this.props.id;
  }

  get userId(): UserId {
    return this.props.userId;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  replaceHash(passwordHash: string): void {
    this.props.passwordHash = assertNonEmpty(passwordHash, 'passwordHash');
    this.touch();
  }

  toSnapshot(): CredentialSnapshot {
    return { ...this.props };
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}
