# 03 — Identidade e acesso

## Objetivo

Oferecer uma identidade única para o frontend unificado e ferramentas internas, com
sessões seguras, revogação, auditoria e autorização baseada em RBAC com grants
diretos por usuário. Grupos e escopos ficam como evolução.

A v1 é single-tenant e atende colaboradores da Giganet. Autenticação e autorização
são responsabilidades distintas.

## Modelo inicial

- **User**: identidade do colaborador no GigaHub (auth + perfil operacional).
  Une o que no IXC está em `usuarios` (login) e `funcionarios` (colaborador HR/ops).
  Vínculos externos opcionais: `idErp` (`usuarios.id`) e `idErpEmployee`
  (`funcionarios.id`). O id interno não é a matrícula IXC. Refs de técnico em OS e
  agente em tickets usam `UserId`.
- **Credential**: material de autenticação; nunca exposto no perfil.
- **Session**: login revogável associado a dispositivo e refresh token.
- **Role**: conjunto nomeado de permissões para uma função de trabalho.
- **Permission**: ação atômica no formato `recurso:acao`.
- **Grant**: vínculo auditável de acesso a um usuário. Pode ser de role
  (`GrantRole`) ou de permissão direta (`GrantPermission`).
- **Service account**: identidade não humana para workers e integrações.
- **Audit event**: registro de login, falha, revogação e alteração de acesso.

O identificador interno do usuário não deve ser o e-mail ou a matrícula IXC.
Esses valores são identidades externas vinculáveis e mutáveis.

## Autenticação

### Login

1. O cliente envia credenciais por HTTPS.
2. O backend aplica rate limit por origem e identidade normalizada.
3. A senha é verificada assim:
   - colaborador com vínculo IXC (`idErp`): validação **ao vivo** no MySQL do
     ERP, comparando `SHA-256(hex)` da senha com `usuarios.senha` (mesmo método
     do IXC);
   - usuário local (bootstrap manual no banco): Argon2id na `Credential`
     do GigaHub.
4. O backend cria uma sessão e retorna access token e refresh token.
5. O login bem-sucedido e as falhas relevantes são auditados.

Senhas de colaboradores ERP **não** são copiadas para o GigaHub. O sync de
usuários atualiza só perfil e status.

### Access token JWT

- Assinado assimetricamente para permitir verificação sem compartilhar chave privada.
- Curta duração; referência inicial: 5 a 15 minutos.
- Claims mínimas: `iss`, `sub`, `aud`, `iat`, `exp`, `jti` e `sid`.
- Pode conter versão de autorização, mas não um perfil completo ou dado sensível.
- Validado por issuer, audience, assinatura, expiração e algoritmo permitido.
- Chaves possuem `kid` e rotação com período de sobreposição.

JWT não significa sessão impossível de revogar. Operações sensíveis podem consultar o
estado da sessão ou uma versão de segurança no backend.

### Refresh token

- String aleatória opaca, nunca JWT.
- Armazenado no servidor somente como hash.
- Rotacionado a cada uso.
- Reuso de token antigo revoga toda a família da sessão.
- Possui expiração absoluta e, opcionalmente, por inatividade.
- No browser, enviado em cookie `HttpOnly`, `Secure` e `SameSite` apropriado.

Se o access token for mantido em memória pelo frontend, um refresh de página usa o
cookie para obter um novo token. Evitar tokens persistentes em `localStorage`.

### Logout e revogação

- Logout revoga a sessão atual e remove o cookie.
- Usuário pode encerrar todas as próprias sessões.
- Administradores autorizados podem revogar sessões, com motivo auditado.
- Mudança de senha e suspeita de comprometimento revogam todas as sessões.

Redis pode acelerar checagem de sessão e revogação, mas o registro durável da sessão
fica no banco. Uma indisponibilidade do Redis não deve apagar ou reativar sessões.

## Autorização

Modelo adotado: **RBAC com grants diretos por usuário**. A role cobre o padrão da
função; a permissão direta cobre exceção fina sem criar role descartável.

```text
User ──GrantRole──────► Role ──possui──► Permission
  └──GrantPermission─────────────────────► Permission
```

Permissão efetiva = união das permissões das roles ativas do usuário com as
permissões concedidas diretamente a ele. O caso de uso pergunta apenas
`usuario.pode(permissao)`; não diferencia a origem na verificação.

### Convenção

Permissões são estáveis e orientadas a capacidade:

```text
os:read
os:execute
os:review
finance:cashbox:inspect
telemetry:location:read
gamification:adjust
access:manage
users:read
users:update
users:inactivate
```

O backend verifica permissões no caso de uso. O frontend usa o mesmo catálogo para
experiência e navegação, mas nunca é a barreira de segurança.

### Roles (padrão)

- Correspondem a funções operacionais conhecidas (`tecnico`, `supervisor`,
  `financeiro`, `admin-acesso`, etc.).
