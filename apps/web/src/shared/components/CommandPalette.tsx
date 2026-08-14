import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LuBox,
  LuClock,
  LuFileText,
  LuFolderGit2,
  LuInbox,
  LuLayers,
  LuLoaderCircle,
  LuLogOut,
  LuMap,
  LuMoon,
  LuNetwork,
  LuPlus,
  LuSearch,
  LuShield,
  LuSun,
  LuUser,
  LuUserCheck,
  LuUsers,
} from 'react-icons/lu';
import type { GlobalSearchGroupDto, GlobalSearchHitDto } from '@gigahub/shared/contracts';
import { useAuthStore } from '../stores/auth.store';
import { useThemeStore } from '../stores/theme.store';
import { useSystemPermissionsStore } from '../stores/system-permissions.store';
import { Permissions } from '../permissions';
import { routes } from '../routes';
import { globalSearchRequest } from '../api/search.api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type CommandItem = {
  id: string;
  label: string;
  subtitle?: string;
  section: string;
  icon?: React.ReactNode;
  keywords?: string[];
  onSelect: () => void;
};

export type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function matchesQuery(item: CommandItem, query: string): boolean {
  if (!query) return true;
  const q = normalize(query);
  if (normalize(item.label).includes(q)) return true;
  if (normalize(item.section).includes(q)) return true;
  if (item.subtitle && normalize(item.subtitle).includes(q)) return true;
  if (item.keywords?.some((kw) => normalize(kw).includes(q))) return true;
  return false;
}

function getCategoryIcon(category: string): React.ReactNode {
  switch (category) {
    case 'customer':
      return <LuUsers className="size-4" />;
    case 'fat':
      return <LuBox className="size-4" />;
    case 'cable':
      return <LuNetwork className="size-4" />;
    case 'demand':
      return <LuFileText className="size-4" />;
    case 'user':
      return <LuUser className="size-4" />;
    default:
      return <LuSearch className="size-4" />;
  }
}

/* ------------------------------------------------------------------ */
/*  useStaticCommands — builds the local navigation & action list     */
/* ------------------------------------------------------------------ */

