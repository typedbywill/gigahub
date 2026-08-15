import { Module } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import {
  MysqlWorkOrderCommandAdapter,
  MysqlWorkOrderQueryAdapter,
} from '@gigahub/adapters-ixc';
import {
  AddWorkOrderMessageUseCase,
  CompleteWorkOrderUseCase,
  GetMyScheduleUseCase,
  GetWorkOrderDetailUseCase,
  ListActiveWorkOrdersUseCase,
  ListCustomerWorkOrdersUseCase,
  ListWorkOrdersUseCase,
  RescheduleWorkOrderUseCase,
  StartWorkOrderDisplacementUseCase,
  StartWorkOrderExecutionUseCase,
  type AccessPort,
  type UserLookupPort,
  type WorkOrderCommandRepository,
  type WorkOrderQueryRepository,
} from '@gigahub/application-work-order';
import { ResolveEffectiveAccess } from '@gigahub/application-identity';
import { userId } from '@gigahub/shared/kernel';
import { AuthModule } from '../auth/auth.module';
import { MongoUserRepository } from '../auth/persistence/mongo-user.repository';
import { IXC_MYSQL_POOL } from '../ixc/ixc.module';
import { WorkOrdersController } from './work-orders.controller';

export const WORK_ORDER_QUERY_REPOSITORY = 'WORK_ORDER_QUERY_REPOSITORY';
export const WORK_ORDER_COMMAND_REPOSITORY = 'WORK_ORDER_COMMAND_REPOSITORY';
export const WORK_ORDER_USER_LOOKUP = 'WORK_ORDER_USER_LOOKUP';
export const WORK_ORDER_ACCESS = 'WORK_ORDER_ACCESS';

function ixcNotConfiguredError(): never {
  throw new Error(
    'IXC database is not configured (set IXC_DB_USER / IXC_DB_HOST)',
  );
}

