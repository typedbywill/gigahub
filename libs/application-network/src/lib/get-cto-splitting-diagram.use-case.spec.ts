import {
  GetCtoSplittingDiagramUseCase,
} from './get-cto-splitting-diagram.use-case';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type CtoSplittingDiagramQuery,
  type CtoSplittingDiagramReadModel,
} from './ports';

describe('GetCtoSplittingDiagramUseCase', () => {
  const fakeReadModel: CtoSplittingDiagramReadModel = {
    fatId: '10194',
    fatName: '10194',
    nodes: [
      {
        id: 'cable_in_10159',
        name: 'Entrada - FLAT Verde-A 205',
        kind: 'cable_in',
        portsIn: [],
        portsOut: [{ portNumber: 1, label: '1', colorHex: '#00aa00' }],
      },
      {
        id: 'splitter_11838',
        name: 'spliter 90/10',
        kind: 'splitter_unbalanced',
        ratio: '90/10',
        portsIn: [{ portNumber: 1, label: '1', colorHex: '#00aa00' }],
        portsOut: [
          { portNumber: 1, label: '1', colorHex: '#00aa00' },
          { portNumber: 2, label: '2', colorHex: '#ffffff' },
        ],
      },
    ],
    connections: [
      {
        id: '12320',
        sourceNodeId: 'cable_in_10159',
        sourcePortNumber: 1,
        targetNodeId: 'splitter_11838',
        targetPortNumber: 1,
        fiberColorHex: '#00aa00',
        trayNumber: 1,
      },
    ],
  };

  const fakeQuery: CtoSplittingDiagramQuery = {
    findByFatId: jest.fn(async (id: string) => {
      if (id === '10194') {
        return fakeReadModel;
      }
      return null;
    }),
  };

  it('returns diagram snapshot when FAT is found', async () => {
    const useCase = new GetCtoSplittingDiagramUseCase(fakeQuery);
    const result = await useCase.execute({ fatId: '10194' });

    expect(result.fatId).toBe('10194');
    expect(result.nodes).toHaveLength(2);
    expect(result.connections).toHaveLength(1);
  });

  it('throws FatNotFound when FAT does not exist in query', async () => {
    const useCase = new GetCtoSplittingDiagramUseCase(fakeQuery);
    await expect(useCase.execute({ fatId: '99999' })).rejects.toThrow(
      expect.objectContaining({
        code: ApplicationErrorCodes.FatNotFound,
      }),
    );
  });

  it('throws InvalidSearchQuery when FAT ID is empty', async () => {
    const useCase = new GetCtoSplittingDiagramUseCase(fakeQuery);
    await expect(useCase.execute({ fatId: '   ' })).rejects.toThrow(
      expect.objectContaining({
        code: ApplicationErrorCodes.InvalidSearchQuery,
      }),
    );
  });
});
