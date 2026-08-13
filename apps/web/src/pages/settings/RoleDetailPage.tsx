import React, {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Checkbox,
  Chip,
  SearchField,
  Spinner,
  Switch,
} from '@heroui/react';
import { LuArrowLeft, LuCheck, LuRotateCcw } from 'react-icons/lu';
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

const GROUP_LABELS: Record<string, string> = {
  'work-order': 'Ordens de serviço',
  care: 'Atendimento',
  finance: 'Financeiro',
  telemetry: 'Telemetria',
  gamification: 'Gamificação',
  access: 'Acesso',
};

function groupLabel(group: string): string {
  return GROUP_LABELS[group] ?? group;
}

type DetailLocationState = {
  from?: string;
};

type PermissionGroup = {
  id: string;
  label: string;
  permissions: PermissionDefinitionDto[];
};

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
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setSelectedIds(found ? [...found.permissionIds] : []);
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

  const groups = useMemo((): PermissionGroup[] => {
    const map = new Map<string, PermissionDefinitionDto[]>();
    for (const entry of catalog) {
      const list = map.get(entry.group) ?? [];
      list.push(entry);
      map.set(entry.group, list);
    }
    return [...map.entries()].map(([groupId, permissions]) => ({
      id: groupId,
      label: groupLabel(groupId),
      permissions,
    }));
  }, [catalog]);

  const filteredGroups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) {
      return groups;
    }
    return groups
      .map((group) => ({
        ...group,
        permissions: group.permissions.filter(
          (permission) =>
            permission.title.toLowerCase().includes(q) ||
            permission.id.toLowerCase().includes(q) ||
            (permission.description?.toLowerCase().includes(q) ?? false) ||
            group.label.toLowerCase().includes(q),
        ),
      }))
      .filter((group) => group.permissions.length > 0);
  }, [filter, groups]);

  const dirty = useMemo(() => {
    if (!role) {
      return false;
    }
    return !sameIds(selectedIds, role.permissionIds);
  }, [role, selectedIds]);

  const allCatalogIds = useMemo(
    () => catalog.map((entry) => entry.id),
    [catalog],
  );

  const allSelected =
    catalog.length > 0 && catalog.every((entry) => selectedSet.has(entry.id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  const togglePermission = useCallback((permissionId: string, on: boolean) => {
    setSelectedIds((current) => {
      if (on) {
        return current.includes(permissionId)
          ? current
          : [...current, permissionId];
      }
      return current.filter((idValue) => idValue !== permissionId);
    });
  }, []);

  const toggleGroup = useCallback(
    (permissionIds: string[], on: boolean) => {
      setSelectedIds((current) => {
        const next = new Set(current);
        for (const permissionId of permissionIds) {
          if (on) {
            next.add(permissionId);
          } else {
            next.delete(permissionId);
          }
        }
        return [...next];
      });
    },
    [],
  );

  const toggleAll = useCallback(
    (on: boolean) => {
      setSelectedIds(on ? [...allCatalogIds] : []);
    },
    [allCatalogIds],
  );

  const discard = useCallback(() => {
    if (!role) {
      return;
    }
    setSelectedIds([...role.permissionIds]);
  }, [role]);

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
      toast.success('Permissões atualizadas.');
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

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center p-8">
        <Spinner size="sm" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="flex flex-col gap-4 p-6 md:p-8">
        <p className="text-sm text-danger" role="alert">
          {error ?? 'Função não encontrada.'}
        </p>
        <Button variant="secondary" onPress={() => navigate(backTo)}>
          Voltar para a lista
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] w-full flex-col overflow-hidden md:h-dvh">
      <header className="shrink-0 border-b border-border bg-background/80 px-4 py-4 backdrop-blur-sm md:px-6 lg:px-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <Link
                to={backTo}
                className="mb-3 inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-foreground"
              >
                <LuArrowLeft className="size-4" />
                Permissões
              </Link>
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <h1 className="font-display text-xl font-bold text-foreground md:text-2xl">
                  {role.name}
                </h1>
                <Chip size="sm" variant="soft" color="accent">
                  {selectedIds.length}/{catalog.length}
                </Chip>
                {dirty ? (
                  <Chip size="sm" variant="soft" color="warning">
                    Alterações não salvas
                  </Chip>
                ) : null}
              </div>
              <p className="mt-1 font-mono text-sm text-muted">{role.slug}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                isDisabled={!dirty || saving}
                onPress={discard}
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
              >
                <LuCheck className="size-4" />
                Salvar
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Checkbox
              isSelected={allSelected}
              isIndeterminate={someSelected}
              onChange={toggleAll}
              className="w-fit"
            >
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <span className="text-sm font-medium text-foreground">
                  {allSelected ? 'Desmarcar todas' : 'Marcar todas'}
                </span>
              </Checkbox.Content>
            </Checkbox>

            <SearchField
              value={filter}
              onChange={(value) => {
                startTransition(() => setFilter(value));
              }}
              className="w-full sm:max-w-sm"
              aria-label="Filtrar permissões"
              variant="secondary"
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Filtrar por nome, id ou grupo…" />
                {filter ? <SearchField.ClearButton /> : null}
              </SearchField.Group>
            </SearchField>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 lg:px-8">
        {filteredGroups.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhuma permissão corresponde ao filtro.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {filteredGroups.map((group) => {
              const groupIds = group.permissions.map((p) => p.id);
              const selectedInGroup = groupIds.filter((permissionId) =>
                selectedSet.has(permissionId),
              ).length;
              const groupAllOn =
                groupIds.length > 0 && selectedInGroup === groupIds.length;
              const groupSomeOn = selectedInGroup > 0 && !groupAllOn;

              return (
                <section
                  key={group.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-5">
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-base font-semibold text-foreground">
                        {group.label}
                      </h2>
                      <p className="text-xs text-muted">
                        {selectedInGroup} de {group.permissions.length}
                      </p>
                    </div>
                    <Checkbox
                      aria-label={`Alternar grupo ${group.label}`}
                      isSelected={groupAllOn}
                      isIndeterminate={groupSomeOn}
                      onChange={(on) => toggleGroup(groupIds, on)}
                    >
                      <Checkbox.Content>
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                      </Checkbox.Content>
                    </Checkbox>
                  </div>

                  <ul className="divide-y divide-border">
                    {group.permissions.map((permission) => {
                      const on = selectedSet.has(permission.id);
                      return (
                        <li key={permission.id}>
                          <Switch
                            isSelected={on}
                            onChange={(value) =>
                              togglePermission(permission.id, value)
                            }
                            className="w-full px-4 py-3 hover:bg-background/50 md:px-5"
                          >
                            <Switch.Content className="w-full justify-between gap-3">
                              <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                                <span className="text-sm font-medium text-foreground">
                                  {permission.title}
                                </span>
                                <span className="font-mono text-[11px] text-muted">
                                  {permission.id}
                                </span>
                                {permission.description ? (
                                  <span className="text-xs text-muted">
                                    {permission.description}
                                  </span>
                                ) : null}
                              </span>
                              <Switch.Control className="shrink-0">
                                <Switch.Thumb />
                              </Switch.Control>
                            </Switch.Content>
                          </Switch>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {dirty ? (
        <div className="shrink-0 border-t border-border bg-background px-4 py-3 md:hidden">
          <Button
            className="w-full"
            isPending={saving}
            onPress={() => {
              void save();
            }}
          >
            Salvar permissões
          </Button>
        </div>
      ) : null}
    </div>
  );
};
