import { Controller, Get, UseGuards } from '@nestjs/common';
import { ListRolesUseCase } from '@gigahub/application-identity';
import type { ListRolesResponseDto } from '@gigahub/shared/contracts';
import { AccessTokenGuard } from './access-token.guard';

@Controller('roles')
@UseGuards(AccessTokenGuard)
export class RolesController {
  constructor(private readonly listRoles: ListRolesUseCase) {}

  @Get()
  async list(): Promise<ListRolesResponseDto> {
    return this.listRoles.execute();
  }
}
