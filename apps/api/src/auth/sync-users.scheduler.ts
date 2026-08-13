import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SyncUsersFromErpUseCase } from '@gigahub/application-identity';

@Injectable()
export class SyncUsersScheduler implements OnModuleInit {
  private readonly logger = new Logger(SyncUsersScheduler.name);
  private running = false;

  constructor(private readonly syncUsers: SyncUsersFromErpUseCase | null) {}

  onModuleInit(): void {
    void this.run('boot');
  }

  @Cron('*/5 * * * *')
  async onCron(): Promise<void> {
    await this.run('cron');
  }

  private async run(trigger: 'boot' | 'cron'): Promise<void> {
    if (!this.syncUsers) {
      this.logger.warn(`IXC sync skipped (${trigger}): directory not configured`);
      return;
    }
    if (this.running) {
      this.logger.warn(`IXC sync skipped (${trigger}): previous run still in progress`);
      return;
    }

    this.running = true;
    this.logger.log(`Starting IXC user sync (${trigger})`);
    try {
      const result = await this.syncUsers.execute();
      this.logger.log(
        `IXC user sync done (${trigger}): created=${result.created} updated=${result.updated} blocked=${result.blocked} failed=${result.failed}`,
      );
    } catch (error) {
      this.logger.error(
        `IXC user sync failed (${trigger})`,
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.running = false;
    }
  }
}
