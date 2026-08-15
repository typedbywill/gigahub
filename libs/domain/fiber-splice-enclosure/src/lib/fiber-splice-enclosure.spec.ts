import {
  DomainError,
  DomainErrorCodes,
  geoPoint,
} from '@gigahub/shared/kernel';
import {
  FiberSpliceEnclosure,
  type FiberSpliceEnclosureSnapshot,
} from './fiber-splice-enclosure';

describe('FiberSpliceEnclosure', () => {
  const validLocation = geoPoint(-29.625, -51.009);


  it('creates an enclosure with valid input', () => {
    const enclosure = FiberSpliceEnclosure.create({
      id: 'ceo-123',
      idErp: '123',
      name: 'CEO 123 - Centro',
      projectIdErp: '99',
      traysCount: 4,
      location: validLocation,
    });

    expect(enclosure.id).toBe('ceo-123');
    expect(enclosure.idErp).toBe('123');
    expect(enclosure.name).toBe('CEO 123 - Centro');
    expect(enclosure.projectIdErp).toBe('99');
    expect(enclosure.traysCount).toBe(4);
    expect(enclosure.location).toEqual(validLocation);
    expect(enclosure.createdAt).toBeInstanceOf(Date);
    expect(enclosure.updatedAt).toBeInstanceOf(Date);
  });

  it('rehydrates correctly from snapshot', () => {
    const now = new Date();
    const snapshot: FiberSpliceEnclosureSnapshot = {
      id: 'ceo-456' as any,
      idErp: '456',
      name: 'CEO 456',
      projectIdErp: '10',
      traysCount: 2,
      location: validLocation,
      createdAt: now,
      updatedAt: now,
    };

    const enclosure = FiberSpliceEnclosure.fromSnapshot(snapshot);
    expect(enclosure.toSnapshot()).toEqual(snapshot);
  });

  it('throws when idErp or name is empty', () => {
    expect(() =>
      FiberSpliceEnclosure.create({
        id: 'ceo-1',
        idErp: '',
        name: 'CEO 1',
        traysCount: 1,
      }),
    ).toThrow();

    expect(() =>
      FiberSpliceEnclosure.create({
        id: 'ceo-1',
        idErp: '1',
        name: '   ',
        traysCount: 1,
      }),
    ).toThrow();
  });


  it('throws DomainError when trays count is negative or not integer', () => {
    expect(() =>
      FiberSpliceEnclosure.fromSnapshot({
        id: 'ceo-1' as any,
        idErp: '1',
        name: 'CEO 1',
        traysCount: -1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).toThrow(DomainError);

    try {
      FiberSpliceEnclosure.fromSnapshot({
        id: 'ceo-1' as any,
        idErp: '1',
        name: 'CEO 1',
        traysCount: -1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      expect((err as DomainError).code).toBe(
        DomainErrorCodes.InvariantViolation,
      );
    }
  });
});
