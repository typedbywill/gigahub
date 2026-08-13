import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApplicationError,
  ApplicationErrorCodes,
  ClearUserAvatarUseCase,
  GetUserUseCase,
  InactivateUserUseCase,
  ListUsersUseCase,
  ReplaceUserRolesUseCase,
  SetUserAvatarUseCase,
  UpdateUserProfileUseCase,
} from '@gigahub/application-identity';
import {
  replaceUserRolesRequestDtoSchema,
  updateUserRequestDtoSchema,
  userListQueryDtoSchema,
  type InactivateUserResponseDto,
  type PaginatedUsersDto,
  type ReplaceUserRolesResponseDto,
  type UpdateUserAvatarResponseDto,
  type UpdateUserResponseDto,
  type UserDetailDto,
} from '@gigahub/shared/contracts';
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from './access-token.guard';

@Controller('users')
@UseGuards(AccessTokenGuard)
export class UsersController {
  constructor(
    private readonly listUsers: ListUsersUseCase,
    private readonly getUser: GetUserUseCase,
    private readonly inactivateUser: InactivateUserUseCase,
    private readonly updateUserProfile: UpdateUserProfileUseCase,
    private readonly setUserAvatar: SetUserAvatarUseCase,
    private readonly clearUserAvatar: ClearUserAvatarUseCase,
    private readonly replaceUserRoles: ReplaceUserRolesUseCase,
  ) {}

  @Get()
  async list(@Query() query: Record<string, unknown>): Promise<PaginatedUsersDto> {
    const parsed = userListQueryDtoSchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Invalid users list query',
        details: parsed.error.flatten(),
      });
    }
    return this.listUsers.execute(parsed.data);
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<UserDetailDto> {
    try {
      return await this.getUser.execute({ userId: id });
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Patch(':id')
  async updateProfile(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<UpdateUserResponseDto> {
    const parsed = updateUserRequestDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Invalid user update payload',
        details: parsed.error.flatten(),
      });
    }
    try {
      return await this.updateUserProfile.execute({
        userId: id,
        name: parsed.data.name,
        email: parsed.data.email,
      });
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Put(':id/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile()
    file:
      | {
          buffer: Buffer;
          mimetype: string;
        }
      | undefined,
  ): Promise<UpdateUserAvatarResponseDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Avatar file is required',
      });
    }
    try {
      return await this.setUserAvatar.execute({
        userId: id,
        file: file.buffer,
        contentType: file.mimetype,
      });
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Delete(':id/avatar')
  async removeAvatar(
    @Param('id') id: string,
  ): Promise<UpdateUserAvatarResponseDto> {
    try {
      return await this.clearUserAvatar.execute({ userId: id });
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Put(':id/roles')
  async replaceRoles(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ): Promise<ReplaceUserRolesResponseDto> {
    const parsed = replaceUserRolesRequestDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Invalid roles payload',
        details: parsed.error.flatten(),
      });
    }
    if (!req.userId) {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: 'Missing access token subject',
      });
    }
    try {
      return await this.replaceUserRoles.execute({
        userId: id,
        roleIds: parsed.data.roleIds,
        grantedByUserId: req.userId,
      });
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/inactivate')
  @HttpCode(HttpStatus.OK)
  async inactivate(@Param('id') id: string): Promise<InactivateUserResponseDto> {
    try {
      return await this.inactivateUser.execute({ userId: id });
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
      if (error.code === ApplicationErrorCodes.ErpUnavailable) {
        throw new ServiceUnavailableException({
          error: error.code,
          message: error.message,
        });
      }
      if (error.code === ApplicationErrorCodes.Unauthorized) {
        throw new UnauthorizedException({
          error: error.code,
          message: error.message,
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
