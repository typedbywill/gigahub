import { DomainError, DomainErrorCodes } from '@gigahub/shared/kernel';
import { Session } from './session';

describe('Session', () => {
  function open(overrides?: Partial<Parameters<typeof Session.create>[0]>) {
    return Session.create({
      id: 'ses-1',
      userId: 'usr-1',
      familyId: 'fam-1',
      refreshTokenHash: 'hash-current',
      ...overrides,
    });
  }

  it('rotates when the presented hash matches', () => {
    const session = open();
    const result = session.rotateRefresh('hash-current', 'hash-next');
    expect(result).toEqual({ kind: 'rotated' });
    expect(session.refreshTokenHash).toBe('hash-next');
    expect(session.previousRefreshTokenHash).toBe('hash-current');
    expect(session.isRevoked()).toBe(false);
  });

  it('detects reuse of a rotated token and revokes the session', () => {
    const session = open();
    session.rotateRefresh('hash-current', 'hash-next');
    const reuse = session.rotateRefresh('hash-current', 'hash-attacker');
    expect(reuse).toEqual({ kind: 'reuse' });
    expect(session.isRevoked()).toBe(true);
  });

  it('rejects use of a revoked session', () => {
    const session = open();
    session.revoke();
    expect(() => session.assertUsable()).toThrow(DomainError);
    try {
      session.assertUsable();
    } catch (error) {
      expect(error).toMatchObject({ code: DomainErrorCodes.SessionNotUsable });
    }
  });

  it('rejects use of an expired session', () => {
    const session = open({
      absoluteExpiresAt: new Date('2020-01-01T00:00:00.000Z'),
    });
    expect(() =>
      session.assertUsable(new Date('2020-01-02T00:00:00.000Z')),
    ).toThrow(DomainError);
  });
});
