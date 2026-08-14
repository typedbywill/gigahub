import React, { useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useParams,
} from 'react-router-dom';
import { Layout } from '../shared/components/Layout';
import { RequirePermission } from '../shared/components/RequirePermission';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { RedeProjetoPage } from '../pages/rede/RedeProjetoPage';
import { PermissionsPage } from '../pages/settings/PermissionsPage';
import { RoleDetailPage } from '../pages/settings/RoleDetailPage';
import { UsersListPage } from '../pages/users/UsersListPage';
import { UserDetailPage } from '../pages/users/UserDetailPage';
import { PerfilPage } from '../pages/perfil/PerfilPage';
import { DemandasListPage } from '../pages/demandas/DemandasListPage';
import { DemandaDetailPage } from '../pages/demandas/DemandaDetailPage';
import { NovaDemandaPage } from '../pages/demandas/NovaDemandaPage';
import { AssuntosPage } from '../pages/settings/AssuntosPage';
import { AssuntoDetailPage } from '../pages/settings/AssuntoDetailPage';
import { ClientesListPage } from '../pages/cadastros/clientes/ClientesListPage';
import { ClienteLayoutPage } from '../pages/cadastros/clientes/ClienteLayoutPage';
import { ClienteVisaoGeralTab } from '../pages/cadastros/clientes/tabs/ClienteVisaoGeralTab';
import { ClienteContratosTab } from '../pages/cadastros/clientes/tabs/ClienteContratosTab';
import { ClienteFinanceiroTab } from '../pages/cadastros/clientes/tabs/ClienteFinanceiroTab';
import { ClienteLoginsTab } from '../pages/cadastros/clientes/tabs/ClienteLoginsTab';
import { ClienteOrdensServicoTab } from '../pages/cadastros/clientes/tabs/ClienteOrdensServicoTab';
import { routes } from '../shared/routes';
import { Permissions } from '../shared/permissions';
import { useAuthStore } from '../shared/stores/auth.store';
import { useSidebarStore } from '../shared/stores/sidebar.store';
import { useThemeStore } from '../shared/stores/theme.store';
import { useUsersStore } from '../shared/stores/users.store';
import { Toaster } from '../shared/ui/toast';

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const hydrateSidebar = useSidebarStore((s) => s.hydrate);

  useEffect(() => {
    hydrateTheme();
    hydrateSidebar();
  }, [hydrateSidebar, hydrateTheme]);

  useEffect(() => {
    if (!bootstrapped && !isBootstrapping) {
      void bootstrap();
    }
  }, [bootstrapped, isBootstrapping, bootstrap]);

  if (!bootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted">
        Carregando sessão…
      </div>
    );
  }

  return <>{children}</>;
}

function ProtectedShell() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const fetchUsers = useUsersStore((s) => s.fetchUsers);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      void fetchUsers(accessToken);
    }
  }, [isAuthenticated, accessToken, fetchUsers]);

  if (!isAuthenticated) {
    return (
      <Navigate
        to={routes.login}
        replace
        state={{
          from: `${location.pathname}${location.search}${location.hash}`,
        }}
      />
    );
  }
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

/** Redireciona preservando query, hash e state. */
function AliasRedirect({ to }: { to: string }) {
  const location = useLocation();
  return (
    <Navigate
      to={`${to}${location.search}${location.hash}`}
      replace
      state={location.state}
    />
  );
}

