import { hashIxcPassword, formatIxcName } from './ixc-password';

describe('ixc-password', () => {
  it('hashes with SHA-256 hex', () => {
    expect(hashIxcPassword('secret')).toBe(
      '2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b',
    );
  });

  it('formats names', () => {
    expect(formatIxcName('maria SILVA (ti)')).toBe('Maria Silva');
  });
});
