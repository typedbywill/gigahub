import { ListNearbyFiberAccessTerminalsUseCase } from './list-nearby-fiber-access-terminals.use-case';
import { ListNearbyFiberCablesUseCase } from './list-nearby-fiber-cables.use-case';
import {
  ApplicationErrorCodes,
  type FiberAccessTerminalNearbyQuery,
  type FiberCableNearbyQuery,
  type NearbyFiberAccessTerminalReadModel,
  type NearbyFiberCableReadModel,
} from './ports';

describe('ListNearbyFiberAccessTerminalsUseCase', () => {
  it('applies the default radius and sorts by distance', async () => {
    const terminals: FiberAccessTerminalNearbyQuery = {
      findNearby: jest.fn(async () => [
        {
          id: 'fat-2',
          idErp: '2',
          name: 'Far',
          location: { latitude: -29.69, longitude: -50.13 },
          distanceMeters: 400,
        },
        {
          id: 'fat-1',
          idErp: '1',
          name: 'Near',
          location: { latitude: -29.68, longitude: -50.12 },
          distanceMeters: 100,
        },
      ] satisfies NearbyFiberAccessTerminalReadModel[]),
    };

    const useCase = new ListNearbyFiberAccessTerminalsUseCase(terminals);
    const result = await useCase.execute({
      latitude: -29.68,
      longitude: -50.12,
    });

    expect(result.radiusMeters).toBe(5_000);
    expect(result.items.map((item) => item.id)).toEqual(['fat-1', 'fat-2']);
    expect(terminals.findNearby).toHaveBeenCalledWith(
      { latitude: -29.68, longitude: -50.12 },
      5_000,
    );
  });

  it('rejects an invalid radius', async () => {
    const terminals: FiberAccessTerminalNearbyQuery = {
      findNearby: jest.fn(),
    };
    const useCase = new ListNearbyFiberAccessTerminalsUseCase(terminals);

    await expect(
      useCase.execute({
        latitude: -29.68,
        longitude: -50.12,
        radiusMeters: 0,
      }),
    ).rejects.toMatchObject({
      code: ApplicationErrorCodes.InvalidNearbyQuery,
    });
    expect(terminals.findNearby).not.toHaveBeenCalled();
  });
});

describe('ListNearbyFiberCablesUseCase', () => {
  it('uses an explicit radius', async () => {
    const cables: FiberCableNearbyQuery = {
      findNearby: jest.fn(async () => [
        {
          id: 'cab-1',
          idErp: '10',
          name: 'Cable',
          projectIdErp: '1',
          path: [
            { latitude: -29.68, longitude: -50.12 },
            { latitude: -29.681, longitude: -50.121 },
          ],
          distanceMeters: 50,
        },
      ] satisfies NearbyFiberCableReadModel[]),
    };

    const useCase = new ListNearbyFiberCablesUseCase(cables);
    const result = await useCase.execute({
      latitude: -29.68,
      longitude: -50.12,
      radiusMeters: 1_500,
    });

    expect(result.radiusMeters).toBe(1_500);
    expect(result.items).toHaveLength(1);
    expect(cables.findNearby).toHaveBeenCalledWith(
      { latitude: -29.68, longitude: -50.12 },
      1_500,
    );
  });
});