function AliasRedirectWithId({
  to,
}: {
  to: (id: string) => string;
}) {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  if (!id) {
    return <Navigate to={routes.home} replace />;
  }
  return (
    <Navigate
      to={`${to(id)}${location.search}${location.hash}`}
      replace
      state={location.state}
    />
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthBootstrap>
        <Toaster />
        <Routes>
          <Route path={routes.login} element={<LoginPage />} />
          <Route element={<ProtectedShell />}>
            <Route path={routes.home} element={<HomePage />} />

            <Route path={routes.redeProjeto} element={<RedeProjetoPage />} />
            <Route path={routes.perfil} element={<PerfilPage />} />

            {/* Demandas (HelpDesk) */}
            <Route
              path={routes.demandas}
              element={<Navigate to={routes.demandasPendentes} replace />}
            />
            <Route
              path={routes.demandasPendentes}
              element={
                <RequirePermission permission={Permissions.DemandRead}>
                  <DemandasListPage view="queue" />
                </RequirePermission>
              }
            />
            <Route
              path={routes.demandasCaixa}
              element={
                <RequirePermission permission={Permissions.DemandRead}>
                  <DemandasListPage view="mine" />
                </RequirePermission>
              }
            />
            <Route
              path={routes.demandasAssumidas}
              element={
                <RequirePermission permission={Permissions.DemandRead}>
                  <DemandasListPage view="claimed" />
                </RequirePermission>
              }
            />
            <Route
              path={routes.demandasTodas}
              element={
                <RequirePermission permission={Permissions.DemandReadAll}>
                  <DemandasListPage view="all" />
                </RequirePermission>
              }
            />
            <Route
              path={routes.demandasNova}
              element={
                <RequirePermission permission={Permissions.DemandOpen}>
                  <NovaDemandaPage />
                </RequirePermission>
              }
            />
            <Route
              path={`${routes.demandas}/:id`}
              element={
                <RequirePermission permission={Permissions.DemandRead}>
                  <DemandaDetailPage />
                </RequirePermission>
              }
            />

            {/* Assuntos e Parâmetros */}
            <Route
              path={routes.assuntos}
              element={
                <RequirePermission permission={Permissions.DemandSubjectManage}>
                  <AssuntosPage />
                </RequirePermission>
              }
            />
            <Route
              path={`${routes.assuntos}/:id`}
              element={
                <RequirePermission permission={Permissions.DemandSubjectManage}>
                  <AssuntoDetailPage />
                </RequirePermission>
              }
            />

            <Route
              path={routes.usuarios}
              element={
                <RequirePermission permission={Permissions.UsersRead}>
                  <UsersListPage />
                </RequirePermission>
              }
            />
            <Route
              path={`${routes.usuarios}/:id`}
              element={
                <RequirePermission permission={Permissions.UsersRead}>
                  <UserDetailPage />
                </RequirePermission>
              }
            />
            <Route
              path={routes.permissoes}
              element={
                <RequirePermission permission={Permissions.AccessManage}>
                  <PermissionsPage />
                </RequirePermission>
              }
            />
            <Route
              path={`${routes.permissoes}/:id`}
              element={
                <RequirePermission permission={Permissions.AccessManage}>
                  <RoleDetailPage />
                </RequirePermission>
              }
            />

            {/* Cadastros > Clientes */}
            <Route
              path={routes.cadastrosClientes}
              element={
                <RequirePermission permission={Permissions.CustomerRead}>
                  <ClientesListPage />
                </RequirePermission>
              }
            />
            <Route
              path="/cadastros/clientes/:id"
              element={
                <RequirePermission permission={Permissions.CustomerRead}>
                  <ClienteLayoutPage />
                </RequirePermission>
              }
            >
              <Route index element={<Navigate to="visao-geral" replace />} />
              <Route path="visao-geral" element={<ClienteVisaoGeralTab />} />
              <Route path="contratos" element={<ClienteContratosTab />} />
              <Route path="financeiro" element={<ClienteFinanceiroTab />} />
              <Route path="logins" element={<ClienteLoginsTab />} />
              <Route
                path="ordens-de-servico"
                element={<ClienteOrdensServicoTab />}
              />
            </Route>

            <Route
              path="/profile"
              element={<AliasRedirect to={routes.perfil} />}
            />

            {/* Aliases curtos = /clientes/... */}
            <Route
              path="/clientes"
              element={<AliasRedirect to={routes.cadastrosClientes} />}
            />
            <Route
              path="/clientes/:id"
              element={
                <AliasRedirectWithId
                  to={(id) => routes.cadastrosClienteVisaoGeral(id)}
                />
              }
            />

            {/* Aliases curtos = /configuracoes/... */}
            <Route
              path="/assuntos"
              element={<AliasRedirect to={routes.assuntos} />}
            />
            <Route
              path="/assuntos/:id"
              element={<AliasRedirectWithId to={routes.assunto} />}
            />
            <Route
              path="/usuarios"
              element={<AliasRedirect to={routes.usuarios} />}
            />
            <Route
              path="/usuarios/:id"
              element={<AliasRedirectWithId to={routes.usuario} />}
            />
            <Route
              path="/permissoes"
              element={<AliasRedirect to={routes.permissoes} />}
            />
            <Route
              path="/permissoes/:id"
              element={<AliasRedirectWithId to={routes.permissao} />}
            />

            {/* Legado em inglês */}
            <Route
              path="/settings/users"
              element={<AliasRedirect to={routes.usuarios} />}
            />
            <Route
              path="/settings/users/:id"
              element={<AliasRedirectWithId to={routes.usuario} />}
            />
            <Route
              path="/settings/permissions"
              element={<AliasRedirect to={routes.permissoes} />}
            />
            <Route
              path="/settings/permissions/:id"
              element={<AliasRedirectWithId to={routes.permissao} />}
            />
          </Route>
          <Route path="*" element={<Navigate to={routes.home} replace />} />
        </Routes>
      </AuthBootstrap>
    </BrowserRouter>
  );
}

export default App;
