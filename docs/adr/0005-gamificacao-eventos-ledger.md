# ADR-0005 — Gamificação orientada a eventos e ledger

- Status: accepted
- Data: 2026-08-07

## Contexto

O GigaHub deve registrar pontos por trabalho realizado corretamente e poderá expô-los no futuro. Atualizar apenas um saldo impediria explicar créditos, bloquear duplicação, estornar erros e auditar ajustes. Inserir pontos diretamente em cada domínio também acoplaria regras de incentivo às regras operacionais.

Na primeira fase, pontos são experimentais e invisíveis aos colaboradores.

## Decisão

Gamification será um bounded context que consome eventos verificáveis por outbox,
aplica regras versionadas e grava um ledger append-only. Saldo e futuro ranking são
projeções reconstruíveis.

Créditos automáticos usam idempotency key. Supervisores podem lançar ajustes com
permissão e justificativa. Correções geram estorno/ajuste, nunca edição do lançamento.
A falha da gamificação não falha o caso de uso operacional.

Os pontos não terão efeito em remuneração, punição ou avaliação formal na fase
inicial.

## Consequências

### Positivas

- explicação e auditoria completas;
- replay e reconciliação;
- regras evoluem sem reescrever histórico;
- domínios operacionais não conhecem valores;
- ranking pode ser reconstruído ou desativado.

### Negativas

- exige eventos confiáveis, outbox e consumidor;
- projeções têm consistência eventual;
- catálogo e análise de incentivos exigem governança;
- estorno e eventos atrasados aumentam complexidade.

## Gatilhos de revisão

- proposta de exibir saldo individual ou ranking;
- pontos passam a gerar recompensa ou consequência;
- necessidade de processamento em escala incompatível;
- mudança da finalidade de uso;
- requisitos de privacidade, RH ou jurídicos;
- evidência de manipulação ou efeito adverso.

## Referências

- [Gamificação](../07-gamificacao.md)
- [Roadmap](../08-roadmap.md)
