import React, {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Checkbox,
  Dropdown,
  Label,
  SearchField,
  Spinner,
  Switch,
} from '@heroui/react';
import {
  LuArrowLeft,
  LuCheck,
  LuCheckCheck,
  LuClipboardList,
  LuCopy,
  LuInbox,
  LuKeyRound,
  LuLayers,
  LuMapPin,
  LuRotateCcw,
  LuSearch,
  LuShield,
  LuSlidersHorizontal,
  LuSparkles,
  LuUserCheck,
  LuUsers,
  LuWallet,
  LuX,
} from 'react-icons/lu';
import type {
  PermissionDefinitionDto,
  RoleListItemDto,
} from '@gigahub/shared/contracts';
import { useAuthStore } from '../../shared/stores/auth.store';
import { ApiClientError } from '../../shared/api/auth.api';
import { listPermissionCatalogRequest } from '../../shared/api/permissions.api';
import {
  listRolesRequest,
  replaceRolePermissionsRequest,
} from '../../shared/api/roles.api';
import { routes } from '../../shared/routes';
import { toast } from '../../shared/ui/toast';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { useFocusSearchOnType } from '../../shared/hooks/use-focus-search-on-type';

interface ModuleColorClasses {
  bg: string;
  text: string;
  border: string;
  icon: string;
}

interface ModuleMeta {
  label: string;
  icon: React.ReactNode;
  colorClasses: ModuleColorClasses;
}

const MODULE_CONFIG: Record<string, ModuleMeta> = {
  'work-order': {
    label: 'Ordens de serviço',
    icon: <LuClipboardList className="size-4" />,
    colorClasses: {
      bg: 'bg-blue-500/10 dark:bg-blue-500/15',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-500/20 dark:border-blue-500/30',
      icon: 'text-blue-600 dark:text-blue-400',
    },
  },
  demand: {
    label: 'Demandas (HelpDesk)',
    icon: <LuInbox className="size-4" />,
    colorClasses: {
      bg: 'bg-violet-500/10 dark:bg-violet-500/15',
      text: 'text-violet-700 dark:text-violet-300',
      border: 'border-violet-500/20 dark:border-violet-500/30',
      icon: 'text-violet-600 dark:text-violet-400',
    },
  },
  customer: {
    label: 'Clientes',
    icon: <LuUsers className="size-4" />,
    colorClasses: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/15',
      text: 'text-amber-800 dark:text-amber-200',
      border: 'border-amber-500/20 dark:border-amber-500/30',
      icon: 'text-amber-600 dark:text-amber-400',
    },
  },
  users: {
    label: 'Usuários',
    icon: <LuUserCheck className="size-4" />,
    colorClasses: {
      bg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
      text: 'text-cyan-800 dark:text-cyan-200',
      border: 'border-cyan-500/20 dark:border-cyan-500/30',
      icon: 'text-cyan-600 dark:text-cyan-400',
    },
  },
  access: {
    label: 'Acesso e Segurança',
    icon: <LuShield className="size-4" />,
    colorClasses: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/15',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-500/20 dark:border-rose-500/30',
      icon: 'text-rose-600 dark:text-rose-400',
    },
  },
  finance: {
    label: 'Financeiro',
    icon: <LuWallet className="size-4" />,
    colorClasses: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      text: 'text-emerald-800 dark:text-emerald-200',
      border: 'border-emerald-500/20 dark:border-emerald-500/30',
      icon: 'text-emerald-600 dark:text-emerald-400',
    },
  },
  telemetry: {
    label: 'Telemetria',
    icon: <LuMapPin className="size-4" />,
    colorClasses: {
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
      text: 'text-indigo-700 dark:text-indigo-300',
      border: 'border-indigo-500/20 dark:border-indigo-500/30',
      icon: 'text-indigo-600 dark:text-indigo-400',
    },
  },
  gamification: {
    label: 'Gamificação',
    icon: <LuSparkles className="size-4" />,
    colorClasses: {
      bg: 'bg-fuchsia-500/10 dark:bg-fuchsia-500/15',
      text: 'text-fuchsia-700 dark:text-fuchsia-300',
      border: 'border-fuchsia-500/20 dark:border-fuchsia-500/30',
      icon: 'text-fuchsia-600 dark:text-fuchsia-400',
    },
  },
};

