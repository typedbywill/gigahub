import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApplicationError,
  ApplicationErrorCodes,
  ListNearbyFiberAccessTerminalsUseCase,
  ListNearbyFiberCablesUseCase,
  ListNearbyFiberSpliceEnclosuresUseCase,
  SearchProjectNetworkUseCase,
  GetCtoSplittingDiagramUseCase,
  GetCtoCustomersUseCase,
} from '@gigahub/application-network';
import {
  nearbyProjectQueryDtoSchema,
  searchProjectNetworkQueryDtoSchema,
  type NearbyFiberAccessTerminalsResponseDto,
  type NearbyFiberCablesResponseDto,
  type NearbyFiberSpliceEnclosuresResponseDto,
  type SearchProjectNetworkResponseDto,
  type CtoSplittingDiagramResponseDto,
  type CtoCustomersResponseDto,
} from '@gigahub/shared/contracts';
import { AccessTokenGuard } from '../auth/access-token.guard';

/**
 * Project FTTH map layers (nearby by lat/lng), global search, and CTO splitting diagram.
 *
 * Implemented:
 * - GET /projeto/fat
 * - GET /projeto/fat/:id/splitagem
 * - GET /projeto/fat/:id/clientes
 * - GET /projeto/cabos
 * - GET /projeto/ceo
 * - GET /projeto/busca
 *
 * Planned (same nearby query shape):
 * - GET /projeto/postes
 */
@Controller('projeto')
@UseGuards(AccessTokenGuard)
export class ProjetoController {
  constructor(
    private readonly listNearbyFats: ListNearbyFiberAccessTerminalsUseCase,
    private readonly listNearbyCables: ListNearbyFiberCablesUseCase,
    private readonly listNearbyCeos: ListNearbyFiberSpliceEnclosuresUseCase,
    private readonly searchProjectNetwork: SearchProjectNetworkUseCase,
    private readonly getCtoSplittingDiagram: GetCtoSplittingDiagramUseCase,
    private readonly getCtoCustomers: GetCtoCustomersUseCase,
  ) {}

  @Get('fat/:id/clientes')
  async getFatCustomers(
    @Param('id') id: string,
  ): Promise<CtoCustomersResponseDto> {
    try {
      const result = await this.getCtoCustomers.execute({ fatId: id });
      return {
        fatId: result.fatId,
        fatName: result.fatName,
        totalPorts: result.totalPorts,
        occupiedPorts: result.occupiedPorts,
        availablePorts: result.availablePorts,
        customers: result.customers.map((c) => ({
          radUsuarioId: c.radUsuarioId,
          clienteId: c.clienteId,
          contratoId: c.contratoId,
          login: c.login,
          mac: c.mac,
          portaFtth: c.portaFtth,
          razaoSocial: c.razaoSocial,
          nomeFantasia: c.nomeFantasia,
          cpfCnpj: c.cpfCnpj,
          telefone: c.telefone,
          endereco: c.endereco,
          online: c.online,
          signal: {
            rxPowerDbm: c.signal.rxPowerDbm,
            txPowerDbm: c.signal.txPowerDbm,
            quality: c.signal.quality,
            isMock: c.signal.isMock,
          },
        })),
      };
    } catch (error) {
      this.rethrowProjectError(error);
    }
  }

  @Get('fat/:id/splitagem')
  async getFatSplittingDiagram(
    @Param('id') id: string,
  ): Promise<CtoSplittingDiagramResponseDto> {
    try {
      const result = await this.getCtoSplittingDiagram.execute({ fatId: id });
      return {
        fatId: result.fatId,
        fatName: result.fatName,
        nodes: result.nodes.map((node) => ({
          id: node.id,
          elementId: node.elementId,
          name: node.name,
          kind: node.kind,
          portsIn: node.portsIn.map((p) => ({
            portNumber: p.portNumber,
            label: p.label,
            colorHex: p.colorHex,
          })),
          portsOut: node.portsOut.map((p) => ({
            portNumber: p.portNumber,
            label: p.label,
            colorHex: p.colorHex,
          })),
          ratio: node.ratio,
        })),
        connections: result.connections.map((c) => ({
          id: c.id,
          sourceNodeId: c.sourceNodeId,
          sourcePortNumber: c.sourcePortNumber,
          targetNodeId: c.targetNodeId,
          targetPortNumber: c.targetPortNumber,
          fiberColorHex: c.fiberColorHex,
          trayNumber: c.trayNumber,
        })),
      };
    } catch (error) {
      this.rethrowProjectError(error);
    }
  }


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
          portCount: item.portCount,
          occupiedPortCount: item.occupiedPortCount,
          availablePortCount: item.availablePortCount,
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

  @Get('ceo')
  async listNearbyFiberSpliceEnclosures(

    @Query() query: unknown,
  ): Promise<NearbyFiberSpliceEnclosuresResponseDto> {
    const parsed = this.parseNearbyQuery(query);
    try {
      const result = await this.listNearbyCeos.execute({
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
          location: {
            latitude: item.location.latitude,
            longitude: item.location.longitude,
          },
          distanceMeters: item.distanceMeters,
          mapColorHex: item.mapColorHex,
          traysCount: item.traysCount,
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
      if (error.code === ApplicationErrorCodes.FatNotFound) {
        throw new NotFoundException({
          error: error.code,
          message: error.message,
          details: error.details,
        });
      }
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

