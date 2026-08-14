import type { Pool } from 'mysql2/promise';
import {
  MysqlCtoSplittingDiagramQuery,
  getFiberColor,
} from './mysql-cto-splitting-diagram-query';

describe('MysqlCtoSplittingDiagramQuery', () => {
  it('returns fiber colors accurately by sequence', () => {
    expect(getFiberColor(1)).toBe('#00aa00'); // Green
    expect(getFiberColor(2)).toBe('#ffff00'); // Yellow
    expect(getFiberColor(3)).toBe('#ffffff'); // White
    expect(getFiberColor(4)).toBe('#0055ff'); // Blue
  });

  it('returns null for non-numeric FAT ID', async () => {
    const fakePool = {
      query: jest.fn(),
    } as unknown as Pool;

    const query = new MysqlCtoSplittingDiagramQuery(fakePool);
    const result = await query.findByFatId('invalid_id');
    expect(result).toBeNull();
  });

  it('returns parsed nodes and connections for a box with fusions', async () => {
    const fakePool = {
      query: jest.fn().mockImplementation(async (sql: string) => {
        if (sql.includes('FROM rad_caixa_ftth')) {
          return [[{ id: 10194, descricao: '10194' }]];
        }
        if (sql.includes('FROM df_fusao')) {
          return [
            [
              {
                id: 12320,
                porta_elemento_origem: 1,
                interface_elemento_origem: 1,
                id_elemento_origem: 10159,
                io_elemento_origem: 'IN',
                porta_elemento_destino: 1,
                interface_elemento_destino: 1,
                id_elemento_destino: 11838,
                io_elemento_destino: '',
                tipo_elemento_origem: 'cabo',
                tipo_elemento_destino: 'splitter',
                bandeja: 1,
                orig_elem_id: 10159,
                orig_elem_nome: 'FLAT Verde-A 205',
                orig_tipo_nome: 'FLAT Verde-A',
                dest_elem_id: 11838,
                dest_elem_nome: 'spliter 90/10',
                dest_tipo_nome: 'spliter 90/10',
                dest_split_tipo: 'DS',
                dest_split_in: 1,
                dest_split_out: 2,
              },
            ],
          ];
        }
        return [[]];
      }),
    } as unknown as Pool;

    const query = new MysqlCtoSplittingDiagramQuery(fakePool);
    const result = await query.findByFatId('10194');

    expect(result).not.toBeNull();
    expect(result?.fatId).toBe('10194');
    expect(result?.fatName).toBe('10194');
    expect(result?.nodes).toHaveLength(2);
    expect(result?.connections).toHaveLength(1);
    expect(result?.connections[0].sourceNodeId).toBe('cable_in_10159');
    expect(result?.connections[0].targetNodeId).toBe('splitter_11838');
  });
});
