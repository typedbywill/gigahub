# Documentação — GigaCenter → GigaHub

Documentação do estado **atual** do monorepo **GigaCenter** (pacote npm `giganet`), escrita para servir de base ao futuro **GigaHub**: plataforma unificada, modular e operada em Kubernetes.

## Índice

| Documento | Conteúdo |
|-----------|----------|
| [01 — Visão geral](./01-visao-geral.md) | O que é o GigaCenter, para quem serve, escopo geográfico e canais |
| [02 — Arquitetura](./02-arquitetura.md) | Monorepo Nx, apps, camadas da API, padrões de código |
| [03 — Lógicas de negócio](./03-logicas-de-negocio.md) | Domínio, OS, CTO/ONU, estoque, financeiro, políticas de campo |
| [04 — Canais e apps](./04-canais-e-apps.md) | Telegram, UI externa, UI interna, REST, MCP, WebSocket |
| [05 — Integrações e dados](./05-integracoes-e-dados.md) | IXC, OPA, CRM, WAHA, bancos, rotinas, env |
| [06 — Visão GigaHub](./06-visao-gigahub.md) | Unificação modular, bounded contexts e direção K8s |

## Como usar esta pasta

1. **Produto / negócio** → comece por `01` e `03`.
2. **Engenharia / refatoração** → `02`, `04` e `05`.
3. **Planejamento GigaHub + K8s** → `06`, com os demais como inventário do que migrar.

## Fonte da verdade no código

| Área | Caminho principal |
|------|-------------------|
| Bootstrap API | `apps/api/src/main.ts` |
| Use-cases compartilhados | `apps/api/src/application/use-cases/` |
| Features Telegram | `apps/api/src/application/features/telegram/` |
| REST v1 | `apps/api/src/application/api/v1/` |
| Rotinas (cron) | `apps/api/src/application/routines/` |
| Adapters externos | `apps/api/src/infrastructure/` |
| App de campo | `apps/ui-external/` |
| App interno | `apps/ui-internal/` |
| Swagger (runtime) | `/api/docs` |

> Documentação gerada a partir do código em **agosto/2026**. Ao evoluir o sistema, atualize estes arquivos junto com as mudanças de domínio.
