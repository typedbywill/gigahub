import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
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
  CreateSubjectUseCase,
  GetSubjectUseCase,
  ListSubjectsUseCase,
  UpdateSubjectUseCase,
} from '@gigahub/application-demand';
import {
  createSubjectInputSchema,
  updateSubjectInputSchema,
  type DemandSubjectDto,
} from '@gigahub/shared/contracts';
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from '../auth/access-token.guard';

@Controller('subjects')
@UseGuards(AccessTokenGuard)
export class SubjectsController {
  constructor(
    private readonly listSubjects: ListSubjectsUseCase,
    private readonly getSubject: GetSubjectUseCase,
    private readonly createSubject: CreateSubjectUseCase,
    private readonly updateSubject: UpdateSubjectUseCase,
  ) {}

  @Get()
  async list(
    @Query('activeOnly') activeOnly?: string,
    @Req() req?: AuthenticatedRequest,
  ): Promise<DemandSubjectDto[]> {
    const actorUserId = this.requireActor(req);
    try {
      return await this.listSubjects.execute(
        actorUserId,
        activeOnly === 'true',
      );
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Get(':id')
  async getById(
    @Param('id') id: string,
    @Req() req?: AuthenticatedRequest,
  ): Promise<DemandSubjectDto> {
    const actorUserId = this.requireActor(req);
    try {
      return await this.getSubject.execute(actorUserId, id);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post()
  async create(
    @Body() body: unknown,
    @Req() req?: AuthenticatedRequest,
  ): Promise<DemandSubjectDto> {
    const actorUserId = this.requireActor(req);
    const parsed = createSubjectInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Invalid create subject payload',
        details: parsed.error.flatten(),
      });
    }
    try {
      return await this.createSubject.execute(actorUserId, parsed.data);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req?: AuthenticatedRequest,
  ): Promise<DemandSubjectDto> {
    const actorUserId = this.requireActor(req);
    const parsed = updateSubjectInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Invalid update subject payload',
        details: parsed.error.flatten(),
      });
    }
    try {
      return await this.updateSubject.execute(actorUserId, id, parsed.data);
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