@Module({
  imports: [AuthModule],
  controllers: [WorkOrdersController],
  providers: [
    {
      provide: WORK_ORDER_QUERY_REPOSITORY,
      useFactory: (pool: Pool | null): WorkOrderQueryRepository => {
        if (!pool) {
          return {
            async getMySchedule() {
              ixcNotConfiguredError();
            },
            async listActive() {
              ixcNotConfiguredError();
            },
            async list() {
              ixcNotConfiguredError();
            },
            async findById() {
              ixcNotConfiguredError();
            },
            async listByCustomer() {
              ixcNotConfiguredError();
            },
          };
        }
        return new MysqlWorkOrderQueryAdapter(pool);
      },
      inject: [IXC_MYSQL_POOL],
    },
    {
      provide: WORK_ORDER_COMMAND_REPOSITORY,
      useFactory: (pool: Pool | null): WorkOrderCommandRepository => {
        if (!pool) {
          return {
            async startDisplacement() {
              ixcNotConfiguredError();
            },
            async startExecution() {
              ixcNotConfiguredError();
            },
            async reschedule() {
              ixcNotConfiguredError();
            },
            async complete() {
              ixcNotConfiguredError();
            },
            async addMessage() {
              ixcNotConfiguredError();
            },
          };
        }
        return new MysqlWorkOrderCommandAdapter(pool);
      },
      inject: [IXC_MYSQL_POOL],
    },
    {
      provide: WORK_ORDER_USER_LOOKUP,
      useFactory: (userRepo: MongoUserRepository): UserLookupPort => ({
        async findActorUser(actorId: string) {
          const u = await userRepo.findById(userId(actorId));
          if (!u) return null;
          return {
            userId: u.id,
            idErp: u.idErp,
            idErpEmployee: u.idErpEmployee,
            name: u.name,
            email: u.email,
          };
        },
      }),
      inject: [MongoUserRepository],
    },
    {
      provide: WORK_ORDER_ACCESS,
      useFactory: (access: ResolveEffectiveAccess): AccessPort => ({
        async assertCan(actorUserId: string, permission: string) {
          await access.assertCan(actorUserId, permission);
        },
      }),
      inject: [ResolveEffectiveAccess],
    },
    {
      provide: GetMyScheduleUseCase,
      useFactory: (
        query: WorkOrderQueryRepository,
        userLookup: UserLookupPort,
        access: AccessPort,
      ) => new GetMyScheduleUseCase(query, userLookup, access),
      inject: [
        WORK_ORDER_QUERY_REPOSITORY,
        WORK_ORDER_USER_LOOKUP,
        WORK_ORDER_ACCESS,
      ],
    },
    {
      provide: ListActiveWorkOrdersUseCase,
      useFactory: (
        query: WorkOrderQueryRepository,
        userLookup: UserLookupPort,
        access: AccessPort,
      ) => new ListActiveWorkOrdersUseCase(query, userLookup, access),
      inject: [
        WORK_ORDER_QUERY_REPOSITORY,
        WORK_ORDER_USER_LOOKUP,
        WORK_ORDER_ACCESS,
      ],
    },
    {
      provide: ListWorkOrdersUseCase,
      useFactory: (query: WorkOrderQueryRepository, access: AccessPort) =>
        new ListWorkOrdersUseCase(query, access),
      inject: [WORK_ORDER_QUERY_REPOSITORY, WORK_ORDER_ACCESS],
    },
    {
      provide: GetWorkOrderDetailUseCase,
      useFactory: (query: WorkOrderQueryRepository, access: AccessPort) =>
        new GetWorkOrderDetailUseCase(query, access),
      inject: [WORK_ORDER_QUERY_REPOSITORY, WORK_ORDER_ACCESS],
    },
    {
      provide: StartWorkOrderDisplacementUseCase,
      useFactory: (
        query: WorkOrderQueryRepository,
        command: WorkOrderCommandRepository,
        userLookup: UserLookupPort,
        access: AccessPort,
      ) =>
        new StartWorkOrderDisplacementUseCase(
          query,
          command,
          userLookup,
          access,
        ),
      inject: [
        WORK_ORDER_QUERY_REPOSITORY,
        WORK_ORDER_COMMAND_REPOSITORY,
        WORK_ORDER_USER_LOOKUP,
        WORK_ORDER_ACCESS,
      ],
    },
    {
      provide: StartWorkOrderExecutionUseCase,
      useFactory: (
        query: WorkOrderQueryRepository,
        command: WorkOrderCommandRepository,
        userLookup: UserLookupPort,
        access: AccessPort,
      ) =>
        new StartWorkOrderExecutionUseCase(
          query,
          command,
          userLookup,
          access,
        ),
      inject: [
        WORK_ORDER_QUERY_REPOSITORY,
        WORK_ORDER_COMMAND_REPOSITORY,
        WORK_ORDER_USER_LOOKUP,
        WORK_ORDER_ACCESS,
      ],
    },
    {
      provide: RescheduleWorkOrderUseCase,
      useFactory: (
        query: WorkOrderQueryRepository,
        command: WorkOrderCommandRepository,
        userLookup: UserLookupPort,
        access: AccessPort,
      ) =>
        new RescheduleWorkOrderUseCase(query, command, userLookup, access),
      inject: [
        WORK_ORDER_QUERY_REPOSITORY,
        WORK_ORDER_COMMAND_REPOSITORY,
        WORK_ORDER_USER_LOOKUP,
        WORK_ORDER_ACCESS,
      ],
    },
    {
      provide: CompleteWorkOrderUseCase,
      useFactory: (
        query: WorkOrderQueryRepository,
        command: WorkOrderCommandRepository,
        userLookup: UserLookupPort,
        access: AccessPort,
      ) => new CompleteWorkOrderUseCase(query, command, userLookup, access),
      inject: [
        WORK_ORDER_QUERY_REPOSITORY,
        WORK_ORDER_COMMAND_REPOSITORY,
        WORK_ORDER_USER_LOOKUP,
        WORK_ORDER_ACCESS,
      ],
    },
    {
      provide: AddWorkOrderMessageUseCase,
      useFactory: (
        query: WorkOrderQueryRepository,
        command: WorkOrderCommandRepository,
        userLookup: UserLookupPort,
        access: AccessPort,
      ) => new AddWorkOrderMessageUseCase(query, command, userLookup, access),
      inject: [
        WORK_ORDER_QUERY_REPOSITORY,
        WORK_ORDER_COMMAND_REPOSITORY,
        WORK_ORDER_USER_LOOKUP,
        WORK_ORDER_ACCESS,
      ],
    },
    {
      provide: ListCustomerWorkOrdersUseCase,
      useFactory: (query: WorkOrderQueryRepository, access: AccessPort) =>
        new ListCustomerWorkOrdersUseCase(query, access),
      inject: [WORK_ORDER_QUERY_REPOSITORY, WORK_ORDER_ACCESS],
    },
  ],
  exports: [
    GetMyScheduleUseCase,
    ListActiveWorkOrdersUseCase,
    ListWorkOrdersUseCase,
    GetWorkOrderDetailUseCase,
    StartWorkOrderDisplacementUseCase,
    StartWorkOrderExecutionUseCase,
    ListCustomerWorkOrdersUseCase,
  ],
})
export class WorkOrdersModule {}
