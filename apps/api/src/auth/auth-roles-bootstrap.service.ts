import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  EnsureBootstrapAdminsUseCase,
  SeedDefaultRolesUseCase,
} from '@gigahub/application-identity';

/**
 * Ensures default product roles exist (incl. admin-acesso with access:manage),
 * then grants admin-acesso to AUTH_BOOTSTRAP_ADMIN_ERP_IDS when those users exist.
 * Users themselves are not seeded — they come from ERP sync or manual DB insert.
 */
@Injectable()
export class AuthRolesBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AuthRolesBootstrapService.name);

  constructor(
    private readonly seedDefaultRoles: SeedDefaultRolesUseCase,
    private readonly ensureBootstrapAdmins: EnsureBootstrapAdminsUseCase,
  ) {}

  async onModuleInit(): Promise<void> {
    const roles = await this.seedDefaultRoles.execute();
    this.logger.log(
      `Default roles bootstrap: created=${roles.created} updated=${roles.updated} skipped=${roles.skipped}`,
    );

    const admins = await this.ensureBootstrapAdmins.execute();
    if (
      admins.granted > 0 ||
      admins.skipped > 0 ||
      admins.missing.length > 0
    ) {
      this.logger.log(
        `Bootstrap admins: granted=${admins.granted} skipped=${admins.skipped} missing=[${admins.missing.join(',')}]`,
      );
    }
  }
}
