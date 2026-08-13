import {
  DomainError,
  DomainErrorCodes,
  geoPoint,
} from '@gigahub/shared/kernel';
import { FiberAccessTerminal } from './fiber-access-terminal';

describe('FiberAccessTerminal', () => {
  const location = geoPoint(-23.55052, -46.633308);

  function terminal() {
    return FiberAccessTerminal.create({
      id: 'fat-1',
      idErp: '1001',
      name: 'CTO Rua das Flores',
      portCount: 8,
      location,
    });
  }

  it('creates a terminal and round-trips through snapshot', () => {
    const fat = terminal();
    expect(fat.idErp).toBe('1001');
    expect(fat.portCount).toBe(8);
    expect(fat.location).toEqual(location);

    const snapshot = fat.toSnapshot();
    const restored = FiberAccessTerminal.fromSnapshot(snapshot);
    expect(restored.toSnapshot()).toEqual(snapshot);
  });

  it('links a customer to a valid port', () => {
    const fat = terminal();
    fat.linkCustomer('cli-1', 3);
    expect(fat.toSnapshot().ports).toEqual([
      { port: 3, customerId: 'cli-1' },
    ]);
  });

  it('unlinks a linked customer', () => {
    const fat = terminal();
    fat.linkCustomer('cli-1', 2);
    fat.unlinkCustomer('cli-1');
    expect(fat.toSnapshot().ports).toEqual([]);
  });

  it('rejects a port outside the valid range', () => {
    const fat = terminal();
    expect(() => fat.linkCustomer('cli-1', 0)).toThrow(DomainError);
    expect(() => fat.linkCustomer('cli-2', 9)).toThrow(DomainError);
    try {
      fat.linkCustomer('cli-1', 0);
    } catch (error) {
      expect(error).toMatchObject({
        code: DomainErrorCodes.InvariantViolation,
      });
    }
  });

  it('rejects linking to an occupied port', () => {
    const fat = terminal();
    fat.linkCustomer('cli-1', 1);
    expect(() => fat.linkCustomer('cli-2', 1)).toThrow(DomainError);
    try {
      fat.linkCustomer('cli-2', 1);
    } catch (error) {
      expect(error).toMatchObject({
        code: DomainErrorCodes.InvariantViolation,
      });
    }
  });

  it('rejects linking a customer already linked to another port', () => {
    const fat = terminal();
    fat.linkCustomer('cli-1', 1);
    expect(() => fat.linkCustomer('cli-1', 2)).toThrow(DomainError);
  });

  it('rejects unlinking a customer that is not linked', () => {
    const fat = terminal();
    expect(() => fat.unlinkCustomer('cli-1')).toThrow(DomainError);
  });

  it('rejects invalid port count on create', () => {
    expect(() =>
      FiberAccessTerminal.create({
        id: 'fat-2',
        idErp: '1002',
        name: 'CTO Inválida',
        portCount: 0,
      }),
    ).toThrow(DomainError);
  });

  it('rejects inconsistent ports when rehydrating from snapshot', () => {
    const fat = terminal();
    const snapshot = fat.toSnapshot();
    expect(() =>
      FiberAccessTerminal.fromSnapshot({
        ...snapshot,
        ports: [
          { port: 1, customerId: 'cli-1' as never },
          { port: 1, customerId: 'cli-2' as never },
        ],
      }),
    ).toThrow(DomainError);
  });
});
