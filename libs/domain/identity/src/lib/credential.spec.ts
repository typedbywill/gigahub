import { DomainError, DomainErrorCodes } from '@gigahub/shared/kernel';
import { Credential } from './credential';
import { MIN_PASSWORD_LENGTH } from './policies';

describe('Credential', () => {
  it('accepts a hash and exposes it for verification adapters', () => {
    const credential = Credential.create({
      id: 'cred-1',
      userId: 'usr-1',
      passwordHash: 'argon2id$hashed',
    });
    expect(credential.passwordHash).toBe('argon2id$hashed');
    expect(credential.userId).toBe('usr-1');
  });

  it('enforces minimum password length on plaintext policy', () => {
    expect(() => Credential.assertPasswordPolicy('short')).toThrow(DomainError);
    try {
      Credential.assertPasswordPolicy('a'.repeat(MIN_PASSWORD_LENGTH - 1));
    } catch (error) {
      expect(error).toMatchObject({ code: DomainErrorCodes.WeakPassword });
    }
    expect(() =>
      Credential.assertPasswordPolicy('a'.repeat(MIN_PASSWORD_LENGTH)),
    ).not.toThrow();
  });
});
