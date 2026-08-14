import { mapIxcCustomerStatus } from './map-ixc-customer-status';

describe('mapIxcCustomerStatus', () => {
  it('maps active IXC customer as active', () => {
    expect(mapIxcCustomerStatus('S', 'A')).toBe('active');
    expect(mapIxcCustomerStatus('S', 'N')).toBe('active');
  });

  it('maps inactive ERP flag as inactive', () => {
    expect(mapIxcCustomerStatus('N', 'A')).toBe('inactive');
  });

  it('maps desativado internet status as cancelled', () => {
    expect(mapIxcCustomerStatus('S', 'D')).toBe('cancelled');
  });

  it('maps block internet statuses as blocked', () => {
    expect(mapIxcCustomerStatus('S', 'CM')).toBe('blocked');
    expect(mapIxcCustomerStatus('S', 'FA')).toBe('blocked');
  });

  it('defaults unknown internet status from ativo flag', () => {
    expect(mapIxcCustomerStatus('S', undefined)).toBe('active');
    expect(mapIxcCustomerStatus(undefined, undefined)).toBe('inactive');
  });
});
