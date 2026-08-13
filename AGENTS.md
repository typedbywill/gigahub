# GigaHub — regras para o agente

## Regras de negócio vivem no domínio

Toda regra de negócio (invariantes, transições de estado, políticas, cálculos de
domínio) vive em `libs/domain/<módulo>`. Não coloque essa lógica em controllers,
services Nest, schemas Mongoose, DTOs Zod, frontend ou adapters.

O domínio é o ponto de partida. Só depois a regra é exposta ao restante do
projeto (contratos, aplicação, adapters, `apps/`).

## Ordem de implementação

1. **Entidade e políticas** em `libs/domain/<módulo>` — classe com
   `create` / `fromSnapshot` / `toSnapshot`, métodos que encapsulam
   invariantes e lançam `DomainError`.
2. **Testes unitários** colocalizados (`*.spec.ts` ao lado da entidade). Cubra
   o caminho feliz, recusas de invariante e transições ilegais.
3. **Só então** propague: DTOs/eventos em `libs/shared/contracts`, casos de
   uso, adapters e UI/API em `apps/`.

Não comece por endpoint, tela ou schema de persistência. Se a regra ainda não
existe no domínio com teste, não a espalhe.

## O que cada camada pode fazer

| Camada | Pode | Não pode |
| --- | --- | --- |
| `libs/shared/kernel` | IDs brandados, `GeoPoint`, `DomainError` | Regras de um módulo |
| `libs/domain/*` | Entidades, status, políticas | NestJS, Mongoose, HTTP, Zod, SDKs |
| `libs/shared/contracts` | DTOs e eventos versionados | Lógica de domínio |
| `libs/application-*` | Casos de uso e portas | Regras que deveriam estar na entidade |
| `libs/adapters-*` / `apps/` | Transporte, persistência, UI | Decidir invariantes de negócio |

Dependências: entradas → aplicação → domínio. Adapters implementam portas.
Domínio só importa `@gigahub/shared/kernel` (e o próprio módulo). Um módulo
não acessa persistência privada de outro.

## Padrão da entidade

Siga `Customer`, `WorkOrder`, `CareTicket` e `CareInbox`:

- construtor privado; estado via snapshot;
- `static create` valida e brand IDs; `fromSnapshot` rehidrata;
- mutações (`startExecution`, `assertCanOpenSupport`, …) verificam
  invariantes e atualizam `updatedAt`;
- erros com `DomainError` + `DomainErrorCodes`, nunca strings soltas;
- constantes de política no módulo (ex.: `GEOFENCE_RADIUS_METERS`), não em
  `apps/` nem em env.

Kernel (`assertNonEmpty`, `geoPoint`, IDs) é compartilhado; a política
(geofence, motivo mínimo, cliente operável) permanece no domínio dono.

## Testes

- Unitários de domínio são obrigatórios **antes** de usar a entidade em
  API, worker ou UI.
- Teste comportamento, não getters: transições, recusas, códigos de erro.
- Não dependa de Nest, Mongo ou HTTP nos specs de `libs/domain`.

## UI — acessibilidade, praticidade e consistência

Ao tocar em `apps/web` (e em componentes compartilhados de UI), trate
acessibilidade e usabilidade como parte do entrega — não como polish opcional.

### Acessibilidade

- Controles só-ícone ou ambíguos levam `aria-label` (ou texto visível).
- Ícones decorativos: `aria-hidden`. Estados expansíveis: `aria-expanded`.
- Foque real: ordem de tab lógica; não remova outline sem `focus-visible`
  equivalente.
- Diálogos/menus: Escape fecha; foco fica preso enquanto abertos e volta
  ao gatilho ao fechar (padrão do design system / HeroUI quando disponível).
- Contraste legível em claro e escuro; não dependa só de cor para status.
- Formulários: label associado, erro anunciável, submit por Enter no fluxo
  principal.

### Praticidade e atalhos

- Listagens com busca: reutilize `useFocusSearchOnType` (`/` foca; digitar
  fora de campo editável foca e preenche). Não reinventar atalho paralelo.
- Ações frequentes devem ser alcançáveis sem mouse (botão nativo / item de
  menu focável), não só em hover.
- Loading, vazio e erro com mensagem clara e próxima da ação — nunca tela
  muda sem feedback.
- Prefira padrões já existentes (`DataTable`, layout, menus de ação) a UI
  nova só para “ficar diferente”.

### Consistência visual

- Reuse tokens, espaçamentos, tipografia e componentes do design system do
  app; evite cores/raios/sombras one-off.
- Mesma hierarquia em telas irmãs (lista → detalhe → settings): títulos,
  densidade, posição de CTA e filtros alinhados ao que já existe.
- Ícones da mesma família e tamanho do contexto; botões destrutivos no
  mesmo padrão visual das outras telas.
- Antes de inventar layout: espelhe a página análoga mais próxima
  (`UsersListPage`, `PermissionsPage`, etc.).