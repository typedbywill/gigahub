import { geoPoint } from '@gigahub/shared/kernel';
import {
  ListNearbyFiberSpliceEnclosuresUseCase,
} from './list-nearby-fiber-splice-enclosures.use-case';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type FiberSpliceEnclosureNearbyQuery,
  type NearbyFiberSpliceEnclosureReadModel,
} from './ports';

describe('ListNearbyFiberSpliceEnclosuresUseCase', () => {
  const queryCenter = { latitude: -29.62, longitude: -50.99 };

  it('lists and sorts enclosures by distance', async () => {
    const mockQuery: FiberSpliceEnclosureNearbyQuery = {
      findNearby: jest.fn().mockResolvedValue([
        {
          id: '2',
          idErp: '2',
          name: 'CEO 2',
          location: geoPoint(-29.63, -50.99),
          distanceMeters: 1100,
          mapColorHex: '#8b5cf6',
          traysCount: 2,
        },
        {
          id: '1',
          idErp: '1',
          name: 'CEO 1',
          location: geoPoint(-29.621, -50.991),
          distanceMeters: 150,
          mapColorHex: '#8b5cf6',
          traysCount: 4,
        },
      ] satisfies NearbyFiberSpliceEnclosureReadModel[]),
    };


    const useCase = new ListNearbyFiberSpliceEnclosuresUseCase(mockQuery);
    const result = await useCase.execute({
      latitude: queryCenter.latitude,
      longitude: queryCenter.longitude,
      radiusMeters: 2000,
    });

    expect(result.radiusMeters).toBe(2000);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].id).toBe('1');
    expect(result.items[1].id).toBe('2');
  });

  it('throws ApplicationError on invalid coordinates', async () => {
    const mockQuery: FiberSpliceEnclosureNearbyQuery = {
      findNearby: jest.fn(),
    };
    const useCase = new ListNearbyFiberSpliceEnclosuresUseCase(mockQuery);

    await expect(
      useCase.execute({
        latitude: 999,
        longitude: 0,
      }),
    ).rejects.toThrow(ApplicationError);

    await expect(
      useCase.execute({
        latitude: 999,
        longitude: 0,
      }),
    ).rejects.toMatchObject({
      code: ApplicationErrorCodes.InvalidNearbyQuery,
    });
  });

  it('throws ApplicationError on invalid radius', async () => {
    const mockQuery: FiberSpliceEnclosureNearbyQuery = {
      findNearby: jest.fn(),
    };
    const useCase = new ListNearbyFiberSpliceEnclosuresUseCase(mockQuery);

    await expect(
      useCase.execute({
        latitude: queryCenter.latitude,
        longitude: queryCenter.longitude,
        radiusMeters: -500,
      }),
    ).rejects.toMatchObject({
      code: ApplicationErrorCodes.InvalidNearbyQuery,
    });
  });
});