function useStaticCommands(onClose: () => void): CommandItem[] {
  const navigate = useNavigate();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const go = useCallback(
    (to: string) => {
      navigate(to);
      onClose();
    },
    [navigate, onClose],
  );

  return useMemo(() => {
    const items: CommandItem[] = [];

    /* — Navegação — */

    if (hasPermission(Permissions.DemandRead)) {
      items.push(
        {
          id: 'nav-demandas-pendentes',
          label: 'Demandas Pendentes',
          section: 'Navegação',
          icon: <LuClock className="size-4" />,
          keywords: ['demanda', 'pendente', 'fila'],
          onSelect: () => go(routes.demandasPendentes),
        },
        {
          id: 'nav-demandas-caixa',
          label: 'Caixa de Entrada',
          section: 'Navegação',
          icon: <LuInbox className="size-4" />,
          keywords: ['inbox', 'caixa', 'demanda'],
          onSelect: () => go(routes.demandasCaixa),
        },
        {
          id: 'nav-demandas-assumidas',
          label: 'Minhas Demandas',
          section: 'Navegação',
          icon: <LuUserCheck className="size-4" />,
          keywords: ['assumida', 'minha', 'demanda'],
          onSelect: () => go(routes.demandasAssumidas),
        },
      );

      if (hasPermission(Permissions.DemandReadAll)) {
        items.push({
          id: 'nav-demandas-todas',
          label: 'Todas as Demandas',
          section: 'Navegação',
          icon: <LuLayers className="size-4" />,
          keywords: ['demanda', 'todas', 'lista'],
          onSelect: () => go(routes.demandasTodas),
        });
      }

      if (hasPermission(Permissions.DemandOpen)) {
        items.push({
          id: 'nav-demandas-nova',
          label: 'Nova Demanda',
          section: 'Navegação',
          icon: <LuPlus className="size-4" />,
          keywords: ['criar', 'abrir', 'nova', 'demanda'],
          onSelect: () => go(routes.demandasNova),
        });
      }
    }

    items.push({
      id: 'nav-rede-projeto',
      label: 'Projeto de Rede',
      section: 'Navegação',
      icon: <LuMap className="size-4" />,
      keywords: ['mapa', 'rede', 'projeto', 'network', 'ftth', 'cabo', 'cto', 'fat'],
      onSelect: () => go(routes.redeProjeto),
    });

    if (hasPermission(Permissions.CustomerRead)) {
      items.push({
        id: 'nav-cadastros-clientes',
        label: 'Clientes',
        section: 'Navegação',
        icon: <LuUsers className="size-4" />,
        keywords: ['cadastro', 'cliente', 'assinante', 'contrato', 'financeiro'],
        onSelect: () => go(routes.cadastrosClientes),
      });
    }

    /* — Configurações — */

    if (hasPermission(Permissions.UsersRead)) {
      items.push({
        id: 'nav-settings-users',
        label: 'Usuários',
        section: 'Configurações',
        icon: <LuUsers className="size-4" />,
        keywords: ['usuario', 'colaborador', 'funcionario', 'configuracao', 'settings'],
        onSelect: () => go(routes.usuarios),
      });
    }

    if (hasPermission(Permissions.AccessManage)) {
      items.push({
        id: 'nav-settings-permissions',
        label: 'Permissões',
        section: 'Configurações',
        icon: <LuShield className="size-4" />,
        keywords: ['permissao', 'role', 'cargo', 'acesso'],
        onSelect: () => go(routes.permissoes),
      });
    }

    if (hasPermission(Permissions.DemandSubjectManage)) {
      items.push({
        id: 'nav-settings-assuntos',
        label: 'Assuntos (HelpDesk)',
        section: 'Configurações',
        icon: <LuFolderGit2 className="size-4" />,
        keywords: ['assunto', 'helpdesk', 'subject'],
        onSelect: () => go(routes.assuntos),
      });
    }

    items.push({
      id: 'nav-perfil',
      label: 'Meu Perfil',
      section: 'Configurações',
      icon: <LuUser className="size-4" />,
      keywords: ['perfil', 'conta', 'profile', 'senha'],
      onSelect: () => go(routes.perfil),
    });

    /* — Ações — */

    items.push({
      id: 'action-toggle-theme',
      label: theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro',
      section: 'Ações',
      icon: theme === 'dark' ? <LuSun className="size-4" /> : <LuMoon className="size-4" />,
      keywords: ['tema', 'dark', 'light', 'claro', 'escuro', 'theme'],
      onSelect: () => {
        toggleTheme();
        onClose();
      },
    });

    items.push({
      id: 'action-permissions',
      label: 'Permissões do Navegador e Dispositivo',
      subtitle: 'Localização, Notificações, Áudio e Armazenamento',
      section: 'Ações',
      icon: <LuShield className="size-4" />,
      keywords: ['permissao', 'navegador', 'notificacao', 'localizacao', 'gps', 'som', 'audio'],
      onSelect: () => {
        onClose();
        useSystemPermissionsStore.getState().openModal();
      },
    });

    items.push({
      id: 'action-logout',
      label: 'Sair',
      section: 'Ações',
      icon: <LuLogOut className="size-4" />,
      keywords: ['sair', 'logout', 'deslogar'],
      onSelect: () => {
        logout();
        onClose();
      },
    });

    return items;
  }, [go, hasPermission, logout, onClose, theme, toggleTheme]);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [serverGroups, setServerGroups] = useState<GlobalSearchGroupDto[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const staticCommands = useStaticCommands(onClose);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setServerGroups([]);
      setIsLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Debounced API search when query has >= 2 characters
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || !accessToken) {
      setServerGroups([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const res = await globalSearchRequest(
          accessToken,
          { q: trimmed, limit: 5 },
          controller.signal,
        );
        setServerGroups(res.groups);
      } catch (err: unknown) {
        if ((err as Error)?.name !== 'AbortError') {
          setServerGroups([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, accessToken]);

  // Filter static commands locally
  const filteredStatic = useMemo(
    () => staticCommands.filter((c) => matchesQuery(c, query)),
    [staticCommands, query],
  );

  // Combine server search groups + matching static navigation commands
  const combinedGroups = useMemo(() => {
    const groups: { section: string; items: CommandItem[] }[] = [];

    // 1. Add server groups first
    for (const group of serverGroups) {
      if (group.items.length === 0) continue;
      groups.push({
        section: group.label,
        items: group.items.map((item: GlobalSearchHitDto) => ({
          id: `${item.category}-${item.id}`,
          label: item.title,
          subtitle: item.subtitle,
          section: group.label,
          icon: getCategoryIcon(item.category),
          onSelect: () => {
            navigate(item.href);
            onClose();
          },
        })),
      });
    }

    // 2. Add local static commands
    if (filteredStatic.length > 0) {
      const staticMap = new Map<string, CommandItem[]>();
      for (const item of filteredStatic) {
        const list = staticMap.get(item.section) ?? [];
        list.push(item);
        staticMap.set(item.section, list);
      }

      for (const [section, items] of staticMap.entries()) {
        groups.push({ section, items });
      }
    }

    return groups;
  }, [serverGroups, filteredStatic, navigate, onClose]);

  // Flattened items list for index-based selection
  const flatItems = useMemo(
    () => combinedGroups.flatMap((g) => g.items),
    [combinedGroups],
  );

  // Clamp active index
  useEffect(() => {
    if (activeIndex >= flatItems.length) {
      setActiveIndex(Math.max(0, flatItems.length - 1));
    }
  }, [flatItems.length, activeIndex]);

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const activeEl = list.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const selectItem = useCallback(
    (index: number) => {
      const item = flatItems[index];
      if (item) {
        item.onSelect();
      }
    },
    [flatItems],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % Math.max(flatItems.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + flatItems.length) % Math.max(flatItems.length, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        selectItem(activeIndex);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [activeIndex, flatItems.length, onClose, selectItem],
  );

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[min(14vh,100px)]"
      onClick={onClose}
      role="presentation"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />

      {/* Palette container */}
      <div
        className="command-palette relative z-10 flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Pesquisa rápida e abrangente"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          {isLoading ? (
            <LuLoaderCircle className="size-5 shrink-0 animate-spin text-accent" aria-hidden />
          ) : (
            <LuSearch className="size-5 shrink-0 text-muted" aria-hidden />
          )}
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            placeholder="Pesquisar clientes, contratos, demandas, CTOs, cabos, usuários…"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            aria-label="Pesquisar"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls="command-palette-list"
          />
          <kbd className="hidden rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          id="command-palette-list"
          role="listbox"
          className="max-h-[min(55vh,420px)] overflow-y-auto overscroll-contain p-2"
        >
          {flatItems.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-muted">
              {isLoading ? 'Buscando em todo o sistema…' : 'Nenhum resultado encontrado.'}
            </div>
          ) : (
            combinedGroups.map((group) => (
              <div key={group.section} role="group" aria-label={group.section}>
                <div className="px-3 pb-1.5 pt-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  {group.section}
                </div>
                {group.items.map((item) => {
                  flatIndex++;
                  const isActive = flatIndex === activeIndex;
                  const idx = flatIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      data-active={isActive}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                        isActive
                          ? 'bg-accent/10 text-foreground'
                          : 'text-foreground/90 hover:bg-default'
                      }`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => selectItem(idx)}
                    >
                      {item.icon ? (
                        <span
                          className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                            isActive
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-default text-muted'
                          } [&_svg]:size-4`}
                          aria-hidden
                        >
                          {item.icon}
                        </span>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-foreground">{item.label}</div>
                        {item.subtitle ? (
                          <div className="truncate text-xs text-muted">{item.subtitle}</div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[11px] text-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1 py-px font-mono text-[10px]">↑</kbd>
              <kbd className="rounded border border-border bg-background px-1 py-px font-mono text-[10px]">↓</kbd>
              <span>navegar</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1 py-px font-mono text-[10px]">↵</kbd>
              <span>abrir</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1 py-px font-mono text-[10px]">esc</kbd>
              <span>fechar</span>
            </span>
          </div>
          <span className="hidden text-[10px] text-muted/70 sm:inline-block">
            GigaHub Global Search
          </span>
        </div>
      </div>
    </div>
  );
};
