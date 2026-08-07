# ADR-0002 — Adotar frontend React unificado

- Status: accepted
- Data: 2026-08-07

## Contexto

O GigaCenter possui interfaces externa e interna. Os usuários externos ao escritório
são colaboradores da própria Giganet, não tenants independentes. As aplicações
compartilham identidade, domínios e design, enquanto diferem em responsividade,
navegação e densidade.

Microfrontends adicionariam deploys, contratos e coordenação sem times independentes
ou necessidade atual.

## Decisão

Criar uma aplicação React única com shell, design system e módulos por domínio. Campo
e back-office usam layouts responsivos e navegação baseada em capacidades. Módulos
carregam sob demanda e respeitam boundaries no código.

Autorização sempre é repetida no backend. O frontend apenas adapta a experiência.

## Consequências

### Positivas

- login, sessão, observabilidade e componentes consistentes;
- menor duplicação;
- jornada entre áreas sem troca de aplicação;
- rollout gradual por feature flag.

### Negativas

- bundle e dependências exigem budgets e code splitting;
- falha no shell pode afetar todas as áreas;
- ownership de módulos precisa ser explícito.

## Gatilhos de revisão

- times autônomos precisam de ciclos de release incompatíveis;
- módulos exigem stacks/runtime distintos;
- tamanho ou estabilidade não podem ser resolvidos com boundaries e carregamento;
- necessidade comprovada de distribuição independente.

## Referências

- [Frontend unificado](../06-frontend-unificado.md)
- [Visão de produto](../01-visao-produto.md)
