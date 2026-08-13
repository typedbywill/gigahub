import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApplicationError,
  ApplicationErrorCodes,
  CreateRoleUseCase,
  ListRolesUseCase,
  ReplaceRolePermissionsUseCase,
} from '@gigahub/application-identity';
import {
  createRoleRequestDtoSchema,
  replaceRolePermissionsRequestDtoSchema,
  type CreateRoleResponseDto,
  type ListRolesResponseDto,
  type ReplaceRolePermissionsResponseDto,
} from '@gigahub/shared/contracts';
import { AccessTokenGuard } from './access-token.guard';

@Controller('roles')
@UseGuards(AccessTokenGuard)
export class RolesController {
  constructor(
    private readonly listRoles: ListRolesUseCase,
    private readonly createRole: CreateRoleUseCase,
    private readonly replaceRolePermissions: ReplaceRolePermissionsUseCase,
  ) {}

  @Get()
  async list(): Promise<ListRolesResponseDto> {
    return this.listRoles.execute();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: unknown): Promise<CreateRoleResponseDto> {
    const parsed = createRoleRequestDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Invalid create role payload',
        details: parsed.error.flatten(),
      });
    }
    try {
      return await this.createRole.execute({
        name: parsed.data.name,
        slug: parsed.data.slug,
        permissionIds: parsed.data.permissionIds,
      });
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Put(':id/permissions')
  async replacePermissions(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<ReplaceRolePermissionsResponseDto> {
    const parsed = replaceRolePermissionsRequestDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Invalid role permissions payload',
        details: parsed.error.flatten(),
      });
    }
    try {
      return await this.replaceRolePermissions.execute({
        roleId: id,
        permissionIds: parsed.data.permissionIds,
      });
    } catch (error) {
      this.rethrow(error);
    }
  }

  private rethrow(error: unknown): never {
    if (error instanceof ApplicationError) {
      if (error.code === ApplicationErrorCodes.NotFound) {
        throw new NotFoundException({
          error: error.code,
          message: error.message,
        });
      }
      if (error.code === ApplicationErrorCodes.Conflict) {
        throw new ConflictException({
          error: error.code,
          message: error.message,
          details: error.details,
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
