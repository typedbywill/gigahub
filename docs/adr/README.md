# Registros de decisões arquiteturais

ADRs registram decisões que alteram estrutura, segurança, operação ou contratos do
GigaHub. Eles explicam por que uma escolha foi feita e quando deve ser revisada.

## Estados

- `proposed`: em discussão;
- `accepted`: decisão vigente;
- `superseded`: substituída por outro ADR;
- `deprecated`: não recomendada para trabalho novo.

ADRs aceitos não são editados para reescrever a decisão. Correções pequenas são
permitidas; mudança material cria novo ADR e referencia o anterior.

## Índice

- [ADR-0001 — Começar como monólito modular](./0001-monolito-modular.md)
- [ADR-0002 — Adotar frontend React unificado](./0002-frontend-unificado.md)
- [ADR-0003 — Usar Redis como infraestrutura efêmera](./0003-redis-efemero.md)
- [ADR-0004 — Usar JWT curto com refresh token rotativo](./0004-jwt-e-sessoes.md)
- [ADR-0005 — Gamificação orientada a eventos e ledger](./0005-gamificacao-eventos-ledger.md)
- [ADR-0006 — Adotar MongoDB com Mongoose como banco de dados principal](./0006-mongodb-mongoose.md)

## Template

```markdown
# ADR-NNNN — Título

- Status: proposed
- Data: AAAA-MM-DD

## Contexto

## Decisão

## Consequências

## Gatilhos de revisão

## Referências
```

O campo de data representa a decisão, não necessariamente a implementação.
