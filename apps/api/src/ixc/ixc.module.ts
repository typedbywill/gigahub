import { Global, Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Pool } from 'mysql2/promise';
import { createIxcPool, type IxcDbConfig } from '@gigahub/adapters-ixc';
import type { EnvConfig } from '@gigahub/shared/config';

export const IXC_MYSQL_POOL = 'IXC_MYSQL_POOL';

export function readIxcDbConfig(
  config: ConfigService<EnvConfig, true>,
): IxcDbConfig | null {
  const user = config.get('IXC_DB_USER', { infer: true })?.trim();
  if (!user) {
    return null;
  }
  return {
    host: config.get('IXC_DB_HOST', { infer: true }),
    port: config.get('IXC_DB_PORT', { infer: true }),
    user,
    password: config.get('IXC_DB_PASS', { infer: true }),
    database: config.get('IXC_DB_NAME', { infer: true }),
  };
}

@Global()
@Module({
  providers: [
    {
      provide: IXC_MYSQL_POOL,
      useFactory: (config: ConfigService<EnvConfig, true>): Pool | null => {
        const db = readIxcDbConfig(config);
        if (!db) {
          return null;
        }
        return createIxcPool(db);
      },
      inject: [ConfigService],
    },
  ],
  exports: [IXC_MYSQL_POOL],
})
export class IxcModule implements OnModuleDestroy {
  constructor(@Inject(IXC_MYSQL_POOL) private readonly pool: Pool | null) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }
}
