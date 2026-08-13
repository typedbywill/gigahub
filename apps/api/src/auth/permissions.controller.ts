import { Controller, Get, UseGuards } from '@nestjs/common';
import { ListPermissionsUseCase } from '@gigahub/application-identity';
import type { ListPermissionsResponseDto } from '@gigahub/shared/contracts';
import { AccessTokenGuard } from './access-token.guard';

@Controller('permission-catalog')
@UseGuards(AccessTokenGuard)
export class PermissionsController {
  constructor(private readonly listPermissions: ListPermissionsUseCase) {}

  @Get()
  async list(): Promise<ListPermissionsResponseDto> {
    return this.listPermissions.execute();
  }
}
