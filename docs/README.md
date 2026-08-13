# GigaHub — documentação da plataforma

O **GigaHub** é o HelpDesk operacional da Giganet: ponto único de atendimento e
execução de trabalho de campo e back-office. Ele aplica políticas de domínio
(ordens de serviço, rede, estoque, suporte, etc.) com a experiência de um CRM
operacional integrado — sem substituir o IXC como ERP.

A plataforma evolui o GigaCenter de forma incremental, preserva as regras de
negócio existentes e prepara a operação para crescer com Kubernetes e comunicação
orientada a eventos.

## Estado desta documentação

Estes documentos descrevem a direção do produto e a arquitetura-alvo. Eles não afirmam
que todos os componentes já estão implementados.

- **Atual**: inventário do GigaCenter em [`old/`](./old/README.md).
- **Decidido**: princípios e decisões registradas nos documentos e ADRs desta pasta.
- **Futuro**: itens explicitamente marcados como evolução ou hipótese.

Em caso de conflito, o comportamento do sistema atual deve ser confirmado no código e
nos documentos antigos antes de uma migração.

## Índice

1. [Visão de produto](./01-visao-produto.md)
2. [Arquitetura](./02-arquitetura.md)
3. [Identidade e acesso](./03-identidade-e-acesso.md)
4. [Tempo real e Redis](./04-tempo-real-e-redis.md)
5. [Kubernetes e operação](./05-kubernetes-e-operacao.md)
6. [Frontend unificado](./06-frontend-unificado.md)
7. [Gamificação](./07-gamificacao.md)
8. [Roadmap](./08-roadmap.md)
9. [Registros de decisões arquiteturais](./adr/README.md)

## Princípios

1. **Domínio antes do canal**: Web, Socket.IO e futuros agentes usam os mesmos
   casos de uso.
2. **Orientação a eventos**: módulos publicam fatos imutáveis; outbox garante
   publicação confiável; projeções derivam leituras sem acoplar writers.
3. **Migração incremental**: começar com um monólito modular e extrair processos
   somente quando escala, isolamento ou ciclo de vida justificarem.
4. **IXC continua sendo o ERP**: o GigaHub orquestra a operação, aplica políticas
   e protege o domínio contra detalhes de integrações externas.
5. **Estado durável fora do cache**: Redis acelera e coordena, mas não substitui o
   banco de dados para registros que não podem ser perdidos.
6. **Segurança por padrão**: senhas com hash, tokens revogáveis, menor privilégio,
   auditoria e secrets fora das imagens.
7. **Operação observável**: logs estruturados, métricas, traces, health checks e
   alertas fazem parte da entrega.
8. **Gamificação responsável**: pontos precisam ser explicáveis, auditáveis e não
   podem incentivar volume em detrimento da qualidade.

## Escopo inicial

- Uma organização: Giganet.
- Usuários internos e equipes de campo da própria empresa.
- Um frontend React responsivo, com experiências adequadas ao contexto.
- API NestJS modular, workers separados quando necessário.
- JWT, Redis e Socket.IO preparados para múltiplas réplicas.
- Kubernetes com ambientes `dev`, `staging` e `prod`.

Multi-tenancy, ranking público, recompensas, punições e avaliação formal de desempenho
não fazem parte da primeira versão.

## Glossário

- **Adapter**: implementação que conecta o domínio a HTTP, IXC, Mongo, Redis,
  CRM externo (legado) ou outro sistema.
- **Bounded context**: limite dentro do qual termos e regras de um domínio são
  consistentes.
- **BFF**: API voltada às necessidades do frontend, sem carregar regras de negócio.
- **Comando**: intenção síncrona de alterar estado (ex.: iniciar execução de OS),
  tipicamente via caso de uso HTTP/API.
- **CRM externo**: sistema legado de tickets/finalização ainda integrado durante a
  migração; não é a identidade do produto.
- **Evento de domínio**: fato ocorrido e imutável, como `OSFinalizada`.
- **HelpDesk operacional**: núcleo do GigaHub — atendimento, filas e execução de
  trabalho com políticas aplicadas no domínio.
- **Ledger de pontos**: extrato append-only de créditos, débitos e estornos.
- **Política de domínio**: invariante ou regra de negócio encapsulada na entidade
  (geofence, transição de status, elegibilidade de suporte, etc.).
- **Projeção**: visão reconstruível derivada de eventos, como saldo ou ranking.

## Como manter

- Atualize o documento de domínio junto da mudança de comportamento.
- Registre decisões estruturais em um [ADR](./adr/README.md).
- Diferencie claramente estado atual, decisão e hipótese.
- Não copie secrets, credenciais, tokens ou dados pessoais para a documentação.
- Use nomes de eventos e contratos versionados quando cruzarem limites de processo.
