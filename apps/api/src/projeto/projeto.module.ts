import { Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Pool } from 'mysql2/promise';
import {
  createIxcPool,
  MysqlFiberAccessTerminalNearbyQuery,
  MysqlFiberCableNearbyQuery,
  MysqlProjectNetworkSearchQuery,
  type IxcDbConfig,
} from '@gigahub/adapters-ixc';
import {
  ListNearbyFiberAccessTerminalsUseCase,
  ListNearbyFiberCablesUseCase,
  SearchProjectNetworkUseCase,
  type FiberAccessTerminalNearbyQuery,
  type FiberCableNearbyQuery,
  type ProjectNetworkSearchQuery,
} from '@gigahub/application-network';
import type { EnvConfig } from '@gigahub/shared/config';
import { AuthModule } from '../auth/auth.module';
import { ProjetoController } from './projeto.controller';

export const IXC_MYSQL_POOL = 'IXC_MYSQL_POOL';
export const FIBER_ACCESS_TERMINAL_NEARBY_QUERY =
  'FIBER_ACCESS_TERMINAL_NEARBY_QUERY';
export const FIBER_CABLE_NEARBY_QUERY = 'FIBER_CABLE_NEARBY_QUERY';
export const PROJECT_NETWORK_SEARCH_QUERY = 'PROJECT_NETWORK_SEARCH_QUERY';

function readIxcDbConfig(
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

@Module({
  imports: [AuthModule],
  controllers: [ProjetoController],
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
    {
      provide: FIBER_ACCESS_TERMINAL_NEARBY_QUERY,
      useFactory: (pool: Pool | null): FiberAccessTerminalNearbyQuery => {
        if (!pool) {
          return {
            async findNearby() {
              throw new Error(
                'IXC database is not configured (set IXC_DB_USER / IXC_DB_HOST)',
              );
            },
          };
        }
        return new MysqlFiberAccessTerminalNearbyQuery(pool);
      },
      inject: [IXC_MYSQL_POOL],
    },
    {
      provide: FIBER_CABLE_NEARBY_QUERY,
      useFactory: (pool: Pool | null): FiberCableNearbyQuery => {
        if (!pool) {
          return {
            async findNearby() {
              throw new Error(
                'IXC database is not configured (set IXC_DB_USER / IXC_DB_HOST)',
              );
            },
          };
        }
        return new MysqlFiberCableNearbyQuery(pool);
      },
      inject: [IXC_MYSQL_POOL],
    },
    {
      provide: PROJECT_NETWORK_SEARCH_QUERY,
      useFactory: (pool: Pool | null): ProjectNetworkSearchQuery => {
        if (!pool) {
          return {
            async search() {
              throw new Error(
                'IXC database is not configured (set IXC_DB_USER / IXC_DB_HOST)',
              );
            },
          };
        }
        return new MysqlProjectNetworkSearchQuery(pool);
      },
      inject: [IXC_MYSQL_POOL],
    },
    {
      provide: ListNearbyFiberAccessTerminalsUseCase,
      useFactory: (query: FiberAccessTerminalNearbyQuery) =>
        new ListNearbyFiberAccessTerminalsUseCase(query),
      inject: [FIBER_ACCESS_TERMINAL_NEARBY_QUERY],
    },
    {
      provide: ListNearbyFiberCablesUseCase,
      useFactory: (query: FiberCableNearbyQuery) =>
        new ListNearbyFiberCablesUseCase(query),
      inject: [FIBER_CABLE_NEARBY_QUERY],
    },
    {
      provide: SearchProjectNetworkUseCase,
      useFactory: (query: ProjectNetworkSearchQuery) =>
        new SearchProjectNetworkUseCase(query),
      inject: [PROJECT_NETWORK_SEARCH_QUERY],
    },
  ],
})
export class ProjetoModule implements OnModuleDestroy {
  constructor(
    @Inject(IXC_MYSQL_POOL) private readonly pool: Pool | null,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }
}
