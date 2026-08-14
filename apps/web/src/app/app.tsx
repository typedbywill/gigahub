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
import { routes } from '../shared/routes';
import { Permissions } from '../shared/permissions';
import { useAuthStore } from '../shared/stores/auth.store';
import { useSidebarStore } from '../shared/stores/sidebar.store';
import { useThemeStore } from '../shared/stores/theme.store';
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

            <Route
              path="/profile"
              element={<AliasRedirect to={routes.perfil} />}
            />

            {/* Aliases curtos = /configuracoes/... */}
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
