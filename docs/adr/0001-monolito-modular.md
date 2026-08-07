# ADR-0001 — Começar como monólito modular

- Status: accepted
- Data: 2026-08-07

## Contexto

O GigaCenter concentra API, Telegram, rotinas e integrações em um processo. O GigaHub
precisa escalar e isolar falhas, mas os limites de domínio e contratos ainda estão em
formação. Separar tudo imediatamente criaria rede, consistência distribuída, múltiplos
deploys e observabilidade antes de existir necessidade comprovada.

## Decisão

Manter um monorepo Nx e iniciar os domínios em um monólito modular NestJS. Domain,
application e adapters têm dependências controladas. Workers e componentes com perfil
distinto podem ser extraídos cedo, sem exigir microserviços para todos os módulos.

Serviços de domínio serão extraídos somente com motivo mensurável e contrato estável.

## Consequências

### Positivas

- migração incremental e menor risco para regras críticas;
- chamadas locais simples enquanto limites amadurecem;
- refatoração e testes compartilhados no mesmo repositório;
- caminho explícito para extração posterior.

### Negativas

- falhas e escala de módulos ainda compartilham parte do processo;
- boundaries precisam de disciplina e validação automatizada;
- deploy do núcleo permanece coordenado no início.

## Gatilhos de revisão

- módulo exige escala independente recorrente;
- runtime pesado prejudica o processo principal;
- isolamento de segurança ou dados se torna obrigatório;
- equipes e ciclos de entrega independentes;
- boundary e contratos cobertos por testes estão estáveis.

## Referências

- [Arquitetura](../02-arquitetura.md)
- [Roadmap](../08-roadmap.md)
