import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApplicationError,
  ApplicationErrorCodes,
  ListNearbyFiberAccessTerminalsUseCase,
  ListNearbyFiberCablesUseCase,
} from '@gigahub/application-network';
import {
  nearbyProjectQueryDtoSchema,
  type NearbyFiberAccessTerminalsResponseDto,
  type NearbyFiberCablesResponseDto,
} from '@gigahub/shared/contracts';
import { AccessTokenGuard } from '../auth/access-token.guard';

/**
 * Project FTTH map layers (nearby by lat/lng).
 *
 * Implemented:
 * - GET /projeto/fat
 * - GET /projeto/cabos
 *
 * Planned (same query shape):
 * - GET /projeto/ceo
 * - GET /projeto/postes
 */
@Controller('projeto')
@UseGuards(AccessTokenGuard)
export class ProjetoController {
  constructor(
    private readonly listNearbyFats: ListNearbyFiberAccessTerminalsUseCase,
    private readonly listNearbyCables: ListNearbyFiberCablesUseCase,
  ) {}

  @Get('fat')
  async listNearbyFiberAccessTerminals(
    @Query() query: unknown,
  ): Promise<NearbyFiberAccessTerminalsResponseDto> {
    const parsed = this.parseNearbyQuery(query);
    try {
      const result = await this.listNearbyFats.execute({
        latitude: parsed.lat,
        longitude: parsed.lng,
        radiusMeters: parsed.radius,
      });
      return {
        radiusMeters: result.radiusMeters,
        items: result.items.map((item) => ({
          id: item.id,
          idErp: item.idErp,
          name: item.name,
          location: {
            latitude: item.location.latitude,
            longitude: item.location.longitude,
          },
          distanceMeters: item.distanceMeters,
        })),
      };
    } catch (error) {
      this.rethrowNearbyError(error);
    }
  }

  @Get('cabos')
  async listNearbyFiberCables(
    @Query() query: unknown,
  ): Promise<NearbyFiberCablesResponseDto> {
    const parsed = this.parseNearbyQuery(query);
    try {
      const result = await this.listNearbyCables.execute({
        latitude: parsed.lat,
        longitude: parsed.lng,
        radiusMeters: parsed.radius,
      });
      return {
        radiusMeters: result.radiusMeters,
        items: result.items.map((item) => ({
          id: item.id,
          idErp: item.idErp,
          name: item.name,
          projectIdErp: item.projectIdErp,
          lengthMeters: item.lengthMeters,
          path: item.path.map((point) => ({
            latitude: point.latitude,
            longitude: point.longitude,
          })),
          distanceMeters: item.distanceMeters,
        })),
      };
    } catch (error) {
      this.rethrowNearbyError(error);
    }
  }

  private parseNearbyQuery(query: unknown) {
    const parsed = nearbyProjectQueryDtoSchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Invalid nearby project query',
        details: parsed.error.flatten(),
      });
    }
    return parsed.data;
  }

  private rethrowNearbyError(error: unknown): never {
    if (error instanceof ApplicationError) {
      if (error.code === ApplicationErrorCodes.InvalidNearbyQuery) {
        throw new BadRequestException({
          error: error.code,
          message: error.message,
          details: error.details,
        });
      }
    }
    throw error;
  }
}
