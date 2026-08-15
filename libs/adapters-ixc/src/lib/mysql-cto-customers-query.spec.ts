import type { Pool } from 'mysql2/promise';
import { MysqlCtoCustomersQuery } from './mysql-cto-customers-query';

describe('MysqlCtoCustomersQuery', () => {
  it('returns null for non-numeric or empty FAT ID', async () => {
    const fakePool = {
      query: jest.fn(),
    } as unknown as Pool;

    const query = new MysqlCtoCustomersQuery(fakePool);
    expect(await query.findByFatId('invalid')).toBeNull();
    expect(await query.findByFatId('')).toBeNull();
  });

  it('returns null when box is not found in database', async () => {
    const fakePool = {
      query: jest.fn().mockResolvedValue([[]]),
    } as unknown as Pool;

    const query = new MysqlCtoCustomersQuery(fakePool);
    const result = await query.findByFatId('99999');
    expect(result).toBeNull();
  });

  it('returns real customers with formatted addresses and mock optical signal', async () => {
    const fakePool = {
      query: jest.fn().mockImplementation(async (sql: string) => {
        if (sql.includes('FROM rad_caixa_ftth')) {
          return [
            [
              {
                id: 10194,
                descricao: '11.02.04',
                capacidade: 16,
              },
            ],
          ];
        }
        if (sql.includes('FROM radusuarios')) {
          return [
            [
              {
                rad_usuario_id: 85278,
                id_cliente: 29837,
                id_contrato: 35122,
                login: 'mariasilva@giga',
                mac: '48:8A:D2:00:11:22',
                ftth_porta: 1,
                online: 'S',
                razao: 'Maria Silva',
                fantasia: '',
                cnpj_cpf: '123.456.789-00',
                telefone_celular: '(31) 99999-8888',
                endereco: 'Rua das Flores',
                numero: '123',
                bairro: 'Centro',
                cidade: 'Ipatinga',
              },
              {
                rad_usuario_id: 85279,
                id_cliente: 29838,
                id_contrato: 35123,
                login: 'joaosantos@giga',
                mac: '48:8A:D2:00:11:33',
                ftth_porta: 2,
                online: 'N',
                razao: 'João Santos',
                fantasia: 'Santos ME',
                cnpj_cpf: '11.222.333/0001-44',
                telefone_celular: '(31) 98888-7777',
                endereco: 'Av Brasil',
                numero: '500',
                bairro: 'Veneza',
                cidade: 'Ipatinga',
              },
            ],
          ];
        }
        return [[]];
      }),
    } as unknown as Pool;

    const query = new MysqlCtoCustomersQuery(fakePool);
    const result = await query.findByFatId('10194');

    expect(result).not.toBeNull();
    expect(result?.fatId).toBe('10194');
    expect(result?.fatName).toBe('11.02.04');
    expect(result?.totalPorts).toBe(16);
    expect(result?.occupiedPorts).toBe(2);
    expect(result?.availablePorts).toBe(14);

    expect(result?.customers).toHaveLength(2);
    expect(result?.customers[0].login).toBe('mariasilva@giga');
    expect(result?.customers[0].portaFtth).toBe(1);
    expect(result?.customers[0].online).toBe(true);
    expect(result?.customers[0].endereco).toBe('Rua das Flores, nº 123, Centro, Ipatinga');
    expect(result?.customers[0].signal.isMock).toBe(true);
    expect(result?.customers[0].signal.rxPowerDbm).toBeDefined();

    expect(result?.customers[1].login).toBe('joaosantos@giga');
    expect(result?.customers[1].portaFtth).toBe(2);
    expect(result?.customers[1].online).toBe(false);
    expect(result?.customers[1].signal.quality).toBe('OFFLINE');
  });
});
