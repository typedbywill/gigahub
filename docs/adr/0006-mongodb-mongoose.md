# ADR-0006 — Adotar MongoDB com Mongoose como banco de dados principal

- Status: accepted
- Data: 2026-08-07

## Contexto

O GigaHub necessita de uma camada de persistência de dados flexível, de alto desempenho e nativamente preparada para sincronização de schemas evolutivos, documentos complexos e transações ACID via Replica Set (rs0). Decidiu-se explicitamente não utilizar Prisma ORM para evitar impedância e limitações de modelo de dados relacional sobre bancos de dados não relacionais.

## Decisão

Adotar MongoDB com ODM Mongoose (`@nestjs/mongoose`) como banco de dados principal da aplicação backend (`apps/api`).

- As instâncias locais e em container Docker utilizarão a topologia Replica Set de 1 nó (`rs0`) para habilitar suporte a transações multi-documento via Mongoose (`session.withTransaction`).
- O Prisma NÃO será utilizado.
- Schemas Mongoose serão tipados com TypeScript strict e expostos em escopos modulares no NestJS.

## Consequências

### Positivas

- Modelagem nativa de documentos complexos e agregados sem mapeamentos relacionais forçados;
- Suporte a transações ACID através de Replica Set (`rs0`);
- Excelente integração nativa entre NestJS (`@nestjs/mongoose`) e Mongoose;
- Flexibilidade para evolução de schema no ecossistema GigaHub.

### Negativas

- Necessidade de gerenciar a inicialização do Replica Set (`rs0`) no ambiente local Docker;
- Disciplina requerida na definição dos schemas e índices para evitar consultas ineficientes.

## Gatilhos de revisão

- Exigência de suporte a transações altamente distribuídas que excedam as capacidades do MongoDB Replica Set;
- Mudança nos requisitos fundamentais de dados exigindo modelo relacional puro (RDBMS).

## Referências

- [Arquitetura](../02-arquitetura.md)
- [ADR-0001 — Monólito Modular](./0001-monolito-modular.md)
