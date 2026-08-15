import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv } from '@gigahub/shared/config';
import { HealthModule } from '../health/health.module';
import { StorageModule } from '../storage/storage.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuthModule } from '../auth/auth.module';
import { ClientesModule } from '../clientes/clientes.module';
import { IxcModule } from '../ixc/ixc.module';
import { ProjetoModule } from '../projeto/projeto.module';
import { DemandModule } from '../demand/demand.module';
import { SearchModule } from '../search/search.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>(
          'MONGODB_URI',
          'mongodb://127.0.0.1:27017/gigahub?replicaSet=rs0&directConnection=true',
        ),
      }),
      inject: [ConfigService],
    }),
    HealthModule,
    StorageModule,
    RealtimeModule,
    AuthModule,
    IxcModule,
    ProjetoModule,
    ClientesModule,
    DemandModule,
    SearchModule,
    WorkOrdersModule,
  ],
})
export class AppModule {}
