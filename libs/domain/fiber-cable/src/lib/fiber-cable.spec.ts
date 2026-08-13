import {
  DomainError,
  DomainErrorCodes,
  geoPoint,
} from '@gigahub/shared/kernel';
import { FiberCable } from './fiber-cable';
import {
  DEFAULT_NEARBY_RADIUS_METERS,
  MAX_NEARBY_RADIUS_METERS,
  assertNearbyRadiusMeters,
} from './nearby-radius';

describe('FiberCable', () => {
  const p1 = geoPoint(-29.68, -50.12);
  const p2 = geoPoint(-29.681, -50.121);

  function cable() {
    return FiberCable.create({
      id: 'cable-1',
      idErp: '2555',
      name: 'FLAT Azul-I 1',
      projectIdErp: '10',
      lengthMeters: 134.67,
      active: true,
      path: [p1, p2],
    });
  }

  it('creates a cable and round-trips through snapshot', () => {
    const entity = cable();
    expect(entity.idErp).toBe('2555');
    expect(entity.name).toBe('FLAT Azul-I 1');
    expect(entity.projectIdErp).toBe('10');
    expect(entity.lengthMeters).toBe(134.67);
    expect(entity.active).toBe(true);
    expect(entity.path).toEqual([p1, p2]);

    const snapshot = entity.toSnapshot();
    const restored = FiberCable.fromSnapshot(snapshot);
    expect(restored.toSnapshot()).toEqual(snapshot);
  });

  it('allows omitting lengthMeters', () => {
    const entity = FiberCable.create({
      id: 'cable-2',
      idErp: '2556',
      name: 'Sem comprimento',
      projectIdErp: '10',
      active: true,
      path: [p1, p2],
    });
    expect(entity.lengthMeters).toBeUndefined();
  });

  it('rejects a path with fewer than 2 points', () => {
    expect(() =>
      FiberCable.create({
        id: 'cable-3',
        idErp: '2557',
        name: 'Inválido',
        projectIdErp: '10',
        active: true,
        path: [p1],
      }),
    ).toThrow(DomainError);

    try {
      FiberCable.create({
        id: 'cable-3',
        idErp: '2557',
        name: 'Inválido',
        projectIdErp: '10',
        active: true,
        path: [p1],
      });
    } catch (error) {
      expect(error).toMatchObject({
        code: DomainErrorCodes.InvariantViolation,
      });
    }
  });

  it('rejects negative lengthMeters', () => {
    expect(() =>
      FiberCable.create({
        id: 'cable-4',
        idErp: '2558',
        name: 'Inválido',
        projectIdErp: '10',
        active: true,
        lengthMeters: -1,
        path: [p1, p2],
      }),
    ).toThrow(DomainError);
  });

  it('rejects empty name or idErp', () => {
    expect(() =>
      FiberCable.create({
        id: 'cable-5',
        idErp: '  ',
        name: 'Ok',
        projectIdErp: '10',
        active: true,
        path: [p1, p2],
      }),
    ).toThrow(/idErp cannot be empty/);
  });
});

describe('nearby radius policy', () => {
  it('exposes the default 5 km radius', () => {
    expect(DEFAULT_NEARBY_RADIUS_METERS).toBe(5_000);
    expect(MAX_NEARBY_RADIUS_METERS).toBe(50_000);
  });

  it('accepts a valid radius', () => {
    expect(assertNearbyRadiusMeters(1_000)).toBe(1_000);
  });

  it('rejects zero, negative, non-finite, or oversized radius', () => {
    expect(() => assertNearbyRadiusMeters(0)).toThrow(DomainError);
    expect(() => assertNearbyRadiusMeters(-10)).toThrow(DomainError);
    expect(() => assertNearbyRadiusMeters(Number.NaN)).toThrow(DomainError);
    expect(() =>
      assertNearbyRadiusMeters(MAX_NEARBY_RADIUS_METERS + 1),
    ).toThrow(DomainError);
  });
});
