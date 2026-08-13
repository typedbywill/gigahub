import React from 'react';
import { Link } from 'react-router-dom';
import { Chip } from '@heroui/react';
import { LuLogOut } from 'react-icons/lu';
import { useAuthStore } from '../stores/auth.store';
import { useRealtimeStore } from '../stores/realtime.store';
import { ThemeToggle } from '../ui/ThemeToggle';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { isConnected } = useRealtimeStore();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="font-display flex items-center gap-2 text-xl font-bold tracking-tight text-accent"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-lg font-extrabold text-accent-foreground">
                G
              </div>
              <span>GigaHub</span>
            </Link>
            <Chip size="sm" variant="soft">
              v0.1.0
            </Chip>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`size-2.5 rounded-full ${isConnected ? 'animate-pulse bg-success' : 'bg-warning'}`}
              />
              <span className="hidden font-mono text-muted sm:inline">
                Socket: {isConnected ? 'connected' : 'offline'}
              </span>
            </div>

            <ThemeToggle />

            {user && (
              <div className="flex items-center gap-3 border-l border-border pl-4 sm:pl-6">
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-medium">{user.name}</div>
                  <div className="font-mono text-xs text-muted">{user.email}</div>
                </div>
                <div className="flex size-8 items-center justify-center rounded-full border border-border bg-default text-sm font-bold text-accent">
                  {user.name.substring(0, 2).toUpperCase()}
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-md p-1.5 text-muted transition hover:bg-default hover:text-foreground"
                  aria-label="Sair"
                  title="Sair (local)"
                >
                  <LuLogOut className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        <p>GigaHub Monorepo &copy; 2026 — NestJS, Vite, React, MongoDB & MinIO</p>
      </footer>
    </div>
  );
};
