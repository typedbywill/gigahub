# 06 — Frontend unificado

## Decisão

O GigaHub terá uma única aplicação React responsiva para equipes de campo e internas.
Ela compartilha autenticação, design system, contratos e infraestrutura, mas adapta
navegação e densidade ao contexto do usuário.

Não serão adotados microfrontends inicialmente. Módulos de frontend são fronteiras de
código dentro do mesmo build.

## Objetivos

- uma identidade e uma URL para toda a plataforma;
- experiência mobile-first para campo e desktop eficiente para back-office;
- mesma regra de negócio em todos os canais;
- navegação determinada por capacidades, não por aplicações separadas;
- carregamento sob demanda para evitar bundle único pesado;
- observabilidade e tratamento de erro consistentes.

## Estrutura sugerida

```text
apps/web/src/
├── app/                  # bootstrap, providers, router e layouts
├── modules/              # os, network, inventory, finance, telemetry...
├── shared/
│   ├── api/              # cliente HTTP e contratos
│   ├── auth/             # sessão e guards de experiência
│   ├── realtime/         # Socket.IO e reconciliação
│   ├── ui/               # design system
│   └── observability/
└── pages/                # composição de rotas, sem regra de domínio
```

Cada módulo expõe rotas, navegação, queries, commands e componentes públicos por um
entrypoint. Imports profundos entre módulos são proibidos.

## Shell

O shell é responsável por:

- bootstrap e recuperação da sessão;
- tema, idioma e acessibilidade;
- roteamento e layouts;
- navegação filtrada por permissões;
- cliente HTTP e conexão Socket.IO;
- boundaries de erro;
- telemetria de frontend;
- feature flags;
- notificações globais.

Ele não contém regras de OS, financeiro, rede ou gamificação.

## Experiências

### Campo

- navegação curta e ações primárias grandes;
- formulários em etapas, feedback de upload e prevenção de perda;
- baixo consumo de dados;
- reconexão clara e retry seguro;
- captura de GPS e mídia com consentimento/contexto;
- funcionamento aceitável em telas pequenas e sob luz externa.

### Operações internas

- navegação lateral e atalhos;
- tabelas, filtros e comparação de dados;
- monitoramento ao vivo;
- densidade ajustável;
- ações administrativas com confirmação e justificativa.

O layout muda pelo viewport e pelo contexto, nunca por confiança no dispositivo para
autorizar ações.

## Rotas e autorização

Rotas representam módulos:

```text
/inicio
/os
/os/:id
/rede
/estoque
/financeiro
/clientes
/monitoramento
/administracao/acessos
/administracao/gamificacao
```

Metadados de rota declaram permissões necessárias e contexto preferencial. O frontend
oculta ou desabilita ações para melhorar a UX; a API repete toda verificação.

Uma resposta `403` deve explicar falta de acesso sem revelar dados. Uma resposta `401`
tenta renovar a sessão uma vez; falha encerra a sessão sem loop.

## Estado e dados

- TanStack Query para estado remoto, cache e invalidação.
- Estado local do componente para interação efêmera.
- Store global apenas para sessão, preferências e coordenação realmente compartilhada.
- Formulários mantêm rascunho somente quando o dado e a privacidade permitirem.
- Contratos de API são gerados ou validados contra OpenAPI.

Não duplicar entidade remota em múltiplas stores. Mutations usam idempotency key em
ações suscetíveis a duplo clique ou retry.

## Tempo real

1. Página carrega snapshot por HTTP.
2. Shell conecta Socket.IO após autenticação.
3. Módulo assina eventos autorizados.
4. Evento atualiza/invalida cache.
5. Após reconexão, módulo refaz snapshot.

Eventos não substituem resposta do comando. A UI tolera duplicação e atraso.

## Sessão

Access token permanece em memória. Refresh token fica em cookie seguro e HttpOnly.
O shell coordena refresh concorrente para que várias requisições não rotacionem o
mesmo token simultaneamente.

Logout limpa estado sensível, desconecta Socket.IO e invalida queries. Informações de
outro usuário nunca permanecem visíveis após troca de sessão.

## Design system

O design system define tokens, tipografia, cores semânticas, espaçamento, ícones,
componentes, estados e padrões de formulário. Componentes precisam funcionar em
teclado, leitor de tela e touch.

Requisitos mínimos:

- contraste e foco visível;
- labels e mensagens de erro associadas;
- touch targets adequados;
- redução de movimento respeitada;
- não depender apenas de cor;
- estados de loading, vazio, erro, offline e acesso negado.

## Feature flags

Flags apoiam rollout gradual e comparação com fluxos legados. Elas não autorizam
acesso. Toda flag possui owner, objetivo, data de revisão e estratégia de remoção.

Usos iniciais:

- migrar jornadas de campo e back-office para o frontend unificado;
- liberar módulo por equipe;
- ativar visualização individual de pontos;
- testar ranking somente após aprovação.

## Gamificação na interface

Na fase silenciosa, somente usuários administrativos autorizados acessam diagnóstico
das regras, ledger e ajustes. O colaborador não vê saldo ou ranking.

Evolução prevista:

1. registro invisível;
2. painel administrativo de qualidade dos dados;
3. extrato individual explicável;
4. reconhecimento por equipe;
5. ranking geral, apenas se revisão de privacidade e incentivos aprovar.

Nenhuma tela deve apresentar pontuação como avaliação formal enquanto esse não for o
uso explicitamente aprovado.

## Performance

- code splitting por módulo/rota;
- budgets de JavaScript, imagens e Web Vitals;
- paginação/virtualização para listas grandes;
- evitar manter streams em páginas desmontadas;
- compressão e cache de assets com hash;
- monitorar por dispositivo e qualidade de rede.

## Testes

- unitários para regras de apresentação e utilitários;
- componentes para estados e acessibilidade;
- integração para sessão, API e tempo real;
- E2E para jornadas críticas de campo e back-office;
- contrato entre frontend e OpenAPI;
- responsividade em larguras representativas;
- reconexão, rede lenta, token expirado e duplo envio.

## Critérios de aceite

- uma aplicação atende os dois contextos sem duplicar domínio;
- navegação e ações respeitam permissões;
- jornadas críticas são utilizáveis em mobile;
- refresh e logout não vazam sessão;
- reconexão recupera snapshot;
- módulos carregam sob demanda;
- acessibilidade e performance têm métricas em CI/produção;
- ranking permanece desativado na fase inicial.