- São criadas no bootstrap da API de forma idempotente (não há seed de usuário).
- `admin-acesso` inclui `access:manage` para o primeiro admin concedido manualmente
  no banco (após sync ou insert local) poder gerenciar os demais.
- Um usuário pode possuir mais de uma role.
- Roles são a forma preferida de conceder acesso recorrente e reutilizável.
- Alterar a composição de uma role afeta todos os usuários que a possuem.

### Grants diretos (controle fino)

Usados quando a necessidade é pontual e não justifica uma role nova:

- liberar uma permissão extra a um colaborador específico;
- acesso temporário com `expiresAt`;
- exceção operacional documentada (ex.: `gamification:adjust` só para um gestor).

Regras:

- Todo grant direto exige justificativa auditável.
- Preferir prazo (`expiresAt`) em exceções temporárias; grant sem prazo é permanente
  até remoção explícita.
- Não criar role com uma única permissão só para atender um usuário — use
  `GrantPermission`.
- Não acumular dezenas de grants diretos no mesmo usuário como substituto de role;
  nesse caso, criar ou ajustar a role.

### Resolução

1. Carregar `GrantRole` e `GrantPermission` vigentes do usuário (não expirados,
   não revogados).
2. Expandir roles para o conjunto de permissões do catálogo.
3. Unir com as permissões diretas.
4. Autorizar se a permissão requerida estiver no conjunto efetivo.

Negação explícita não será introduzida inicialmente; ela dificulta a explicação da
política. Exceções usam remoção de grant, ajuste de role ou escopo futuro.

Alterações de role, grant ou catálogo incrementam a versão de autorização do
usuário (ou global, conforme implementação) para invalidar cache. O JWT pode
carregar essa versão; o backend revalida quando a versão divergir.

### Administração e revisão

- Quem possui `access:manage` administra roles, grants e o catálogo.
- A UI de acesso deve mostrar, por usuário: roles, permissões efetivas e a origem
  de cada permissão (role X ou grant direto), para explicar por que uma ação foi
  permitida.
- Grants com prazo entram em revisão automática próximo do vencimento.
- Revisões periódicas listam grants diretos permanentes como candidatos a
  consolidação em role.

### Evolução futura

Grupos podem representar equipes, cidades, departamentos ou escalas. Escopos podem
limitar uma permissão a filial, equipe, recurso ou região. ABAC somente será adotado
para políticas que realmente dependam de atributos, como “supervisiona esta equipe”.

Antes dessa evolução, devem ser respondidas:

- quem administra cada grupo e role;
- como conflitos e heranças funcionam;
- quais acessos possuem prazo;
- como revisar acessos periodicamente;
- como demonstrar por que uma ação foi permitida ou negada.

## Integração com IXC

- O sync do IXC (boot + cron ~5 min, quando `IXC_DB_USER` está configurado)
  atualiza atributos profissionais (`name`, `jobTitle`, caixa, almoxarifado,
  planejamento) e o espelhamento de ativo/inativo via `applyErpActive`; não
  substitui a identidade interna (`UserId`) e **não** persiste senha.
- Login e troca de senha de colaboradores vinculados usam o MySQL do IXC
  (`usuarios.senha` em SHA-256 hex). `POST /auth/change-password` atualiza a
  senha no ERP e revoga sessões do GigaHub.
- Desativação no sistema oficial (ausência no lote ou `status !== A`) bloqueia
  novos logins conforme política do domínio.

## Service accounts

Workers usam credenciais próprias, de menor privilégio, rotacionáveis e separadas por
workload. Não reutilizam JWT ou senha de colaborador. A ação auditada registra tanto a
service account quanto o ator humano original quando o contexto existir.

## Auditoria

Registrar, no mínimo:

- sucesso e falha de login sem armazenar senha;
- emissão, refresh, revogação e detecção de reuso;
- mudança de senha e recuperação de conta;
- vínculo e desvínculo de identidade externa;
- criação e alteração de roles, permissões e grants;
- acesso administrativo a localização e ajustes de pontos.

Eventos incluem ator, alvo, ação, resultado, instante, origem, `traceId` e justificativa
quando aplicável. Logs operacionais não substituem auditoria.

## Recuperação de conta

O mecanismo deve evitar perguntas pessoais e tokens previsíveis. Tokens de recuperação
são aleatórios, de uso único, curtos e armazenados como hash. A troca revoga sessões
existentes e gera auditoria. Até existir canal seguro automatizado, a recuperação pode
ser assistida por TI com dupla verificação documentada.

## Critérios de aceite

- nenhuma senha nova armazenada ou comparada em claro;
- refresh token rotativo com detecção de reuso;
- logout e revogação efetivos;
- autorização aplicada no backend e coberta por testes;
- permissão efetiva = união de roles + grants diretos vigentes;
- grant direto auditável, com justificativa e suporte a `expiresAt`;
- chaves de assinatura rotacionáveis;
- ações sensíveis auditadas;
- Redis não é a única fonte de sessões ou grants;
- procedimento de migração das credenciais legadas aprovado antes do rollout.