function getModuleMeta(groupId: string): ModuleMeta {
  const existing = MODULE_CONFIG[groupId];
  if (existing) {
    return existing;
  }
  const formattedLabel =
    groupId.charAt(0).toUpperCase() + groupId.slice(1).replace(/[-_]/g, ' ');
  return {
    label: formattedLabel,
    icon: <LuLayers className="size-4" />,
    colorClasses: {
      bg: 'bg-slate-500/10 dark:bg-slate-500/15',
      text: 'text-slate-800 dark:text-slate-200',
      border: 'border-slate-500/20 dark:border-slate-500/30',
      icon: 'text-slate-600 dark:text-slate-400',
    },
  };
}

type DetailLocationState = {
  from?: string;
};

type StatusFilterOption = 'all' | 'active' | 'inactive';

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const set = new Set(b);
  return a.every((id) => set.has(id));
}

export const RoleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const backTo =
    (location.state as DetailLocationState | null)?.from ?? routes.permissoes;

  const [role, setRole] = useState<RoleListItemDto | null>(null);
  const [catalog, setCatalog] = useState<PermissionDefinitionDto[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useFocusSearchOnType(searchInputRef, {
    enabled: true,
    value: search,
    onChange: (value) => {
      startTransition(() => setSearch(value));
    },
  });

  const load = useCallback(async () => {
    if (!accessToken || !id) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [roles, permissions] = await Promise.all([
        listRolesRequest(accessToken),
        listPermissionCatalogRequest(accessToken),
      ]);
      const found = roles.items.find((item) => item.id === id) ?? null;
      setRole(found);
      setCatalog(permissions.items);
      const catalogSet = new Set(permissions.items.map((p) => p.id));
      setSelectedIds(
        found
          ? found.permissionIds.filter((pId) => catalogSet.has(pId))
          : [],
      );
    } catch (err) {
      setRole(null);
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível carregar a função.',
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const initialSet = useMemo(
    () => new Set(role ? role.permissionIds : []),
    [role],
  );

  const dirty = useMemo(() => {
    if (!role) {
      return false;
    }
    return !sameIds(selectedIds, role.permissionIds);
  }, [role, selectedIds]);

  const addedCount = useMemo(() => {
    return selectedIds.filter((permId) => !initialSet.has(permId)).length;
  }, [initialSet, selectedIds]);

  const removedCount = useMemo(() => {
    if (!role) {
      return 0;
    }
    return role.permissionIds.filter((permId) => !selectedSet.has(permId)).length;
  }, [role, selectedSet]);

  const moduleGroups = useMemo(() => {
    const map = new Map<string, PermissionDefinitionDto[]>();
    for (const entry of catalog) {
      const list = map.get(entry.group) ?? [];
      list.push(entry);
      map.set(entry.group, list);
    }
    return Array.from(map.entries()).map(([groupId, permissions]) => {
      const activeCount = permissions.filter((p) => selectedSet.has(p.id)).length;
      return {
        id: groupId,
        meta: getModuleMeta(groupId),
        permissions,
        total: permissions.length,
        active: activeCount,
      };
    });
  }, [catalog, selectedSet]);

  const filteredPermissions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((permission) => {
      if (selectedModule !== 'all' && permission.group !== selectedModule) {
        return false;
      }
      const isActive = selectedSet.has(permission.id);
      if (statusFilter === 'active' && !isActive) {
        return false;
      }
      if (statusFilter === 'inactive' && isActive) {
        return false;
      }
      if (q) {
        const meta = getModuleMeta(permission.group);
        const matchTitle = permission.title.toLowerCase().includes(q);
        const matchId = permission.id.toLowerCase().includes(q);
        const matchDesc =
          permission.description?.toLowerCase().includes(q) ?? false;
        const matchGroup = meta.label.toLowerCase().includes(q);
        if (!matchTitle && !matchId && !matchDesc && !matchGroup) {
          return false;
        }
      }
      return true;
    });
  }, [catalog, search, selectedModule, selectedSet, statusFilter]);

  const allCatalogIds = useMemo(
    () => catalog.map((entry) => entry.id),
    [catalog],
  );

  const filteredIds = useMemo(
    () => filteredPermissions.map((p) => p.id),
    [filteredPermissions],
  );

  const allFilteredSelected =
    filteredIds.length > 0 &&
    filteredIds.every((permId) => selectedSet.has(permId));

  const someFilteredSelected =
    filteredIds.length > 0 &&
    !allFilteredSelected &&
    filteredIds.some((permId) => selectedSet.has(permId));

  const togglePermission = useCallback((permissionId: string) => {
    setSelectedIds((current) => {
      if (current.includes(permissionId)) {
        return current.filter((idVal) => idVal !== permissionId);
      }
      return [...current, permissionId];
    });
  }, []);

  const toggleFilteredAll = useCallback(
    (on: boolean) => {
      setSelectedIds((current) => {
        const next = new Set(current);
        for (const permId of filteredIds) {
          if (on) {
            next.add(permId);
          } else {
            next.delete(permId);
          }
        }
        return Array.from(next);
      });
    },
    [filteredIds],
  );

  const toggleGroupAll = useCallback(
    (groupId: string, on: boolean) => {
      const groupPermissions = catalog.filter((p) => p.group === groupId);
      const groupIds = groupPermissions.map((p) => p.id);
      setSelectedIds((current) => {
        const next = new Set(current);
        for (const permId of groupIds) {
          if (on) {
            next.add(permId);
          } else {
            next.delete(permId);
          }
        }
        return Array.from(next);
      });
    },
    [catalog],
  );

  const invertFiltered = useCallback(() => {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const permId of filteredIds) {
        if (next.has(permId)) {
          next.delete(permId);
        } else {
          next.add(permId);
        }
      }
      return Array.from(next);
    });
  }, [filteredIds]);

  const selectAllCatalog = useCallback(() => {
    setSelectedIds([...allCatalogIds]);
  }, [allCatalogIds]);

  const deselectAllCatalog = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const discard = useCallback(() => {
    if (!role) {
      return;
    }
    setSelectedIds([...role.permissionIds]);
  }, [role]);

  const copyIdToClipboard = useCallback((permId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(permId);
    setCopiedId(permId);
    setTimeout(() => {
      setCopiedId((curr) => (curr === permId ? null : curr));
    }, 2000);
  }, []);

  const save = async () => {
    if (!accessToken || !role) {
      return;
    }
    setSaving(true);
    try {
      const result = await replaceRolePermissionsRequest(accessToken, role.id, {
        permissionIds: selectedIds,
      });
      setRole(result.role);
      setSelectedIds([...result.role.permissionIds]);
      toast.success('Permissões da função salvas com sucesso.');
    } catch (err) {
      toast.error(
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível salvar as permissões.',
      );
    } finally {
      setSaving(false);
    }
  };

  const groupedViewData = useMemo(() => {
    if (selectedModule !== 'all') {
      return null;
    }
    if (search.trim()) {
      return null;
    }
    const map = new Map<string, PermissionDefinitionDto[]>();
    for (const perm of filteredPermissions) {
      const list = map.get(perm.group) ?? [];
      list.push(perm);
      map.set(perm.group, list);
    }
    return Array.from(map.entries()).map(([groupId, items]) => {
      const meta = getModuleMeta(groupId);
      const groupActiveCount = items.filter((p) => selectedSet.has(p.id)).length;
      const allGroupOn = items.length > 0 && groupActiveCount === items.length;
      const someGroupOn = groupActiveCount > 0 && !allGroupOn;
      return {
        groupId,
        meta,
        items,
        activeCount: groupActiveCount,
        allGroupOn,
        someGroupOn,
      };
    });
  }, [filteredPermissions, search, selectedModule, selectedSet]);

  if (loading) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 p-8">
        <Spinner size="lg" />
        <span className="text-sm font-medium text-muted">
          Carregando permissões da função…
        </span>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <div
          className="flex size-12 items-center justify-center rounded-2xl bg-danger/10 text-danger"
          aria-hidden
        >
          <LuShield className="size-6" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-xl font-bold text-foreground">
            Função não encontrada
          </h1>
          <p className="text-sm text-muted" role="alert">
            {error ?? 'A função solicitada não pôde ser encontrada.'}
          </p>
        </div>
        <Button variant="secondary" onPress={() => navigate(backTo)}>
          <LuArrowLeft className="size-4" />
          Voltar para a lista
        </Button>
      </div>
    );
  }

  const activeCountTotal = selectedIds.length;
  const totalPermissions = catalog.length;
  const coveragePercent =
    totalPermissions > 0
      ? Math.round((activeCountTotal / totalPermissions) * 100)
      : 0;

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem)] w-full flex-col overflow-hidden bg-background md:h-dvh">
      {/* Header Superior */}
      <header className="shrink-0 border-b border-border bg-surface/80 px-4 py-3.5 backdrop-blur-md md:px-6 lg:px-8">
        <div className="flex flex-col gap-3">
          {/* Top Bar: Navegação, Título e Ações */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                to={backTo}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-muted transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
                aria-label="Voltar para lista de funções"
              >
                <LuArrowLeft className="size-4" />
              </Link>
              <div className="flex min-w-0 flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display truncate text-lg font-bold text-foreground md:text-xl">
                    {role.name}
                  </h1>
                  <span className="rounded-md border border-border/80 bg-muted/40 px-2 py-0.5 font-mono text-xs text-muted">
                    {role.slug}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/20 px-2.5 py-1 text-xs text-foreground/80">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    <strong className="font-bold text-foreground">
                      {activeCountTotal}
                    </strong>{' '}
                    de <span className="font-semibold text-foreground/90">{totalPermissions}</span> permissões ativas
                    <span className="rounded-full bg-muted/40 px-1.5 py-0.2 font-mono text-[11px] font-bold text-foreground">
                      {coveragePercent}%
                    </span>
                  </span>
                  {dirty ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                      {addedCount > 0 && `+${addedCount} ativada${addedCount > 1 ? 's' : ''}`}
                      {addedCount > 0 && removedCount > 0 && ', '}
                      {removedCount > 0 && `-${removedCount} desativada${removedCount > 1 ? 's' : ''}`}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                size="sm"
                variant="secondary"
                isDisabled={!dirty || saving}
                onPress={discard}
                className="gap-1.5"
              >
                <LuRotateCcw className="size-4" />
                Descartar
              </Button>
              <Button
                size="sm"
                isDisabled={!dirty}
                isPending={saving}
                onPress={() => {
                  void save();
                }}
                className="gap-1.5 bg-emerald-600 font-medium text-white shadow-xs hover:bg-emerald-700 active:bg-emerald-800 focus-visible:outline-emerald-600 disabled:pointer-events-none disabled:opacity-50"
              >
                <LuCheck className="size-4" />
                Salvar alterações
              </Button>
            </div>
          </div>

          {/* Abas de Navegação por Módulo */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-1 text-sm no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedModule('all')}
              className={`group flex shrink-0 items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                selectedModule === 'all'
                  ? 'border-foreground bg-foreground text-background shadow-xs'
                  : 'border-border/60 bg-surface text-foreground/80 hover:border-border hover:bg-muted/40 hover:text-foreground'
              }`}
            >
              <LuLayers
                className={`size-3.5 transition-colors ${
                  selectedModule === 'all'
                    ? 'text-background'
                    : 'text-foreground/70 group-hover:text-foreground'
                }`}
              />
              <span>Todos os módulos</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold transition-all ${
                  selectedModule === 'all'
                    ? 'bg-background/20 text-background'
                    : 'bg-muted/25 text-foreground/90 group-hover:bg-muted/40 group-hover:text-foreground'
                }`}
              >
                {catalog.length}
              </span>
            </button>

            {moduleGroups.map((group) => {
              const isSelected = selectedModule === group.id;
              const isComplete = group.active === group.total && group.total > 0;
              const hasSome = group.active > 0 && !isComplete;

              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedModule(group.id)}
                  className={`group flex shrink-0 items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                    isSelected
                      ? 'border-foreground bg-foreground text-background shadow-xs'
                      : 'border-border/60 bg-surface text-foreground/80 hover:border-border hover:bg-muted/40 hover:text-foreground'
                  }`}
                >
                  <span
                    className={
                      isSelected
                        ? 'text-background'
                        : `${group.meta.colorClasses.icon} transition-colors`
                    }
                  >
                    {group.meta.icon}
                  </span>
                  <span>{group.meta.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold transition-all ${
                      isSelected
                        ? 'bg-background/20 text-background'
                        : isComplete
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 group-hover:bg-emerald-500/20'
                          : hasSome
                            ? 'bg-amber-500/10 text-amber-800 dark:text-amber-200 group-hover:bg-amber-500/20'
                            : 'bg-muted/25 text-foreground/80 group-hover:bg-muted/40 group-hover:text-foreground'
                    }`}
                  >
                    {group.active}/{group.total}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Barra de Filtros & Ações da Tabela */}
      <div className="shrink-0 border-b border-border/50 bg-surface/50 px-4 py-2.5 md:px-6 lg:px-8">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <SearchField
              value={search}
              onChange={(value) => {
                startTransition(() => setSearch(value));
              }}
              className="w-full max-w-md"
              aria-label="Buscar permissões"
              variant="secondary"
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input
                  ref={searchInputRef}
                  placeholder="Buscar por título, código ou descrição… (/ para focar)"
                />
                {search ? <SearchField.ClearButton /> : null}
              </SearchField.Group>
            </SearchField>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtros de Status (Todas / Ativas / Inativas) */}
            <div
              className="inline-flex items-center gap-1 rounded-xl border border-border/80 bg-surface p-1 text-xs shadow-2xs"
              role="group"
              aria-label="Filtrar por status"
            >
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`group flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-foreground text-background shadow-2xs'
                    : 'text-foreground/80 hover:bg-muted/40 hover:text-foreground'
                }`}
              >
                <span>Todas</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-background/20 text-background'
                      : 'bg-muted/25 text-foreground/90 group-hover:bg-muted/40 group-hover:text-foreground'
                  }`}
                >
                  {catalog.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`group flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  statusFilter === 'active'
                    ? 'bg-emerald-600 text-white shadow-2xs dark:bg-emerald-500'
                    : 'text-foreground/80 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300'
                }`}
              >
                <span>Ativas</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold transition-colors ${
                    statusFilter === 'active'
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 group-hover:bg-emerald-500/25'
                  }`}
                >
                  {activeCountTotal}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('inactive')}
                className={`group flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  statusFilter === 'inactive'
                    ? 'bg-foreground text-background shadow-2xs'
                    : 'text-foreground/80 hover:bg-muted/40 hover:text-foreground'
                }`}
              >
                <span>Inativas</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold transition-colors ${
                    statusFilter === 'inactive'
                      ? 'bg-background/20 text-background'
                      : 'bg-muted/25 text-foreground/90 group-hover:bg-muted/40 group-hover:text-foreground'
                  }`}
                >
                  {totalPermissions - activeCountTotal}
                </span>
              </button>
            </div>

            {/* Menu de Ações em Lote */}
            <Dropdown>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-xs"
                aria-label="Ações em massa"
              >
                <LuSlidersHorizontal className="size-3.5" />
                <span className="hidden sm:inline">Ações</span>
              </Button>
              <Dropdown.Popover placement="bottom end">
                <Dropdown.Menu
                  onAction={(key) => {
                    if (key === 'select-filtered') {
                      toggleFilteredAll(true);
                    } else if (key === 'deselect-filtered') {
                      toggleFilteredAll(false);
                    } else if (key === 'invert-filtered') {
                      invertFiltered();
                    } else if (key === 'select-all') {
                      selectAllCatalog();
                    } else if (key === 'deselect-all') {
                      deselectAllCatalog();
                    }
                  }}
                >
                  <Dropdown.Item id="select-filtered" textValue="Marcar visíveis">
                    <LuCheckCheck className="size-4 text-emerald-500" />
                    <Label>Marcar todas as visíveis ({filteredPermissions.length})</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="deselect-filtered" textValue="Desmarcar visíveis">
                    <LuX className="size-4 text-muted" />
                    <Label>Desmarcar todas as visíveis</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="invert-filtered" textValue="Inverter seleção">
                    <LuRotateCcw className="size-4 text-muted" />
                    <Label>Inverter seleção visível</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="select-all" textValue="Marcar catálogo inteiro">
                    <LuKeyRound className="size-4 text-violet-500" />
                    <Label>Ativar todas do catálogo ({totalPermissions})</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="deselect-all" textValue="Desmarcar tudo" variant="danger">
                    <LuX className="size-4 text-danger" />
                    <Label>Desativar tudo</Label>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal: Tabela de Permissões Elaborada */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 lg:px-8">
        {filteredPermissions.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface/40 p-8 text-center">
            <div
              className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted"
              aria-hidden
            >
              <LuSearch className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-foreground">
                Nenhuma permissão encontrada
              </p>
              <p className="text-xs text-muted">
                Tente ajustar os termos de busca ou filtros aplicados.
              </p>
            </div>
            {(search || statusFilter !== 'all' || selectedModule !== 'all') && (
              <Button
                size="sm"
                variant="secondary"
                onPress={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setSelectedModule('all');
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <div className="overflow-x-auto">
              <table
                className="w-full min-w-180 border-collapse text-left"
                role="grid"
                aria-label="Tabela de permissões da função"
              >
                <thead>
                  <tr className="border-b border-border/70 bg-muted/10 dark:bg-muted/10 text-[11px] font-bold uppercase tracking-wider text-foreground/70">
                    <th scope="col" className="w-12 px-4 py-3 text-center">
                      <Checkbox
                        aria-label="Marcar ou desmarcar todas as permissões visíveis"
                        isSelected={allFilteredSelected}
                        isIndeterminate={someFilteredSelected}
                        onChange={(checked) => toggleFilteredAll(checked)}
                      >
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                        </Checkbox.Content>
                      </Checkbox>
                    </th>
                    <th scope="col" className="min-w-64 px-4 py-3">
                      Permissão & Descrição
                    </th>
                    <th scope="col" className="w-60 px-4 py-3">
                      Código Identificador
                    </th>
                    <th scope="col" className="w-48 px-4 py-3">
                      Módulo
                    </th>
                    <th scope="col" className="w-40 px-4 py-3 text-right">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border/50 text-sm">
                  {groupedViewData ? (
                    groupedViewData.map((group) => (
                      <React.Fragment key={group.groupId}>
                        {/* Header de Grupo na Tabela */}
                        <tr className="border-y border-border/50 bg-surface-secondary/40 dark:bg-surface-secondary/25 text-xs">
                          <td colSpan={5} className="px-4 py-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`flex size-6 items-center justify-center rounded-lg ${group.meta.colorClasses.bg} ${group.meta.colorClasses.icon}`}
                                  aria-hidden
                                >
                                  {group.meta.icon}
                                </span>
                                <span className="font-bold text-sm text-foreground">
                                  {group.meta.label}
                                </span>
                                <span className="rounded-full border border-border/50 bg-surface/70 px-2.5 py-0.5 text-xs font-semibold text-foreground/80">
                                  {group.activeCount} de {group.items.length} ativas
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleGroupAll(group.groupId, !group.allGroupOn)
                                  }
                                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 transition-colors hover:text-emerald-800 dark:hover:text-emerald-300 hover:underline focus-visible:outline-none"
                                >
                                  {group.allGroupOn
                                    ? 'Desmarcar grupo'
                                    : 'Ativar todas do grupo'}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* Linhas das Permissões do Grupo */}
                        {group.items.map((permission) => {
                          const isActive = selectedSet.has(permission.id);
                          return (
                            <PermissionTableRow
                              key={permission.id}
                              permission={permission}
                              isActive={isActive}
                              meta={group.meta}
                              isCopied={copiedId === permission.id}
                              onToggle={() => togglePermission(permission.id)}
                              onCopy={(e) =>
                                copyIdToClipboard(permission.id, e)
                              }
                            />
                          );
                        })}
                      </React.Fragment>
                    ))
                  ) : (
                    filteredPermissions.map((permission) => {
                      const isActive = selectedSet.has(permission.id);
                      const meta = getModuleMeta(permission.group);
                      return (
                        <PermissionTableRow
                          key={permission.id}
                          permission={permission}
                          isActive={isActive}
                          meta={meta}
                          isCopied={copiedId === permission.id}
                          onToggle={() => togglePermission(permission.id)}
                          onCopy={(e) => copyIdToClipboard(permission.id, e)}
                        />
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Rodapé Informativo da Tabela */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-secondary/40 px-4 py-3 text-xs text-foreground/80">
              <div>
                Exibindo{' '}
                <strong className="font-bold text-foreground">
                  {filteredPermissions.length}
                </strong>{' '}
                permissões
                {search && ` para "${search}"`}
              </div>
              <div className="flex items-center gap-3">
                <span>
                  <strong className="font-bold text-foreground">
                    {
                      filteredPermissions.filter((p) => selectedSet.has(p.id))
                        .length
                    }
                  </strong>{' '}
                  selecionadas nesta visualização
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Barra Flutuante de Ações Pendentes */}
      {dirty ? (
        <div className="sticky bottom-0 z-20 shrink-0 border-t border-amber-500/30 bg-surface/95 px-4 py-3 shadow-xl backdrop-blur-md md:px-6 lg:px-8">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-amber-500" />
              </span>
              <p className="text-xs font-semibold text-foreground sm:text-sm">
                Existem alterações pendentes não salvas para{' '}
                <strong className="text-amber-600 dark:text-amber-400">{role.name}</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                size="sm"
                variant="secondary"
                isDisabled={saving}
                onPress={discard}
              >
                <LuRotateCcw className="size-4" />
                Descartar
              </Button>
              <Button
                size="sm"
                isPending={saving}
                onPress={() => {
                  void save();
                }}
                className="gap-1.5 bg-emerald-600 font-medium text-white shadow-xs hover:bg-emerald-700 active:bg-emerald-800 focus-visible:outline-emerald-600 disabled:pointer-events-none disabled:opacity-50"
              >
                <LuCheck className="size-4" />
                Salvar permissões
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

interface PermissionTableRowProps {
  permission: PermissionDefinitionDto;
  isActive: boolean;
  meta: ModuleMeta;
  isCopied: boolean;
  onToggle: () => void;
  onCopy: (e: React.MouseEvent) => void;
}

const PermissionTableRow = React.memo(function PermissionTableRow({
  permission,
  isActive,
  meta,
  isCopied,
  onToggle,
  onCopy,
}: PermissionTableRowProps) {
  return (
    <tr
      onClick={onToggle}
      className={`group cursor-pointer border-l-4 transition-all ${
        isActive
          ? 'border-l-emerald-500 bg-emerald-500/8 hover:bg-emerald-500/14 dark:bg-emerald-500/12 dark:hover:bg-emerald-500/18'
          : 'border-l-transparent hover:bg-muted/40 dark:hover:bg-muted/20'
      }`}
      aria-selected={isActive}
    >
      {/* Checkbox de Seleção */}
      <td
        className="w-12 px-4 py-3.5 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          aria-label={`Permissão ${permission.title}`}
          isSelected={isActive}
          onChange={onToggle}
        >
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
          </Checkbox.Content>
        </Checkbox>
      </td>

      {/* Título & Descrição */}
      <td className="min-w-64 px-4 py-3.5">
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border transition-all ${
              isActive
                ? `${meta.colorClasses.bg} ${meta.colorClasses.border} ${meta.colorClasses.icon} shadow-2xs`
                : 'border-border/60 bg-muted/30 text-foreground/60 group-hover:border-border group-hover:bg-muted/60 group-hover:text-foreground'
            }`}
            aria-hidden
          >
            {meta.icon}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <span
              className={`text-sm font-semibold transition-colors ${
                isActive ? 'text-foreground' : 'text-foreground/90 group-hover:text-foreground'
              }`}
            >
              {permission.title}
            </span>
            {permission.description ? (
              <span className="text-xs leading-relaxed text-muted-foreground/90">
                {permission.description}
              </span>
            ) : null}
          </div>
        </div>
      </td>

      {/* Código Identificador */}
      <td className="w-60 px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/25 px-2.5 py-1 font-mono text-xs font-semibold text-foreground/90 transition-all group-hover:border-border group-hover:bg-muted/40 group-hover:text-foreground">
          <span className="select-all">{permission.id}</span>
          <button
            type="button"
            onClick={onCopy}
            className="flex size-5 items-center justify-center rounded text-muted-foreground transition-all hover:bg-muted hover:text-foreground focus-visible:outline-none"
            title="Copiar código da permissão"
            aria-label={`Copiar código ${permission.id}`}
          >
            {isCopied ? (
              <LuCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <LuCopy className="size-3.5" />
            )}
          </button>
        </div>
      </td>

      {/* Módulo */}
      <td className="w-48 px-4 py-3.5">
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${meta.colorClasses.bg} ${meta.colorClasses.border} ${meta.colorClasses.text}`}
        >
          <span className="size-3 shrink-0" aria-hidden>
            {meta.icon}
          </span>
          <span>{meta.label}</span>
        </span>
      </td>

      {/* Status / Switch */}
      <td
        className="w-40 px-4 py-3.5 text-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end gap-2.5">
          {isActive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Ativa
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-2.5 py-0.5 text-xs font-medium text-foreground/70">
              <span className="size-1.5 rounded-full bg-foreground/40" />
              Inativa
            </span>
          )}
          <Switch
            aria-label={`Alternar permissão ${permission.title}`}
            isSelected={isActive}
            onChange={onToggle}
          >
            <Switch.Control className="data-[selected=true]:bg-emerald-600! data-[selected=true]:hover:bg-emerald-700! dark:data-[selected=true]:bg-emerald-500! dark:data-[selected=true]:hover:bg-emerald-600!">
              <Switch.Thumb />
            </Switch.Control>
          </Switch>
        </div>
      </td>
    </tr>
  );
});
