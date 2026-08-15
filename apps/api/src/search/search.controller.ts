import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SearchCustomersUseCase } from '@gigahub/application-customer';
import { SearchProjectNetworkUseCase } from '@gigahub/application-network';
import { ListDemandsUseCase } from '@gigahub/application-demand';
import {
  ListUsersUseCase,
  ResolveEffectiveAccess,
} from '@gigahub/application-identity';
import {
  globalSearchQueryDtoSchema,
  type GlobalSearchGroupDto,
  type GlobalSearchHitDto,
  type GlobalSearchResponseDto,
} from '@gigahub/shared/contracts';
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from '../auth/access-token.guard';

@Controller('search')
@UseGuards(AccessTokenGuard)
export class SearchController {
  constructor(
    private readonly searchCustomers: SearchCustomersUseCase,
    private readonly searchNetwork: SearchProjectNetworkUseCase,
    private readonly listDemands: ListDemandsUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly access: ResolveEffectiveAccess,
  ) {}

  @Get()
  async search(
    @Req() req: AuthenticatedRequest,
    @Query() query: unknown,
  ): Promise<GlobalSearchResponseDto> {
    const parsed = globalSearchQueryDtoSchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Invalid search query',
        details: parsed.error.flatten(),
      });
    }

    const actorUserId = req.userId;
    if (!actorUserId) {
      throw new BadRequestException({
        error: 'UNAUTHORIZED',
        message: 'User is not authenticated',
      });
    }

    const { q, limit } = parsed.data;

    // Resolve effective access for the actor
    const access = await this.access.forUser(actorUserId);
    const canReadCustomers = access.can('customer:read');
    const canReadDemands = access.can('demand:read');
    const canReadDemandAll = access.can('demand:read:all');
    const canReadUsers = access.can('users:read');

    // Fetch in parallel with allSettled for resilience
    const results = await Promise.allSettled([
      // 1. Clientes
      canReadCustomers
        ? this.searchCustomers.execute({ actorUserId, q, limit })
        : Promise.resolve(null),

      // 2. Elementos de Rede (FAT / Cabos)
      this.searchNetwork.execute({ q, kind: 'all', limit }),

      // 3. Demandas
      canReadDemands
        ? this.listDemands.execute(actorUserId, {
            q,
            pageSize: limit,
            view: canReadDemandAll ? 'all' : undefined,
          })
        : Promise.resolve(null),

      // 4. Colaboradores / Usuários
      canReadUsers
        ? this.listUsers.execute({
            actorUserId,
            q,
            page: 1,
            pageSize: limit,
          })
        : Promise.resolve(null),
    ]);

    const groups: GlobalSearchGroupDto[] = [];

    // Clientes
    const customersResult = results[0];
    if (customersResult.status === 'fulfilled' && customersResult.value) {
      const items: GlobalSearchHitDto[] = customersResult.value.items.map(
        (c) => ({
          category: 'customer',
          id: c.id,
          title: c.name,
          subtitle: c.document
            ? `CPF/CNPJ: ${c.document} • ID #${c.idErp}`
            : `ID #${c.idErp}`,
          href: `/cadastros/clientes/${encodeURIComponent(c.id)}`,
        }),
      );
      if (items.length > 0) {
        groups.push({
          category: 'customer',
          label: 'Clientes',
          items,
        });
      }
    }

    // Elementos de Rede (CTOs, Cabos e CEOs)
    const networkResult = results[1];
    if (networkResult.status === 'fulfilled' && networkResult.value) {
      const fatHits: GlobalSearchHitDto[] = [];
      const ceoHits: GlobalSearchHitDto[] = [];
      const cableHits: GlobalSearchHitDto[] = [];

      for (const item of networkResult.value.items) {
        if (item.kind === 'fat') {
          fatHits.push({
            category: 'fat',
            id: item.id,
            title: item.name,
            subtitle: `CTO • ID #${item.idErp}`,
            href: `/rede/projeto?fatId=${encodeURIComponent(item.id)}`,
          });
        } else if (item.kind === 'ceo') {
          ceoHits.push({
            category: 'ceo',
            id: item.id,
            title: item.name,
            subtitle: `CEO (Emenda) • ID #${item.idErp}`,
            href: `/rede/projeto?ceoId=${encodeURIComponent(item.id)}`,
          });
        } else if (item.kind === 'cable') {
          cableHits.push({
            category: 'cable',
            id: item.id,
            title: item.name,
            subtitle: item.cableTypeName
              ? `${item.cableTypeName} • ID #${item.idErp}`
              : `Cabo de Fibra • ID #${item.idErp}`,
            href: `/rede/projeto?cableId=${encodeURIComponent(item.id)}`,
          });
        }
      }

      if (fatHits.length > 0) {
        groups.push({
          category: 'fat',
          label: 'Caixas de Atendimento (CTO)',
          items: fatHits,
        });
      }

      if (ceoHits.length > 0) {
        groups.push({
          category: 'ceo',
          label: 'Caixas de Emenda (CEO)',
          items: ceoHits,
        });
      }

      if (cableHits.length > 0) {
        groups.push({
          category: 'cable',
          label: 'Cabos de Fibra',
          items: cableHits,
        });
      }
    }


    // Demandas
    const demandsResult = results[2];
    if (demandsResult.status === 'fulfilled' && demandsResult.value) {
      const items: GlobalSearchHitDto[] = demandsResult.value.items.map(
        (d) => ({
          category: 'demand',
          id: d.id,
          title: d.title,
          subtitle: `Demanda • Status: ${d.status}`,
          href: `/demandas/${encodeURIComponent(d.id)}`,
        }),
      );
      if (items.length > 0) {
        groups.push({
          category: 'demand',
          label: 'Demandas',
          items,
        });
      }
    }

    // Usuários
    const usersResult = results[3];
    if (usersResult.status === 'fulfilled' && usersResult.value) {
      const items: GlobalSearchHitDto[] = usersResult.value.items.map((u) => ({
        category: 'user',
        id: u.id,
        title: u.name,
        subtitle: u.jobTitle
          ? `${u.jobTitle} • ${u.email}`
          : u.email,
        href: `/configuracoes/usuarios/${encodeURIComponent(u.id)}`,
      }));
      if (items.length > 0) {
        groups.push({
          category: 'user',
          label: 'Colaboradores',
          items,
        });
      }
    }

    return {
      q,
      groups,
    };
  }
}
