# GigaHub — documentação da plataforma

O **GigaHub** é a evolução incremental do GigaCenter para uma plataforma operacional
unificada da Giganet. Ele reúne a experiência de campo e de back-office, preserva as
regras de negócio existentes e prepara a operação para crescer com Kubernetes.

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
2. **Migração incremental**: começar com um monólito modular e extrair processos
   somente quando escala, isolamento ou ciclo de vida justificarem.
3. **IXC continua sendo o ERP**: o GigaHub orquestra a operação e protege o domínio
   contra detalhes de integrações externas.
4. **Estado durável fora do cache**: Redis acelera e coordena, mas não substitui o
   banco de dados para registros que não podem ser perdidos.
5. **Segurança por padrão**: senhas com hash, tokens revogáveis, menor privilégio,
   auditoria e secrets fora das imagens.
6. **Operação observável**: logs estruturados, métricas, traces, health checks e
   alertas fazem parte da entrega.
7. **Gamificação responsável**: pontos precisam ser explicáveis, auditáveis e não
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

- **Adapter**: implementação que conecta o domínio a HTTP, IXC, CRM, Mongo, Redis ou
  outro sistema.
- **Bounded context**: limite dentro do qual termos e regras de um domínio são
  consistentes.
- **BFF**: API voltada às necessidades do frontend, sem carregar regras de negócio.
- **Evento de domínio**: fato ocorrido e imutável, como `OSFinalizada`.
- **Ledger de pontos**: extrato append-only de créditos, débitos e estornos.
- **Projeção**: visão reconstruível derivada de eventos, como saldo ou ranking.

## Como manter

- Atualize o documento de domínio junto da mudança de comportamento.
- Registre decisões estruturais em um [ADR](./adr/README.md).
- Diferencie claramente estado atual, decisão e hipótese.
- Não copie secrets, credenciais, tokens ou dados pessoais para a documentação.
- Use nomes de eventos e contratos versionados quando cruzarem limites de processo.
