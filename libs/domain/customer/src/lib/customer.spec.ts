import { DomainError, DomainErrorCodes } from '@gigahub/shared/kernel';
import { Customer } from './customer';

describe('Customer', () => {
  const base = {
    id: 'cli-1',
    idErp: '1001',
    name: 'Maria Silva',
    status: 'active' as const,
  };

  it('creates an operable customer from IXC identity', () => {
    const customer = Customer.create(base);
    expect(customer.id).toBe('cli-1');
    expect(customer.isOperable()).toBe(true);
    expect(() => customer.assertCanOpenSupport()).not.toThrow();
  });

  it('blocks support for cancelled customers', () => {
    const customer = Customer.create({ ...base, status: 'cancelled' });
    expect(customer.isOperable()).toBe(false);
    expect(() => customer.assertCanOpenSupport()).toThrow(DomainError);
    try {
      customer.assertCanOpenSupport();
    } catch (error) {
      expect(error).toMatchObject({
        code: DomainErrorCodes.CustomerNotOperable,
      });
    }
  });
});
