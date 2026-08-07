# ADR-0003 — Usar Redis como infraestrutura efêmera

- Status: accepted
- Data: 2026-08-07

## Contexto

O GigaHub precisa distribuir Socket.IO entre réplicas, aplicar rate limits, coordenar
locks curtos e acelerar leituras. O GigaCenter usa Mongo como cache e memória do
processo não permite escala horizontal segura.

Redis é adequado a dados de baixa latência, mas usá-lo como única fonte de registros
operacionais ampliaria risco de perda, eviction e acoplamento.

## Decisão

Usar Redis para Socket.IO pub/sub, cache reconstruível, presença, última localização
efêmera, rate limit, deduplicação curta, locks e aceleração de sessão.

Dados obrigatórios permanecem em banco durável. Toda chave de cache/presença possui
TTL e namespace por ambiente/módulo. Cada caso de uso define comportamento durante
indisponibilidade do Redis.

## Consequências

### Positivas

- API e tempo real podem escalar horizontalmente;
- baixa latência para hot paths;
- coordenação distribuída padronizada.

### Negativas

- nova dependência operacional;
- falhas e política de memória precisam ser testadas;
- invalidação de cache e consistência exigem disciplina.

## Gatilhos de revisão

- necessidade comprovada de Redis Streams ou persistência além do uso atual;
- serviço gerenciado/operado não atende disponibilidade;
- volume exige particionamento;
- requisito durável tenta depender somente de Redis.

## Referências

- [Tempo real e Redis](../04-tempo-real-e-redis.md)
- [Kubernetes e operação](../05-kubernetes-e-operacao.md)
