/** Rotas canônicas do frontend (português). */
export const routes = {
  home: '/',
  login: '/login',
  perfil: '/perfil',
  redeProjeto: '/rede/projeto',
  usuarios: '/configuracoes/usuarios',
  usuario: (id: string) => `/configuracoes/usuarios/${encodeURIComponent(id)}`,
  permissoes: '/configuracoes/permissoes',
  permissao: (id: string) =>
    `/configuracoes/permissoes/${encodeURIComponent(id)}`,
} as const;
