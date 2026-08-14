import { Module } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import {
  MysqlFiberAccessTerminalNearbyQuery,
  MysqlFiberCableNearbyQuery,
  MysqlProjectNetworkSearchQuery,
  MysqlCtoSplittingDiagramQuery,
} from '@gigahub/adapters-ixc';
import {
  ListNearbyFiberAccessTerminalsUseCase,
  ListNearbyFiberCablesUseCase,
  SearchProjectNetworkUseCase,
  GetCtoSplittingDiagramUseCase,
  type FiberAccessTerminalNearbyQuery,
  type FiberCableNearbyQuery,
  type ProjectNetworkSearchQuery,
  type CtoSplittingDiagramQuery,
} from '@gigahub/application-network';
import { AuthModule } from '../auth/auth.module';
import { IXC_MYSQL_POOL } from '../ixc/ixc.module';
import { ProjetoController } from './projeto.controller';


export const FIBER_ACCESS_TERMINAL_NEARBY_QUERY =
  'FIBER_ACCESS_TERMINAL_NEARBY_QUERY';
export const FIBER_CABLE_NEARBY_QUERY = 'FIBER_CABLE_NEARBY_QUERY';
export const PROJECT_NETWORK_SEARCH_QUERY = 'PROJECT_NETWORK_SEARCH_QUERY';
export const CTO_SPLITTING_DIAGRAM_QUERY = 'CTO_SPLITTING_DIAGRAM_QUERY';

@Module({
  imports: [AuthModule],
  controllers: [ProjetoController],
  providers: [
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
      provide: CTO_SPLITTING_DIAGRAM_QUERY,
      useFactory: (pool: Pool | null): CtoSplittingDiagramQuery => {
        if (!pool) {
          return {
            async findByFatId() {
              throw new Error(
                'IXC database is not configured (set IXC_DB_USER / IXC_DB_HOST)',
              );
            },
          };
        }
        return new MysqlCtoSplittingDiagramQuery(pool);
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
    {
      provide: GetCtoSplittingDiagramUseCase,
      useFactory: (query: CtoSplittingDiagramQuery) =>
        new GetCtoSplittingDiagramUseCase(query),
      inject: [CTO_SPLITTING_DIAGRAM_QUERY],
    },
  ],
  exports: [SearchProjectNetworkUseCase],
})
export class ProjetoModule {}

