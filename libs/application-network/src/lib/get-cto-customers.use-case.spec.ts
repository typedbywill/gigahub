import { ApplicationError, ApplicationErrorCodes } from './ports';
import { GetCtoCustomersUseCase } from './get-cto-customers.use-case';
import type { CtoCustomersQuery, CtoCustomersReadModel } from './ports';

describe('GetCtoCustomersUseCase', () => {
  const mockReadModel: CtoCustomersReadModel = {
    fatId: '10194',
    fatName: '11.02.04',
    totalPorts: 16,
    occupiedPorts: 2,
    availablePorts: 14,
    customers: [
      {
        radUsuarioId: '1',
        clienteId: '100',
        login: 'cliente1@fibra',
        portaFtth: 1,
        razaoSocial: 'Cliente Um',
        online: true,
        signal: {
          rxPowerDbm: -19.5,
          txPowerDbm: 2.1,
          quality: 'EXCELLENT',
          isMock: true,
        },
      },
      {
        radUsuarioId: '2',
        clienteId: '200',
        login: 'cliente2@fibra',
        portaFtth: 2,
        razaoSocial: 'Cliente Dois',
        online: false,
        signal: {
          rxPowerDbm: -40.0,
          txPowerDbm: 0.0,
          quality: 'OFFLINE',
          isMock: true,
        },
      },
    ],
  };

  const mockQuery: CtoCustomersQuery = {
    findByFatId: jest.fn(async (fatId: string) => {
      if (fatId === '10194') return mockReadModel;
      return null;
    }),
  };

  it('returns CTO customers list for a valid fatId', async () => {
    const useCase = new GetCtoCustomersUseCase(mockQuery);
    const result = await useCase.execute({ fatId: '10194' });

    expect(result.fatId).toBe('10194');
    expect(result.fatName).toBe('11.02.04');
    expect(result.totalPorts).toBe(16);
    expect(result.customers).toHaveLength(2);
    expect(result.customers[0].login).toBe('cliente1@fibra');
    expect(result.customers[0].portaFtth).toBe(1);
    expect(result.customers[0].signal.isMock).toBe(true);
  });

  it('throws FatNotFound when query returns null', async () => {
    const useCase = new GetCtoCustomersUseCase(mockQuery);
    await expect(useCase.execute({ fatId: '99999' })).rejects.toThrow(
      ApplicationError,
    );
    await expect(useCase.execute({ fatId: '99999' })).rejects.toMatchObject({
      code: ApplicationErrorCodes.FatNotFound,
    });
  });

  it('throws InvalidSearchQuery when fatId is empty', async () => {
    const useCase = new GetCtoCustomersUseCase(mockQuery);
    await expect(useCase.execute({ fatId: '   ' })).rejects.toMatchObject({
      code: ApplicationErrorCodes.InvalidSearchQuery,
    });
  });
});
