import { DomainError, DomainErrorCodes } from '@gigahub/shared/kernel';
import { GrantPermission, GrantRole } from './grant';
import { MIN_GRANT_REASON_LENGTH } from './policies';

describe('grants', () => {
  const now = new Date('2026-08-13T12:00:00.000Z');

  describe('GrantRole', () => {
    it('creates an effective role grant', () => {
      const grant = GrantRole.create({
        id: 'gr-1',
        userId: 'usr-1',
        roleId: 'role-1',
        grantedByUserId: 'usr-admin',
        createdAt: now,
      });
      expect(grant.kind).toBe('role');
      expect(grant.isEffective(now)).toBe(true);
      expect(() => grant.assertEffective(now)).not.toThrow();
    });

    it('stops being effective after revoke or expiry', () => {
      const grant = GrantRole.create({
        id: 'gr-2',
        userId: 'usr-1',
        roleId: 'role-1',
        grantedByUserId: 'usr-admin',
        expiresAt: new Date('2026-08-14T00:00:00.000Z'),
        createdAt: now,
      });

      expect(grant.isEffective(new Date('2026-08-14T00:00:00.000Z'))).toBe(
        false,
      );

      const active = GrantRole.create({
        id: 'gr-3',
        userId: 'usr-1',
        roleId: 'role-1',
        grantedByUserId: 'usr-admin',
        createdAt: now,
      });
      active.revoke(now);
      expect(active.isEffective(now)).toBe(false);
      expect(() => active.assertEffective(now)).toThrow(DomainError);
      try {
        active.assertEffective(now);
      } catch (error) {
        expect(error).toMatchObject({
          code: DomainErrorCodes.GrantNotActive,
        });
      }
    });
  });

  describe('GrantPermission', () => {
    it('requires a reason with minimum length', () => {
      expect(() =>
        GrantPermission.create({
          id: 'gp-1',
          userId: 'usr-1',
          permissionId: 'work-order:review',
          grantedByUserId: 'usr-admin',
          reason: 'short',
          createdAt: now,
        }),
      ).toThrow(DomainError);

      try {
        GrantPermission.create({
          id: 'gp-1',
          userId: 'usr-1',
          permissionId: 'work-order:review',
          grantedByUserId: 'usr-admin',
          reason: 'x'.repeat(MIN_GRANT_REASON_LENGTH - 1),
          createdAt: now,
        });
      } catch (error) {
        expect(error).toMatchObject({
          code: DomainErrorCodes.GrantReasonRequired,
        });
      }
    });

    it('creates an effective direct permission grant', () => {
      const grant = GrantPermission.create({
        id: 'gp-2',
        userId: 'usr-1',
        permissionId: 'gamification:adjust',
        grantedByUserId: 'usr-admin',
        reason: 'Ajuste pontual de temporada',
        createdAt: now,
      });
      expect(grant.kind).toBe('permission');
      expect(grant.permissionId).toBe('gamification:adjust');
      expect(grant.isEffective(now)).toBe(true);
    });
  });
});
