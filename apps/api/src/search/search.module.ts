import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ClientesModule } from '../clientes/clientes.module';
import { ProjetoModule } from '../projeto/projeto.module';
import { DemandModule } from '../demand/demand.module';
import { SearchController } from './search.controller';

@Module({
  imports: [AuthModule, ClientesModule, ProjetoModule, DemandModule],
  controllers: [SearchController],
})
export class SearchModule {}
