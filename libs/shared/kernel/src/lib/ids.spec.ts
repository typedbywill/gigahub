import { customerId } from './ids';
import { DomainError, DomainErrorCodes } from './domain-error';

describe('branded ids', () => {
  it('accepts a non-empty value', () => {
    expect(customerId(' 123 ')).toBe('123');
  });

  it('rejects empty values', () => {
    expect(() => customerId('   ')).toThrow(DomainError);
    try {
      customerId('');
    } catch (error) {
      expect(error).toMatchObject({ code: DomainErrorCodes.InvalidId });
    }
  });
});
