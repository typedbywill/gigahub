# 01 — Visão de produto

## Propósito

O GigaHub será o ponto único de trabalho operacional da Giganet. A plataforma deve
reduzir a fragmentação entre Telegram, aplicações de campo, back-office e integrações,
sem perder os fluxos já consolidados no GigaCenter.

O produto não substitui o IXC como ERP. Ele organiza a experiência dos colaboradores,
aplica políticas operacionais e integra os sistemas necessários para executar o trabalho.

## Públicos

### Equipe de campo

Técnicos e demais colaboradores externos ao escritório precisam de uma experiência
mobile-first, rápida e tolerante a redes instáveis para:

- consultar e executar ordens de serviço;
- registrar localização, evidências, perguntas e materiais;
- operar CTO, ONU, estoque e suporte;
- receber feedback claro sobre validações e pendências.

### Equipe interna

Supervisão, financeiro, suporte, NOC, administrativo e TI precisam de uma experiência desktop para:

- acompanhar operação e localização em tempo real;
- revisar conformidade e exceções;
- operar caixa, estoque, rede e atendimento;
- configurar regras e consultar auditoria.

Os dois públicos usam o mesmo produto e a mesma identidade. As diferenças são
responsividade, navegação, contexto e autorização — não aplicações independentes.

## Objetivos

1. Unificar os canais em torno dos mesmos casos de uso.
2. Preservar e tornar explícitas as regras críticas do GigaCenter.
3. Permitir crescimento horizontal sem depender de memória local.
4. Isolar jobs e integrações pesadas do tráfego interativo.
5. Padronizar autenticação, autorização, auditoria e observabilidade.
6. Registrar gamificação de forma explicável antes de expor saldos ou rankings.
7. Viabilizar implantação repetível em Kubernetes.

## Escopo da primeira versão

- Monorepo Nx com frontend React e backend NestJS.
- Monólito modular com limites por domínio.
- JWT com access token curto e refresh token rotativo.
- Socket.IO para recursos realmente interativos.
- Redis para coordenação, cache efêmero, rate limit e escala do Socket.IO.
- Workers e CronJobs para rotinas que não pertencem ao request/response.
- Preparação de imagens, probes, configuração e observabilidade para Kubernetes.
- Registro silencioso dos pontos de gamificação.

## Fora de escopo inicial

- Plataforma SaaS ou multi-tenant.
- Reescrever billing, contratos e demais responsabilidades do IXC.
- Separar todos os domínios em microserviços.
- Ranking visível para todos, premiações ou punições.
- Modelo definitivo de grupos, roles e permissões individuais.
- Operação offline completa no navegador.

## Capacidades e domínios

- **Identity & Access**: identidade, sessões, autenticação, permissões e auditoria.
- **Field Work**: agenda, execução, revisão e conformidade de OS.
- **Network**: CTO, fibra, sinal e provisionamento de ONU.
- **Inventory**: estoque, requisições, transferências e materiais da OS.
- **Finance Ops**: caixas e fluxos financeiros operacionais.
- **Customer Care**: consulta de clientes, suporte e CRM.
- **Messaging**: Telegram, WhatsApp e notificações.
- **Telemetry**: localização, presença e rastreamento.
- **Automation**: sincronizações, agendamentos e processos assíncronos.
- **Gamification**: regras, eventos pontuáveis, ledger e projeções.
- **Experience**: frontend unificado e BFF.

## Contratos herdados

A migração deve preservar, até que uma decisão de produto os altere:

- fluxo de OS `AG → DS → EX`, com finalização coordenada pelo CRM;
- assuntos de OS como motor de fotos, perguntas, validações e revisão;
- geofence de 300 m e exigência de localização recente;
- cadeia de fechamento, transferência, recebimento e vistoria de caixa;
- autorização automatizada de ONU;
- paridade de regra entre Telegram e Web;
- IXC como fonte operacional de OS, clientes e estoque ERP.

## Métricas de sucesso

- percentual dos casos de uso compartilhados por todos os canais;
- redução de erros e retrabalho por fluxo;
- disponibilidade e latência por jornada crítica;
- tempo de recuperação e taxa de falha das integrações;
- jobs duplicados ou perdidos;
- cobertura de auditoria de ações sensíveis;
- adoção do frontend unificado por equipe;
- qualidade das regras de pontos antes de qualquer exposição.

Gamificação não deve ser considerada bem-sucedida apenas porque aumenta quantidade.
Ela deve ser avaliada pela melhora de qualidade, conformidade e redução de retrabalho.

## Restrições

- Integrações legadas podem não oferecer eventos, idempotência ou alta disponibilidade.
- Conectividade de campo é variável.
- Dados pessoais e localização exigem acesso restrito, retenção definida e auditoria.
- A equipe deve conseguir operar e evoluir a arquitetura; complexidade operacional é
  um custo de produto.
