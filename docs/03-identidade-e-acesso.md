# 03 — Identidade e acesso

## Objetivo

Oferecer uma identidade única para frontend, Telegram e ferramentas internas, com
sessões seguras, revogação, auditoria e um caminho evolutivo para grupos, roles e
permissões individuais.

A v1 é single-tenant e atende colaboradores da Giganet. Autenticação e autorização
são responsabilidades distintas.

## Modelo inicial

- **User**: identidade do colaborador no GigaHub.
- **Credential**: material de autenticação; nunca exposto no perfil.
- **Session**: login revogável associado a dispositivo e refresh token.
- **Role**: conjunto nomeado de permissões para uma função de trabalho.
- **Permission**: ação atômica no formato `recurso:acao`.
- **Grant**: associação de role ou permission a um usuário.
- **Service account**: identidade não humana para workers e integrações.
- **Audit event**: registro de login, falha, revogação e alteração de acesso.

O identificador interno do usuário não deve ser o e-mail, matrícula IXC ou ID do
Telegram. Esses valores são identidades externas vinculáveis e mutáveis.

## Autenticação

### Login

1. O cliente envia credenciais por HTTPS.
2. O backend aplica rate limit por origem e identidade normalizada.
3. A senha é comparada com hash resistente a força bruta, preferencialmente Argon2id.
4. O backend cria uma sessão e retorna access token e refresh token.
5. O login bem-sucedido e as falhas relevantes são auditados.

Senhas em claro do sistema legado exigem migração explícita. Uma estratégia aceitável
é re-hash no primeiro login válido, seguida de prazo para remoção total da comparação
legada. Novas credenciais nunca usam o formato antigo.

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
```

O backend verifica permissões no caso de uso. O frontend usa o mesmo catálogo para
experiência e navegação, mas nunca é a barreira de segurança.

### Fase inicial

- Roles correspondem a funções operacionais conhecidas.
- Um usuário pode possuir mais de uma role.
- Grants individuais resolvem exceções temporárias ou específicas.
- Negação explícita não será introduzida inicialmente; ela dificulta a explicação da
  política. Exceções usam remoção de grant ou escopo.
- Alterações incrementam uma versão de autorização para invalidar cache.

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

## Integração com IXC e Telegram

- O sync do IXC atualiza atributos profissionais, não substitui a identidade interna.
- Desativação no sistema oficial deve bloquear novos logins e revogar sessões conforme
  política definida.
- Vínculo com Telegram exige prova no GigaHub; conhecer um chat ID não autentica alguém.
- O bot age como canal do usuário vinculado e chama os mesmos casos de uso da Web.

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
- chaves de assinatura rotacionáveis;
- ações sensíveis auditadas;
- Redis não é a única fonte de sessões ou grants;
- procedimento de migração das credenciais legadas aprovado antes do rollout.
