import { getContrastTextColor } from './color-contrast';

describe('getContrastTextColor', () => {
  it('returns dark text for light and bright background colors', () => {
    expect(getContrastTextColor('#ffffff')).toBe('#0f172a');
    expect(getContrastTextColor('#fef08a')).toBe('#0f172a'); // amarelo claro
    expect(getContrastTextColor('#e2e8f0')).toBe('#0f172a'); // cinza claro
    expect(getContrastTextColor('#a7f3d0')).toBe('#0f172a'); // verde claro
    expect(getContrastTextColor('#facc15')).toBe('#0f172a'); // amarelo sol
  });

  it('returns white text for dark and black background colors', () => {
    expect(getContrastTextColor('#000000')).toBe('#ffffff'); // preto
    expect(getContrastTextColor('#0f172a')).toBe('#ffffff'); // slate 900
    expect(getContrastTextColor('#1e293b')).toBe('#ffffff');
    expect(getContrastTextColor('#0284c7')).toBe('#ffffff'); // sky escuro
    expect(getContrastTextColor('#b91c1c')).toBe('#ffffff'); // vermelho escuro
  });

  it('handles null, undefined or fallback values safely', () => {
    expect(getContrastTextColor(null)).toBe('#ffffff');
    expect(getContrastTextColor(undefined)).toBe('#ffffff');
    expect(getContrastTextColor('')).toBe('#ffffff');
  });
});
