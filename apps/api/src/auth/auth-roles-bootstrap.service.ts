import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SeedDefaultRolesUseCase } from '@gigahub/application-identity';

/**
 * Ensures default product roles exist (incl. admin-acesso with access:manage).
 * Users are not seeded — they come from ERP sync or manual DB bootstrap.
 */
@Injectable()
export class AuthRolesBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AuthRolesBootstrapService.name);

  constructor(private readonly seedDefaultRoles: SeedDefaultRolesUseCase) {}

  async onModuleInit(): Promise<void> {
    const result = await this.seedDefaultRoles.execute();
    this.logger.log(
      `Default roles bootstrap: created=${result.created} updated=${result.updated} skipped=${result.skipped}`,
    );
  }
}
