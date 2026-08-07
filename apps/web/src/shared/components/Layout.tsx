import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useRealtimeStore } from '../stores/realtime.store';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuthStore();
  const { isConnected } = useRealtimeStore();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 font-bold text-xl text-indigo-400">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-extrabold text-lg">
                G
              </div>
              <span>GigaHub</span>
            </Link>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">v0.1.0</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-slate-400 font-mono">
                Socket: {isConnected ? 'connected' : 'offline'}
              </span>
            </div>

            {user && (
              <div className="flex items-center gap-3 border-l border-slate-800 pl-6">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-slate-200">{user.name}</div>
                  <div className="text-xs text-slate-400 font-mono">{user.role}</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-indigo-400 text-sm">
                  {user.name.substring(0, 2).toUpperCase()}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>GigaHub Monorepo &copy; 2026 — Built with NestJS, Vite, React, MongoDB & MinIO</p>
      </footer>
    </div>
  );
};
