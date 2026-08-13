import {
  DEFAULT_NEARBY_RADIUS_METERS,
  assertNearbyRadiusMeters,
} from '@gigahub/domain/fiber-access-terminal';
import { DomainError, geoPoint } from '@gigahub/shared/kernel';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type FiberAccessTerminalNearbyQuery,
  type NearbyFiberAccessTerminalReadModel,
} from './ports';

export interface ListNearbyFiberAccessTerminalsQuery {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
}

export interface ListNearbyFiberAccessTerminalsResult {
  items: NearbyFiberAccessTerminalReadModel[];
  radiusMeters: number;
}

export class ListNearbyFiberAccessTerminalsUseCase {
  constructor(
    private readonly terminals: FiberAccessTerminalNearbyQuery,
  ) {}

  async execute(
    query: ListNearbyFiberAccessTerminalsQuery,
  ): Promise<ListNearbyFiberAccessTerminalsResult> {
    const center = this.parseCenter(query.latitude, query.longitude);
    const radiusMeters = this.parseRadius(query.radiusMeters);
    const items = await this.terminals.findNearby(center, radiusMeters);
    return {
      items: [...items].sort((a, b) => a.distanceMeters - b.distanceMeters),
      radiusMeters,
    };
  }

  private parseCenter(latitude: number, longitude: number) {
    try {
      return geoPoint(latitude, longitude);
    } catch (error) {
      if (error instanceof DomainError) {
        throw new ApplicationError(
          ApplicationErrorCodes.InvalidNearbyQuery,
          error.message,
          error.details,
        );
      }
      throw error;
    }
  }

  private parseRadius(radiusMeters: number | undefined): number {
    const value = radiusMeters ?? DEFAULT_NEARBY_RADIUS_METERS;
    try {
      return assertNearbyRadiusMeters(value);
    } catch (error) {
      if (error instanceof DomainError) {
        throw new ApplicationError(
          ApplicationErrorCodes.InvalidNearbyQuery,
          error.message,
          error.details,
        );
      }
      throw error;
    }
  }
}
