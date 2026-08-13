import {
  Controller,
  ForbiddenException,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApplicationError,
  ApplicationErrorCodes,
  ListPermissionsUseCase,
} from '@gigahub/application-identity';
import type { ListPermissionsResponseDto } from '@gigahub/shared/contracts';
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from './access-token.guard';

@Controller('permission-catalog')
@UseGuards(AccessTokenGuard)
export class PermissionsController {
  constructor(private readonly listPermissions: ListPermissionsUseCase) {}

  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
  ): Promise<ListPermissionsResponseDto> {
    if (!req.userId) {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: 'Missing access token subject',
      });
    }
    try {
      return await this.listPermissions.execute({ actorUserId: req.userId });
    } catch (error) {
      if (
        error instanceof ApplicationError &&
        error.code === ApplicationErrorCodes.PermissionDenied
      ) {
        throw new ForbiddenException({
          error: error.code,
          message: error.message,
          details: error.details,
        });
      }
      throw error;
    }
  }
}
