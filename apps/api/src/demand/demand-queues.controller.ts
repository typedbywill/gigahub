import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApplicationError,
  ApplicationErrorCodes,
  CreateDemandQueueUseCase,
  ListDemandQueuesUseCase,
} from '@gigahub/application-demand';
import {
  createDemandQueueInputSchema,
  type DemandQueueDto,
} from '@gigahub/shared/contracts';
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from '../auth/access-token.guard';

@Controller('demand-queues')
@UseGuards(AccessTokenGuard)
export class DemandQueuesController {
  constructor(
    private readonly listDemandQueues: ListDemandQueuesUseCase,
    private readonly createDemandQueue: CreateDemandQueueUseCase,
  ) {}

  @Get()
  async list(
    @Query('activeOnly') activeOnly?: string,
    @Req() req?: AuthenticatedRequest,
  ): Promise<DemandQueueDto[]> {
    const actorUserId = this.requireActor(req);
    try {
      return await this.listDemandQueues.execute(
        actorUserId,
        activeOnly === 'true',
      );
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post()
  async create(
    @Body() body: unknown,
    @Req() req?: AuthenticatedRequest,
  ): Promise<DemandQueueDto> {
    const actorUserId = this.requireActor(req);
    const parsed = createDemandQueueInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Invalid create demand queue payload',
        details: parsed.error.flatten(),
      });
    }
    try {
      return await this.createDemandQueue.execute(actorUserId, parsed.data);
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
