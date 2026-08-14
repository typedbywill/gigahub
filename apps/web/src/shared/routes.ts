/** Rotas canônicas do frontend (português). */
export const routes = {
  home: '/',
  login: '/login',
  perfil: '/perfil',
  redeProjeto: '/rede/projeto',
  demandas: '/demandas',
  demandasCaixa: '/demandas/caixa',
  demandasPendentes: '/demandas/pendentes',
  demandasAssumidas: '/demandas/assumidas',
  demandasTodas: '/demandas/todas',
  demandasNova: '/demandas/nova',
  demanda: (id: string) => `/demandas/${encodeURIComponent(id)}`,
  usuarios: '/configuracoes/usuarios',
  usuario: (id: string) => `/configuracoes/usuarios/${encodeURIComponent(id)}`,
  permissoes: '/configuracoes/permissoes',
  permissao: (id: string) =>
    `/configuracoes/permissoes/${encodeURIComponent(id)}`,
  assuntos: '/configuracoes/assuntos',
  assunto: (id: string) => `/configuracoes/assuntos/${encodeURIComponent(id)}`,
  // Cadastros > Clientes
  cadastrosClientes: '/cadastros/clientes',
  cadastrosCliente: (id: string) =>
    `/cadastros/clientes/${encodeURIComponent(id)}`,
  cadastrosClienteVisaoGeral: (id: string) =>
    `/cadastros/clientes/${encodeURIComponent(id)}/visao-geral`,
  cadastrosClienteContratos: (id: string) =>
    `/cadastros/clientes/${encodeURIComponent(id)}/contratos`,
  cadastrosClienteFinanceiro: (id: string) =>
    `/cadastros/clientes/${encodeURIComponent(id)}/financeiro`,
  cadastrosClienteLogins: (id: string) =>
    `/cadastros/clientes/${encodeURIComponent(id)}/logins`,
  cadastrosClienteOrdensServico: (id: string) =>
    `/cadastros/clientes/${encodeURIComponent(id)}/ordens-de-servico`,
} as const;
