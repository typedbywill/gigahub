import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SeedDefaultRolesUseCase } from '@gigahub/application-identity';

@Injectable()
export class RolesSeedService implements OnModuleInit {
  private readonly logger = new Logger(RolesSeedService.name);

  constructor(private readonly seedRoles: SeedDefaultRolesUseCase) {}

  async onModuleInit(): Promise<void> {
    const result = await this.seedRoles.execute();
    this.logger.log(
      `Default roles seed: created=${result.created} skipped=${result.skipped}`,
    );
  }
}
