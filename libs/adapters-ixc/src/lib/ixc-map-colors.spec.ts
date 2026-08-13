import { mapColorFromCaixaEstilo } from './ixc-map-colors';

describe('mapColorFromCaixaEstilo', () => {
  it('maps known estilo codes to Fiberdocs colors', () => {
    expect(mapColorFromCaixaEstilo('50r7nh0u')).toBe('#000000');
    expect(mapColorFromCaixaEstilo('8PbLzK3P')).toBe('#F9A825');
    expect(mapColorFromCaixaEstilo('7eTTWpDR')).toBe('#1565C0');
  });

  it('falls back to nome_tipo when code is unknown', () => {
    expect(mapColorFromCaixaEstilo('unknown', 'Caixa de Atendimento Verde')).toBe(
      '#2E7D32',
    );
  });

  it('defaults to black', () => {
    expect(mapColorFromCaixaEstilo(null)).toBe('#000000');
  });
});
