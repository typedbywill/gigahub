import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApplicationError,
  ApplicationErrorCodes,
  GetUserUseCase,
  InactivateUserUseCase,
  ListUsersUseCase,
} from '@gigahub/application-identity';
import {
  userListQueryDtoSchema,
  type InactivateUserResponseDto,
  type PaginatedUsersDto,
  type UserDetailDto,
} from '@gigahub/shared/contracts';
import { AccessTokenGuard } from './access-token.guard';

@Controller('users')
@UseGuards(AccessTokenGuard)
export class UsersController {
  constructor(
    private readonly listUsers: ListUsersUseCase,
    private readonly getUser: GetUserUseCase,
    private readonly inactivateUser: InactivateUserUseCase,
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
    }
    throw error;
  }
}
