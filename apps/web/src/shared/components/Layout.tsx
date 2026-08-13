import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Button } from '@heroui/react';
import {
  LuLogOut,
  LuMenu,
  LuMoon,
  LuSettings,
  LuShield,
  LuSun,
  LuUsers,
} from 'react-icons/lu';
import { useMediaQuery } from '../hooks/use-media-query';
import { useAuthStore } from '../stores/auth.store';
import { useThemeStore } from '../stores/theme.store';
import { Sidebar, type SidebarNavItem } from './Sidebar';

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
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';
  const isMobile = useMediaQuery('(max-width: 767px)');

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const bottomItems = useMemo<SidebarNavItem[]>(
    () => [
      {
        id: 'theme',
        label: 'Alterar Tema',
        icon: isDark ? <LuSun /> : <LuMoon />,
        onPress: toggleTheme,
      },
      {
        id: 'settings',
        label: 'Configurações',
        icon: <LuSettings />,
        children: [
          {
            id: 'settings-users',
            label: 'Usuários',
            icon: <LuUsers />,
            href: '/usuarios',
          },
          {
            id: 'settings-permissions',
            label: 'Permissões',
            icon: <LuShield />,
            href: '/settings/permissions',
          },
        ],
      },
    ],
    [isDark, toggleTheme],
  );

  const sidebarCollapsed = !isMobile && collapsed;

  const footer = user ? (
    <div
      className={`flex items-center gap-2 ${sidebarCollapsed ? 'flex-col px-0' : 'px-1'}`}
    >
      <Avatar size="sm" color="accent" className="shrink-0">
        <Avatar.Fallback>{userInitials(user.name)}</Avatar.Fallback>
      </Avatar>
      {!sidebarCollapsed ? (
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">{user.name}</div>
          <div className="truncate font-mono text-xs text-muted">{user.email}</div>
        </div>
      ) : null}
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

  const closeMobile = () => setMobileOpen(false);

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
        topItems={[]}
        bottomItems={bottomItems}
        footer={footer}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        onNavigate={isMobile ? closeMobile : undefined}
        onCloseMobile={closeMobile}
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
    </div>
  );
};
