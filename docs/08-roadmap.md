# 08 — Roadmap

## Estratégia

A migração é incremental e orientada a risco. Cada fase entrega capacidade utilizável,
mantém compatibilidade necessária e possui critérios de saída. Datas dependem de
capacidade da equipe e descoberta técnica; a ordem é mais importante que uma previsão
prematura.

## Fase 0 — Baseline e segurança

### Entregas

- validar esta documentação com produto, operação e engenharia;
- inventariar endpoints, rotinas, integrações, dados e owners;
- mapear jornadas e contratos críticos do GigaCenter;
- medir disponibilidade, latência, erros e volume atuais;
- definir migração de senhas em claro;
- classificar secrets e removê-los de código/imagens;
- criar ADRs e processo de atualização.

### Saída

- inventário revisado;
- jornadas críticas com testes de caracterização;
- plano de credenciais aprovado;
- riscos e owners registrados;
- baseline de métricas disponível.

## Fase 1 — Fundação modular

### Entregas

- estabelecer monorepo e boundaries;
- separar domain, application e adapters por módulo;
- manter REST e UI sobre os mesmos casos de uso;
- padronizar erros, validação, idempotency key e `traceId`;
- OpenAPI e testes de contrato;
- logs estruturados e health endpoints;
- introduzir outbox para efeitos que não podem ser perdidos.

Priorizar Identity & Access e uma fatia vertical de baixo risco antes de mover OS
inteira.

### Saída

- boundaries verificadas;
- caso de uso atravessa frontend/API/domínio/adapter;
- campo e operações usam os mesmos casos de uso via UI;
- outbox recupera falha sem duplicar;
- deploy atual continua operacional.

## Fase 2 — Identidade e frontend unificado

### Entregas

- hash de senha e migração;
- access JWT curto e refresh rotativo;
- sessões, revogação e auditoria;
- catálogo inicial de permissões e roles;
- shell React, design system e layouts campo/operações;
- feature flags e rollout gradual;
- migrar jornadas por domínio, mantendo fallback controlado.

### Saída

- fluxo legado inseguro desativado;
- logout/revogação testados;
- autorização aplicada no backend;
- primeira jornada de campo e interna no mesmo frontend;
- métricas de adoção e erro disponíveis.

## Fase 3 — Redis e tempo real

### Entregas

- Redis com observabilidade e estratégia de falha;
- Socket.IO adapter entre múltiplas réplicas;
- autenticação, salas autorizadas e reconexão;
- GPS com snapshot durável e projeção efêmera;
- rate limits distribuídos;
- retirar dependência de memória local para escalar API.

### Saída

- duas réplicas atendem os mesmos clientes;
- rollout drena conexões;
- falha de Redis degrada conforme política;
- localização durável não é perdida;
- teste de carga e capacidade documentado.

## Fase 4 — Gamificação silenciosa

Pode começar em paralelo após outbox e identidades estáveis.

### Entregas

- eventos candidatos e catálogo de regras em `draft`;
- ledger append-only e constraints de idempotência;
- consumidor assíncrono, retry e reconciliação;
- regras versionadas;
- ajustes manuais auditados;
- painel administrativo restrito;
- análise de viés, manipulação e retrabalho.

### Saída

- período representativo sem duplicação inexplicada;
- replay e reconciliação validados;
- pontos explicáveis até o evento de origem;
- nenhuma exposição ou consequência para colaboradores;
- decisão explícita antes da fase de extrato individual.

## Fase 5 — Workers e Kubernetes

### Entregas

- jobs idempotentes com retry, dead letter e alertas;
- imagens não-root, probes, recursos e shutdown gracioso;
- ambientes dev/staging/prod;
- secret manager e configuração externa;
- CI com testes, scan, SBOM e publicação;
- GitOps e smoke tests;
- backup/restore e runbooks.

### Saída

- staging representa produção;
- jobs não competem com a API;
- deploy e rollback rastreáveis;
- restore testado;
- SLOs e alertas para jornadas críticas.

## Fase 6 — Extração seletiva

### Ordem candidata

1. PDF renderer;
2. Telemetry;
3. Finance Ops, se o limite estiver estável;
4. demais domínios conforme evidência;

### Saída por serviço

- motivo mensurável;
- contrato versionado;
- ownership de dados;
- teste de falha de rede;
- observabilidade ponta a ponta;
- custo operacional aceito;
- rollback/migração definidos.

Não extrair um domínio apenas porque a infraestrutura permite.

## Fase 7 — Evolução de acesso e gamificação

### Identidade

- avaliar grupos por equipe, cidade ou departamento;
- grants temporários e revisão periódica;
- escopos de acesso;
- IdP externo se reduzir risco/custo;
- ABAC somente para casos concretos.

### Gamificação

- extrato individual com contestação;
- reconhecimento de equipe;
- possível ranking geral após revisão de incentivos e privacidade;
- recompensas somente mediante nova decisão de produto;
- uso em avaliação formal permanece fora do escopo até decisão específica.

## Trilha contínua de domínio

Em todas as fases:

- preservar contratos de OS, geofence, assuntos, financeiro e ONU;
- atualizar docs junto das mudanças;
- medir divergência entre UI e integrações;
- retirar caminhos legados somente após paridade e período de observação;
- registrar decisões relevantes em ADR.

## Riscos prioritários

### Segurança de credenciais

Tratar antes de ampliar exposição. Não carregar comparação de senha em claro para o
novo núcleo.

### Acoplamento ao IXC

Usar adapters e testes de contrato. Evitar replicar indiscriminadamente dados do ERP.

### Distribuição prematura

Monólito modular reduz custo de consistência e operação enquanto limites amadurecem.

### Redis como banco

Revisões devem bloquear novos estados obrigatórios que existam somente no cache.

### Pontos distorcendo comportamento

Fase silenciosa, regras de qualidade, limites, estornos e revisão multidisciplinar
antes de qualquer exposição.

### Dupla operação

Feature flags, reconciliação e métricas precisam indicar qual fluxo é fonte em cada
etapa. Evitar manter dois caminhos indefinidamente.

## Definition of Done da v1

- [ ] Frontend único atende campo e operações.
- [ ] Casos de uso compartilhados por canais.
- [ ] Senhas protegidas e sessões revogáveis.
- [ ] Autorização no backend e auditoria sensível.
- [ ] Redis e Socket.IO funcionam em múltiplas réplicas.
- [ ] Workers críticos não competem com API.
- [ ] Deploy Kubernetes reproduzível em staging/prod.
- [ ] Logs, métricas, tracing, alertas e runbooks.
- [ ] Contratos OpenAPI e eventos versionados.
- [ ] Ledger de pontos auditável em fase silenciosa.
- [ ] Dados duráveis independem do Redis.
- [ ] Documentação e ADRs atualizados.
