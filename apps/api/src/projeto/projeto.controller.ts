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
  SearchProjectNetworkUseCase,
} from '@gigahub/application-network';
import {
  nearbyProjectQueryDtoSchema,
  searchProjectNetworkQueryDtoSchema,
  type NearbyFiberAccessTerminalsResponseDto,
  type NearbyFiberCablesResponseDto,
  type SearchProjectNetworkResponseDto,
} from '@gigahub/shared/contracts';
import { AccessTokenGuard } from '../auth/access-token.guard';

/**
 * Project FTTH map layers (nearby by lat/lng) and global search.
 *
 * Implemented:
 * - GET /projeto/fat
 * - GET /projeto/cabos
 * - GET /projeto/busca
 *
 * Planned (same nearby query shape):
 * - GET /projeto/ceo
 * - GET /projeto/postes
 */
@Controller('projeto')
@UseGuards(AccessTokenGuard)
export class ProjetoController {
  constructor(
    private readonly listNearbyFats: ListNearbyFiberAccessTerminalsUseCase,
    private readonly listNearbyCables: ListNearbyFiberCablesUseCase,
    private readonly searchProjectNetwork: SearchProjectNetworkUseCase,
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
          mapColorHex: item.mapColorHex,
        })),
      };
    } catch (error) {
      this.rethrowProjectError(error);
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
          strokeColorHex: item.strokeColorHex,
          strokeWidth: item.strokeWidth,
          strokeDashed: item.strokeDashed,
          cableTypeName: item.cableTypeName,
        })),
      };
    } catch (error) {
      this.rethrowProjectError(error);
    }
  }

  @Get('busca')
  async search(
    @Query() query: unknown,
  ): Promise<SearchProjectNetworkResponseDto> {
    const parsed = this.parseSearchQuery(query);
    try {
      const result = await this.searchProjectNetwork.execute({
        q: parsed.q,
        kind: parsed.kind,
        limit: parsed.limit,
      });
      return {
        q: result.q,
        kind: result.kind,
        limit: result.limit,
        items: result.items.map((item) => ({
          kind: item.kind,
          id: item.id,
          idErp: item.idErp,
          name: item.name,
          location: {
            latitude: item.location.latitude,
            longitude: item.location.longitude,
          },
          cableTypeName: item.cableTypeName,
        })),
      };
    } catch (error) {
      this.rethrowProjectError(error);
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

  private parseSearchQuery(query: unknown) {
    const parsed = searchProjectNetworkQueryDtoSchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Invalid project network search query',
        details: parsed.error.flatten(),
      });
    }
    return parsed.data;
  }

  private rethrowProjectError(error: unknown): never {
    if (error instanceof ApplicationError) {
      if (
        error.code === ApplicationErrorCodes.InvalidNearbyQuery ||
        error.code === ApplicationErrorCodes.InvalidSearchQuery
      ) {
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
