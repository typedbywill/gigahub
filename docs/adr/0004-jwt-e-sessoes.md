# ADR-0004 — Usar JWT curto com refresh token rotativo

- Status: accepted
- Data: 2026-08-07

## Contexto

Frontend, Socket.IO, Telegram e futuros serviços precisam de identidade consistente.
O sistema legado possui JWT, mas também dívida de senha em claro. Tokens longos sem
sessão dificultam revogação; armazenar credenciais persistentes no browser aumenta
impacto de XSS.

## Decisão

Emitir access JWT assinado assimetricamente e de curta duração. Manter refresh token
opaco, rotativo, armazenado como hash no backend e enviado ao browser por cookie
HttpOnly/Secure. Cada login cria sessão durável e revogável; reuso de refresh token
revoga sua família.

Autorização ocorre nos casos de uso. JWT contém claims mínimas e não substitui o estado
durável da identidade. Senhas novas usam Argon2id ou padrão equivalente aprovado.

## Consequências

### Positivas

- access token verificável por múltiplas réplicas;
- janela curta em caso de vazamento;
- revogação, inventário de sessões e detecção de reuso;
- token persistente inacessível ao JavaScript.

### Negativas

- rotação concorrente exige coordenação;
- cookies exigem política de CSRF/SameSite coerente;
- serviço de sessão permanece necessário;
- migração de credenciais legadas precisa de rollout cuidadoso.

## Gatilhos de revisão

- adoção de IdP OIDC externo;
- necessidade de federação ou MFA ampla;
- múltiplas organizações;
- requisitos regulatórios alteram duração ou autenticação;
- risco/custo de manter identidade própria supera integração com IdP.

## Referências

- [Identidade e acesso](../03-identidade-e-acesso.md)
- [Frontend unificado](../06-frontend-unificado.md)
