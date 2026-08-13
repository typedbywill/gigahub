# ADR-0007 — Arquitetura orientada a eventos

- Status: accepted
- Data: 2026-08-13

## Contexto

O GigaHub é um HelpDesk operacional com políticas em vários bounded contexts
(Field Work, Customer Care, Network, Inventory, Gamification, etc.). Efeitos
colaterais — notificações, handoff de atendimento, pontos, projeções — não devem
acoplar módulos nem bloquear o caso de uso principal.

Microserviços prematuros aumentariam custo operacional sem fronteiras estáveis.
É necessário desacoplar dentro do monólito modular sem esconder consistência
obrigatória.

## Decisão

A comunicação assíncrona entre módulos e processos usa **eventos de domínio
versionados** publicados via **outbox transacional**.

- Comandos síncronos (HTTP/API) executam casos de uso e aplicam políticas na entidade.
- Fatos relevantes são gravados no outbox na mesma unidade de trabalho.
- Workers consomem e entregam eventos a outros módulos ou adapters.
- Contratos de evento vivem em `libs/shared/contracts` e são independentes do broker.
- O broker (RabbitMQ, NATS, Kafka ou equivalente) permanece em aberto.
- Consumidores são idempotentes; retry não duplica efeitos sensíveis.

A UI e o BFF não dependem do broker: leem estado via API e, quando necessário,
recebem atualizações em tempo real por Socket.IO.

Esta decisão complementa o monólito modular ([ADR-0001](./0001-monolito-modular.md))
e a gamificação por eventos ([ADR-0005](./0005-gamificacao-eventos-ledger.md)).

## Consequências

### Positivas

- módulos evoluem sem conhecer consumidores;
- efeitos secundários recuperáveis sem falhar a jornada principal;
- base comum para Care, Messaging, Gamification e projeções;
- caminho natural para extrair workers ou serviços depois.

### Negativas

- exige outbox, idempotência e monitoramento de filas;
- consumidores veem consistência eventual;
- catálogo e versionamento de eventos precisam de disciplina;
- ordering e eventos atrasados aumentam complexidade.

## Gatilhos de revisão

- escolha definitiva de broker;
- necessidade de ordering global ou multi-região;
- extrair um bounded context para processo/serviço próprio;
- volume de eventos incompatível com o consumidor atual;
- evidência de acoplamento síncrono entre módulos que deveria ser evento.

## Referências

- [02 — Arquitetura](../02-arquitetura.md)
- [ADR-0001 — Monólito modular](./0001-monolito-modular.md)
- [ADR-0005 — Gamificação orientada a eventos e ledger](./0005-gamificacao-eventos-ledger.md)
