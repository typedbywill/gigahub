import { Module } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import {
  MysqlCustomerQueryAdapter,
  MysqlCustomerSearchQuery,
  TcpCustomerRemoteAccessAdapter,
} from '@gigahub/adapters-ixc';
import {
  GetCustomerConsultationUseCase,
  SearchCustomersUseCase,
  type CustomerConsultationQuery,
  type CustomerRegistrationQuery,
  type CustomerRemoteAccessPort,
  type CustomerSearchQuery,
  type CustomerSignalReaderPort,
} from '@gigahub/application-customer';
import { ResolveEffectiveAccess } from '@gigahub/application-identity';
import { AuthModule } from '../auth/auth.module';
import { IXC_MYSQL_POOL } from '../ixc/ixc.module';
import { ClientesController } from './clientes.controller';

export const CUSTOMER_SEARCH_QUERY = 'CUSTOMER_SEARCH_QUERY';
export const CUSTOMER_REGISTRATION_QUERY = 'CUSTOMER_REGISTRATION_QUERY';
export const CUSTOMER_CONSULTATION_QUERY = 'CUSTOMER_CONSULTATION_QUERY';
export const CUSTOMER_SIGNAL_READER = 'CUSTOMER_SIGNAL_READER';
export const CUSTOMER_REMOTE_ACCESS = 'CUSTOMER_REMOTE_ACCESS';

function ixcNotConfiguredError(): never {
  throw new Error(
    'IXC database is not configured (set IXC_DB_USER / IXC_DB_HOST)',
  );
}

@Module({
  imports: [AuthModule],
  controllers: [ClientesController],
  providers: [
    {
      provide: CUSTOMER_SEARCH_QUERY,
      useFactory: (pool: Pool | null): CustomerSearchQuery => {
        if (!pool) {
          return {
            async search() {
              ixcNotConfiguredError();
            },
          };
        }
        return new MysqlCustomerSearchQuery(pool);
      },
      inject: [IXC_MYSQL_POOL],
    },
    {
      provide: CUSTOMER_REGISTRATION_QUERY,
      useFactory: (pool: Pool | null): CustomerRegistrationQuery => {
        if (!pool) {
          return {
            async findByIdErp() {
              ixcNotConfiguredError();
            },
          };
        }
        return new MysqlCustomerQueryAdapter(pool);
      },
      inject: [IXC_MYSQL_POOL],
    },
    {
      provide: CUSTOMER_CONSULTATION_QUERY,
      useFactory: (pool: Pool | null): CustomerConsultationQuery => {
        if (!pool) {
          return {
            async loadSnapshot() {
              ixcNotConfiguredError();
            },
            async loadContracts() {
              ixcNotConfiguredError();
            },
            async loadLogins() {
              ixcNotConfiguredError();
            },
            async loadFibra() {
              ixcNotConfiguredError();
            },
            async loadFibraHistorico() {
              ixcNotConfiguredError();
            },
            async loadFaturas() {
              ixcNotConfiguredError();
            },
            async loadComodatos() {
              ixcNotConfiguredError();
            },
            async loadSenhasWifi() {
              ixcNotConfiguredError();
            },
          };
        }
        return new MysqlCustomerQueryAdapter(pool);
      },
      inject: [IXC_MYSQL_POOL],
    },
    {
      provide: CUSTOMER_SIGNAL_READER,
      useFactory: (): CustomerSignalReaderPort | null => null,
    },
    {
      provide: CUSTOMER_REMOTE_ACCESS,
      useFactory: (): CustomerRemoteAccessPort =>
        new TcpCustomerRemoteAccessAdapter(),
    },
    {
      provide: SearchCustomersUseCase,
      useFactory: (
        search: CustomerSearchQuery,
        access: ResolveEffectiveAccess,
      ) => new SearchCustomersUseCase(search, access),
      inject: [CUSTOMER_SEARCH_QUERY, ResolveEffectiveAccess],
    },
    {
      provide: GetCustomerConsultationUseCase,
      useFactory: (
        registration: CustomerRegistrationQuery,
        consultation: CustomerConsultationQuery,
        signalReader: CustomerSignalReaderPort | null,
        remoteAccess: CustomerRemoteAccessPort,
        access: ResolveEffectiveAccess,
      ) =>
        new GetCustomerConsultationUseCase(
          registration,
          consultation,
          signalReader,
          remoteAccess,
          access,
        ),
      inject: [
        CUSTOMER_REGISTRATION_QUERY,
        CUSTOMER_CONSULTATION_QUERY,
        CUSTOMER_SIGNAL_READER,
        CUSTOMER_REMOTE_ACCESS,
        ResolveEffectiveAccess,
      ],
    },
  ],
})
export class ClientesModule {}
