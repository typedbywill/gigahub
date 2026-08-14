import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Button } from '@heroui/react';
import {
  LuClock,
  LuContact,
  LuFileText,
  LuFolderGit2,
  LuInbox,
  LuLayers,
  LuLogOut,
  LuMap,
  LuMenu,
  LuMoon,
  LuNetwork,
  LuPlus,
  LuSettings,
  LuShield,
  LuSun,
  LuUserCheck,
  LuUsers,
} from 'react-icons/lu';
import { useMediaQuery } from '../hooks/use-media-query';
import { routes } from '../routes';
import { Permissions } from '../permissions';
import { useAuthStore } from '../stores/auth.store';
import { useSidebarStore } from '../stores/sidebar.store';
import { useThemeStore } from '../stores/theme.store';
import { useDemandCountsStore } from '../stores/demand-counts.store';
import { getAvatarColor } from '../lib/avatar-color';
import { useCommandPalette } from '../hooks/use-command-palette';
import { Sidebar, type SidebarNavItem } from './Sidebar';
import { CommandPalette } from './CommandPalette';
import { SystemPermissionsModal } from './SystemPermissionsModal';
import { useSystemPermissionsStore } from '../stores/system-permissions.store';

interface LayoutProps {
  children: React.ReactNode;
}

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);
  const isDark = theme === 'dark';
  const isMobile = useMediaQuery('(max-width: 767px)');

  const [mobileOpen, setMobileOpen] = useState(false);
  const { open: paletteOpen, close: closePalette, openPalette } = useCommandPalette();

  const triggerAuthCheck = useSystemPermissionsStore((s) => s.triggerAuthCheck);

  useEffect(() => {
    triggerAuthCheck();
  }, [triggerAuthCheck]);

  useEffect(() => {
    if (!isMobile) {
      setMobileOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!mobileOpen || !isMobile) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen, isMobile]);

  const canReadUsers = hasPermission(Permissions.UsersRead);
  const canManageAccess = hasPermission(Permissions.AccessManage);
  const canReadDemand = hasPermission(Permissions.DemandRead);
  const canReadDemandAll = hasPermission(Permissions.DemandReadAll);
  const canOpenDemand = hasPermission(Permissions.DemandOpen);
  const canManageSubjects = hasPermission(Permissions.DemandSubjectManage);
  const canReadCustomers = hasPermission(Permissions.CustomerRead);

  const accessToken = useAuthStore((s) => s.accessToken);
  const counts = useDemandCountsStore((s) => s.counts);
  const setupRealtime = useDemandCountsStore((s) => s.setupRealtime);

  useEffect(() => {
    if (accessToken && canReadDemand) {
      const cleanup = setupRealtime(accessToken);
      return cleanup;
    }
    return undefined;
  }, [accessToken, canReadDemand, setupRealtime]);

  const topItems = useMemo<SidebarNavItem[]>(() => {
    const list: SidebarNavItem[] = [];

    if (canReadDemand) {
      const demandChildren: SidebarNavItem[] = [
        {
          id: 'demandas-pendentes',
          label: 'Pendentes',
          href: routes.demandasPendentes,
          icon: <LuClock />,
          badge: counts.queue > 0 ? counts.queue : undefined,
        },
        {
          id: 'demandas-caixa',
          label: 'Caixa de Entrada',
          href: routes.demandasCaixa,
          icon: <LuInbox />,
          badge: counts.inbox > 0 ? counts.inbox : undefined,
        },
        {
          id: 'demandas-assumidas',
          label: 'Minhas Demandas',
          href: routes.demandasAssumidas,
          icon: <LuUserCheck />,
          badge: counts.claimed > 0 ? counts.claimed : undefined,
        },
      ];

      if (canReadDemandAll) {
        demandChildren.push({
          id: 'demandas-todas',
          label: 'Todas',
          href: routes.demandasTodas,
          icon: <LuLayers />,
        });
      }

      if (canOpenDemand) {
        demandChildren.push({
          id: 'demandas-nova',
          label: 'Nova Demanda',
          href: routes.demandasNova,
          icon: <LuPlus />,
        });
      }

      list.push({
        id: 'demandas',
        label: 'Demandas',
        icon: <LuFileText />,
        badge: counts.queue > 0 ? counts.queue : undefined,
        children: demandChildren,
      });
    }

    list.push({
      id: 'rede',
      label: 'Rede',
      icon: <LuNetwork />,
      children: [
        {
          id: 'rede-projeto',
          label: 'Projeto',
          href: routes.redeProjeto,
          icon: <LuMap />,
        },
      ],
    });

    if (canReadCustomers) {
      list.push({
        id: 'cadastros',
        label: 'Cadastros',
        icon: <LuContact />,
        children: [
          {
            id: 'cadastros-clientes',
            label: 'Clientes',
            href: routes.cadastrosClientes,
            icon: <LuUsers />,
          },
        ],
      });
    }

    return list;
  }, [canOpenDemand, canReadDemand, canReadDemandAll, canReadCustomers, counts]);

  const bottomItems = useMemo<SidebarNavItem[]>(() => {
    const settingsChildren: SidebarNavItem[] = [];
    if (canReadUsers) {
      settingsChildren.push({
        id: 'settings-users',
        label: 'Usuários',
        icon: <LuUsers />,
        href: routes.usuarios,
      });
    }
    if (canManageAccess) {
      settingsChildren.push({
        id: 'settings-permissions',
        label: 'Permissões',
        icon: <LuShield />,
        href: routes.permissoes,
      });
    }
    if (canManageSubjects) {
      settingsChildren.push({
        id: 'settings-assuntos',
        label: 'Assuntos (HelpDesk)',
        icon: <LuFolderGit2 />,
        href: routes.assuntos,
      });
    }

    const items: SidebarNavItem[] = [
      {
        id: 'theme',
        label: 'Alterar Tema',
        icon: isDark ? <LuSun /> : <LuMoon />,
        onPress: toggleTheme,
      },
    ];

    if (settingsChildren.length > 0) {
      items.push({
        id: 'settings',
        label: 'Configurações',
        icon: <LuSettings />,
        children: settingsChildren,
      });
    }

    return items;
  }, [canManageAccess, canManageSubjects, canReadUsers, isDark, toggleTheme]);

  const sidebarCollapsed = !isMobile && collapsed;
  const closeMobile = () => setMobileOpen(false);

  const footerAvatarColor = user ? getAvatarColor(user.id ?? user.name) : null;

  const footer = user ? (
    <div
      className={`flex items-center gap-2 ${sidebarCollapsed ? 'flex-col px-0' : 'px-1'}`}
    >
      <Link
        to={routes.perfil}
        aria-label="Abrir meu perfil"
        className={`flex min-w-0 items-center gap-2 rounded-lg transition-colors hover:bg-default ${sidebarCollapsed ? 'flex-col' : 'flex-1'}`}
        onClick={isMobile ? closeMobile : undefined}
      >
        <Avatar
          className={`shrink-0 size-10 ${
            !user.avatarUrl && footerAvatarColor
              ? `${footerAvatarColor.bg} ${footerAvatarColor.text}`
              : ''
          }`}
        >
          {user.avatarUrl ? (
            <Avatar.Image
              key={user.avatarUrl}
              alt={user.name}
              src={user.avatarUrl}
            />
          ) : null}
          <Avatar.Fallback className={footerAvatarColor?.text}>
            {userInitials(user.name)}
          </Avatar.Fallback>
        </Avatar>
        {!sidebarCollapsed ? (
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-foreground">{user.name}</div>
            <div className="truncate font-mono text-xs text-muted">{user.email}</div>
          </div>
        ) : null}
      </Link>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label="Sair"
        onPress={logout}
      >
        <LuLogOut className="size-4" />
      </Button>
    </div>
  ) : null;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-3 backdrop-blur md:hidden">
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label="Abrir menu"
          onPress={() => setMobileOpen(true)}
        >
          <LuMenu className="size-5" />
        </Button>
        <Link
          to="/"
          className="font-display flex items-center gap-2 text-base font-bold tracking-tight text-accent"
        >
          <img
            src="/brand/giga-logo.png"
            alt=""
            className="size-7 object-contain"
          />
          <span>GigaHub</span>
        </Link>
      </header>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobile}
        />
      ) : null}

      <Sidebar
        topItems={topItems}
        bottomItems={bottomItems}
        footer={footer}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleCollapsed}
        onNavigate={isMobile ? closeMobile : undefined}
        onCloseMobile={closeMobile}
        onSearchClick={openPalette}
        showMobileClose={isMobile}
        className={`z-50 ${
          isMobile
            ? `fixed inset-y-0 left-0 transition-transform duration-200 ease-out ${
                mobileOpen ? 'translate-x-0' : '-translate-x-full'
              }`
            : 'sticky top-0'
        }`}
      />

      <main className="min-h-screen flex-1 overflow-auto pt-14 md:pt-0">
        {children}
      </main>

      <CommandPalette open={paletteOpen} onClose={closePalette} />
      <SystemPermissionsModal />
    </div>
  );
};
