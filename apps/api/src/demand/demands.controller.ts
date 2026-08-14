import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApplicationError,
  ApplicationErrorCodes,
  AssignDemandUseCase,
  ClaimDemandUseCase,
  CloseDemandUseCase,
  GetDemandCountsUseCase,
  GetDemandUseCase,
  ListDemandsUseCase,
  OpenDemandUseCase,
  ReopenDemandUseCase,
  ResolveDemandUseCase,
  TransferDemandUseCase,
  UpdateDemandValuesUseCase,
  type DemandCountsResult,
  type PaginatedDemandsDto,
} from '@gigahub/application-demand';
import {
  assignDemandInputSchema,
  openDemandInputSchema,
  transferDemandInputSchema,
  updateDemandValuesInputSchema,
  type DemandDto,
} from '@gigahub/shared/contracts';
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from '../auth/access-token.guard';

@Controller('demands')
@UseGuards(AccessTokenGuard)
export class DemandsController {
  constructor(
    private readonly openDemand: OpenDemandUseCase,
    private readonly listDemands: ListDemandsUseCase,
    private readonly getDemand: GetDemandUseCase,
    private readonly getDemandCounts: GetDemandCountsUseCase,
    private readonly claimDemand: ClaimDemandUseCase,
    private readonly assignDemand: AssignDemandUseCase,
    private readonly transferDemand: TransferDemandUseCase,
    private readonly resolveDemand: ResolveDemandUseCase,
    private readonly closeDemand: CloseDemandUseCase,
    private readonly reopenDemand: ReopenDemandUseCase,
    private readonly updateDemandValues: UpdateDemandValuesUseCase,
  ) {}

  @Get()
  async list(
    @Query('view') view?: 'mine' | 'queue' | 'claimed' | 'all',
    @Query('status') status?: string,
    @Query('subjectId') subjectId?: string,
    @Query('queueId') queueId?: string,
    @Query('customerId') customerId?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Req() req?: AuthenticatedRequest,
  ): Promise<PaginatedDemandsDto> {
    const actorUserId = this.requireActor(req);
    try {
      return await this.listDemands.execute(actorUserId, {
        view,
        status: status as any,
        subjectId,
        queueId,
        customerId,
        q,
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
      });
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Get('counts')
  async counts(@Req() req: AuthenticatedRequest): Promise<DemandCountsResult> {
    const actorUserId = this.requireActor(req);
    try {
      return await this.getDemandCounts.execute(actorUserId);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Get(':id')
  async getById(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<DemandDto> {
    const actorUserId = this.requireActor(req);
    try {
      return await this.getDemand.execute(actorUserId, id);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post()
  async open(
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ): Promise<DemandDto> {
    const actorUserId = this.requireActor(req);
    const parsed = openDemandInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Invalid open demand payload',
        details: parsed.error.flatten(),
      });
    }
    try {
      return await this.openDemand.execute(actorUserId, parsed.data);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/claim')
  @HttpCode(HttpStatus.OK)
  async claim(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<DemandDto> {
    const actorUserId = this.requireActor(req);
    try {
      return await this.claimDemand.execute(actorUserId, id);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  async assign(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ): Promise<DemandDto> {
    const actorUserId = this.requireActor(req);
    const parsed = assignDemandInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Invalid assign demand payload',
        details: parsed.error.flatten(),
      });
    }
    try {
      return await this.assignDemand.execute(actorUserId, id, parsed.data);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/transfer')
  @HttpCode(HttpStatus.OK)
  async transfer(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ): Promise<DemandDto> {
    const actorUserId = this.requireActor(req);
    const parsed = transferDemandInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Invalid transfer demand payload',
        details: parsed.error.flatten(),
      });
    }
    try {
      return await this.transferDemand.execute(actorUserId, id, parsed.data);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  async resolve(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<DemandDto> {
    const actorUserId = this.requireActor(req);
    try {
      return await this.resolveDemand.execute(actorUserId, id);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  async close(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<DemandDto> {
    const actorUserId = this.requireActor(req);
    try {
      return await this.closeDemand.execute(actorUserId, id);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  async reopen(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<DemandDto> {
    const actorUserId = this.requireActor(req);
    try {
      return await this.reopenDemand.execute(actorUserId, id);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Patch(':id/values')
  async updateValues(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ): Promise<DemandDto> {
    const actorUserId = this.requireActor(req);
    const parsed = updateDemandValuesInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Invalid update demand values payload',
        details: parsed.error.flatten(),
      });
    }
    try {
      return await this.updateDemandValues.execute(
        actorUserId,
        id,
        parsed.data,
      );
    } catch (error) {
      this.rethrow(error);
    }
  }

  private requireActor(req?: AuthenticatedRequest): string {
    if (!req?.userId) {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: 'Missing access token subject',
      });
    }
    return req.userId;
  }

  private rethrow(error: unknown): never {
    if (error instanceof ApplicationError) {
      if (error.code === ApplicationErrorCodes.NotFound) {
        throw new NotFoundException({
          error: error.code,
          message: error.message,
        });
      }
      if (error.code === ApplicationErrorCodes.PermissionDenied) {
        throw new ForbiddenException({
          error: error.code,
          message: error.message,
          details: error.details,
        });
      }
      if (error.code === ApplicationErrorCodes.Conflict) {
        throw new ConflictException({
          error: error.code,
          message: error.message,
        });
      }
      if (error.code === ApplicationErrorCodes.ValidationError) {
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
