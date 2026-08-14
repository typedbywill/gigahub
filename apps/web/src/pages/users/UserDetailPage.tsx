import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { Key } from '@heroui/react';
import {
  Autocomplete,
  Button,
  EmptyState,
  Input,
  Label,
  ListBox,
  SearchField,
  Spinner,
  TextField,
  useFilter,
} from '@heroui/react';
import {
  LuBox,
  LuBriefcase,
  LuBuilding2,
  LuCalendar,
  LuCheck,
  LuClock,
  LuCreditCard,
  LuIdCard,
  LuMail,
  LuRefreshCw,
  LuShield,
  LuUser,
  LuUserCheck,
  LuWallet,
} from 'react-icons/lu';
import type {
  RoleListItemDto,
  UserDetailDto,
} from '@gigahub/shared/contracts';
import { useAuthStore } from '../../shared/stores/auth.store';
import { ApiClientError } from '../../shared/api/auth.api';
import { listRolesRequest } from '../../shared/api/roles.api';
import {
  deleteUserAvatarRequest,
  getUserRequest,
  inactivateUserRequest,
  replaceUserRolesRequest,
  updateUserRequest,
  uploadUserAvatarRequest,
} from '../../shared/api/users.api';
import { routes } from '../../shared/routes';
import { Permissions } from '../../shared/permissions';
import { toast } from '../../shared/ui/toast';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { UserDetailHeader } from './UserDetailHeader';

const fieldClassName =
  'h-10 rounded-xl border border-border bg-background text-foreground shadow-none placeholder:text-muted';

const autocompleteTriggerClassName =
  'h-10 w-full rounded-xl border border-border bg-background text-foreground shadow-none';

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

type DetailLocationState = {
  from?: string;
};

function DetailSectionCard({
  title,
  subtitle,
  icon,
  badge,
  themeColor = 'user',
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  themeColor?: 'user' | 'security' | 'erp' | 'neutral';
  children: React.ReactNode;
}) {
  const iconThemeStyles = {
    user: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    security: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    erp: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    neutral: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
  }[themeColor];

  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-xs transition-all">
      <div className="p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${iconThemeStyles}`}
              aria-hidden
            >
              {icon}
            </span>
            <div>
              <h2 className="font-display text-base font-semibold text-foreground">
                {title}
              </h2>
              <p className="text-xs text-muted">{subtitle}</p>
            </div>
          </div>
          {badge ? <div>{badge}</div> : null}
        </div>
        {children}
      </div>
    </section>
  );
}

export const UserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const authUser = useAuthStore((s) => s.user);
  const patchCurrentUser = useAuthStore((s) => s.patchCurrentUser);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canUpdate = hasPermission(Permissions.UsersUpdate);
  const canInactivate = hasPermission(Permissions.UsersInactivate);
  const canManageAccess = hasPermission(Permissions.AccessManage);
  const backTo =
    (location.state as DetailLocationState | null)?.from ?? routes.usuarios;
  const { contains } = useFilter({ sensitivity: 'base' });

  const [user, setUser] = useState<UserDetailDto | null>(null);
  const [rolesCatalog, setRolesCatalog] = useState<RoleListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [inactivating, setInactivating] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [savingRoles, setSavingRoles] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const syncAuthIfSelf = useCallback(
    (detail: UserDetailDto) => {
      if (authUser?.id === detail.id) {
        patchCurrentUser({
          name: detail.name,
          email: detail.email,
          avatarUrl: detail.avatarUrl,
          jobTitle: detail.jobTitle,
          status: detail.status,
        });
      }
    },
    [authUser?.id, patchCurrentUser],
  );

  const applyUser = useCallback(
    (detail: UserDetailDto) => {
      setUser(detail);
      setName(detail.name);
      setEmail(detail.email);
      setSelectedRoleId(detail.roles[0]?.id ?? null);
      syncAuthIfSelf(detail);
    },
    [syncAuthIfSelf],
  );

  const load = useCallback(async () => {
    if (!accessToken || !id) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const detail = await getUserRequest(accessToken, id);
      applyUser(detail);
      if (canManageAccess) {
        try {
          const roles = await listRolesRequest(accessToken);
          setRolesCatalog(roles.items);
        } catch {
          setRolesCatalog([]);
        }
      } else {
        setRolesCatalog([]);
      }
    } catch (err) {
      setUser(null);
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível carregar o usuário.',
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, applyUser, canManageAccess, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmInactivate = async () => {
    if (!accessToken || !user) {
      return;
    }
    setInactivating(true);
    try {
      const result = await inactivateUserRequest(accessToken, user.id);
      applyUser(result.user);
      setConfirmOpen(false);
      toast.success('Usuário inativado.');
    } catch (err) {
      toast.error(
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível inativar o usuário.',
      );
    } finally {
      setInactivating(false);
    }
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accessToken || !user) {
      return;
    }
    setSavingProfile(true);
    try {
      const result = await updateUserRequest(accessToken, user.id, {
        name: name.trim(),
        email: email.trim(),
      });
      applyUser(result.user);
      toast.success('Perfil atualizado com sucesso.');
    } catch (err) {
      toast.error(
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível salvar o perfil.',
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const saveRoles = async () => {
    if (!accessToken || !user) {
      return;
    }
    setSavingRoles(true);
    try {
      const result = await replaceUserRolesRequest(accessToken, user.id, {
        roleIds: selectedRoleId ? [selectedRoleId] : [],
      });
      applyUser(result.user);
      toast.success('Nível de acesso atualizado.');
    } catch (err) {
      toast.error(
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível salvar o nível de acesso.',
      );
    } finally {
      setSavingRoles(false);
    }
  };

  const onAvatarFile = async (file: File) => {
    if (!accessToken || !user) {
      return;
    }
    setUploadingAvatar(true);
    try {
      const result = await uploadUserAvatarRequest(accessToken, user.id, file);
      applyUser(result.user);
      toast.success('Foto de perfil atualizada.');
    } catch (err) {
      toast.error(
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível enviar a foto.',
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    if (!accessToken || !user?.avatarUrl) {
      return;
    }
    setUploadingAvatar(true);
    try {
      const result = await deleteUserAvatarRequest(accessToken, user.id);
      applyUser(result.user);
      toast.success('Foto de perfil removida.');
    } catch (err) {
      toast.error(
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível remover a foto.',
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center p-8">
        <Spinner size="sm" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm font-medium text-danger" role="alert">
          {error ?? 'Usuário não encontrado.'}
        </p>
        <Button variant="secondary" onPress={() => navigate(backTo)}>
          Voltar para a lista
        </Button>
      </div>
    );
  }

  const readonlyFields: {
    label: string;
    value: string;
    icon: React.ReactNode;
  }[] = [
    {
      label: 'Cargo (IXC)',
      value: user.jobTitle ?? '—',
      icon: <LuBriefcase className="size-4 text-muted" />,
    },
    {
      label: 'ID ERP',
      value: user.idErp ?? '—',
      icon: <LuIdCard className="size-4 text-muted" />,
    },
    {
      label: 'ID Funcionário ERP',
      value: user.idErpEmployee ?? '—',
      icon: <LuUserCheck className="size-4 text-muted" />,
    },
    {
      label: 'Caixa',
      value: user.cashboxId ?? '—',
      icon: <LuWallet className="size-4 text-muted" />,
    },
    {
      label: 'Almoxarifado',
      value: user.warehouseId ?? '—',
      icon: <LuBox className="size-4 text-muted" />,
    },
    {
      label: 'Planejamento',
      value: user.planningId ?? '—',
      icon: <LuCreditCard className="size-4 text-muted" />,
    },
    {
      label: 'Criado em',
      value: formatDate(user.createdAt),
      icon: <LuCalendar className="size-4 text-muted" />,
    },
    {
      label: 'Atualizado em',
      value: formatDate(user.updatedAt),
      icon: <LuClock className="size-4 text-muted" />,
    },
  ];

  const currentRoleId = user.roles[0]?.id ?? null;
  const selectedRoleName =
    rolesCatalog.find((role) => role.id === (selectedRoleId ?? currentRoleId))
      ?.name ?? user.roles[0]?.name;
  const profileDirty =
    name.trim() !== user.name || email.trim().toLowerCase() !== user.email;
  const rolesDirty = selectedRoleId !== currentRoleId;

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <UserDetailHeader
        name={user.name}
        email={user.email}
        status={user.status}
        avatarUrl={user.avatarUrl}
        jobTitle={user.jobTitle}
        roleName={selectedRoleName}
        idErp={user.idErp}
        userId={user.id}
        backTo={backTo}
        canUpdate={canUpdate}
        canInactivate={canInactivate}
        uploadingAvatar={uploadingAvatar}
        inactivating={inactivating}
        confirmOpen={confirmOpen}
        onConfirmOpenChange={setConfirmOpen}
        onAvatarFile={(file) => {
          void onAvatarFile(file);
        }}
        onRemoveAvatar={() => {
          void removeAvatar();
        }}
        onInactivate={() => {
          void confirmInactivate();
        }}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Section 1: Perfil */}
        <DetailSectionCard
          title="Perfil e Identificação"
          subtitle="Dados básicos do colaborador no sistema."
          icon={<LuUser className="size-4" />}
          themeColor="user"
          badge={
            canUpdate ? (
              <StatusBadge variant="active">
                Editável
              </StatusBadge>
            ) : (
              <StatusBadge variant="neutral">
                Somente leitura
              </StatusBadge>
            )
          }
        >
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => void saveProfile(e)}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                name="name"
                isRequired
                fullWidth
                value={name}
                onChange={setName}
                isReadOnly={!canUpdate}
                className="flex flex-col gap-1.5"
              >
                <Label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <LuUser className="size-3.5 text-muted" />
                  Nome completo
                </Label>
                <Input
                  fullWidth
                  className={fieldClassName}
                  placeholder="Nome do colaborador"
                />
              </TextField>

              <TextField
                name="email"
                type="email"
                isRequired
                fullWidth
                value={email}
                onChange={setEmail}
                isReadOnly={!canUpdate}
                className="flex flex-col gap-1.5"
              >
                <Label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <LuMail className="size-3.5 text-muted" />
                  E-mail de acesso
                </Label>
                <Input
                  fullWidth
                  className={fieldClassName}
                  placeholder="usuario@empresa.com.br"
                />
              </TextField>
            </div>

            {canUpdate ? (
              <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
                {profileDirty ? (
                  <span className="text-xs font-medium text-amber-500 dark:text-amber-400">
                    • Alterações pendentes no perfil
                  </span>
                ) : (
                  <span className="text-xs text-muted">
                    Sem alterações pendentes
                  </span>
                )}
                <Button
                  type="submit"
                  isDisabled={!profileDirty}
                  isPending={savingProfile}
                  className="gap-1.5 font-medium"
                >
                  <LuCheck className="size-4" />
                  Salvar perfil
                </Button>
              </div>
            ) : null}
          </form>
        </DetailSectionCard>

        {/* Section 2: Access Management */}
        <DetailSectionCard
          title="Nível de Acesso"
          subtitle="Grupo de permissões associado ao usuário."
          icon={<LuShield className="size-4" />}
          themeColor="security"
          badge={
            canManageAccess ? (
              <StatusBadge variant="security">
                Gestão ativa
              </StatusBadge>
            ) : (
              <StatusBadge variant="neutral">
                Atribuído
              </StatusBadge>
            )
          }
        >
          {canManageAccess ? (
            <div className="flex flex-col gap-4">
              {rolesCatalog.length === 0 ? (
                <p className="text-sm text-muted">
                  Nenhum grupo de permissões disponível.
                </p>
              ) : (
                <Autocomplete
                  className="w-full"
                  placeholder="Buscar grupo de permissões…"
                  value={selectedRoleId}
                  onChange={(key: Key | Key[] | null) => {
                    if (Array.isArray(key)) {
                      setSelectedRoleId(
                        key[0] != null ? String(key[0]) : null,
                      );
                      return;
                    }
                    setSelectedRoleId(key != null ? String(key) : null);
                  }}
                >
                  <Label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <LuShield className="size-3.5 text-muted" />
                    Grupo de Permissões
                  </Label>
                  <Autocomplete.Trigger
                    className={autocompleteTriggerClassName}
                  >
                    <Autocomplete.Value />
                    <Autocomplete.ClearButton />
                    <Autocomplete.Indicator />
                  </Autocomplete.Trigger>
                  <Autocomplete.Popover>
                    <Autocomplete.Filter filter={contains}>
                      <SearchField
                        autoFocus
                        name="role-search"
                        variant="secondary"
                      >
                        <SearchField.Group>
                          <SearchField.SearchIcon />
                          <SearchField.Input
                            placeholder="Pesquisar grupos…"
                            className="bg-transparent text-foreground placeholder:text-muted"
                          />
                          <SearchField.ClearButton />
                        </SearchField.Group>
                      </SearchField>
                      <ListBox
                        renderEmptyState={() => (
                          <EmptyState>Nenhum grupo encontrado</EmptyState>
                        )}
                      >
                        {rolesCatalog.map((role) => (
                          <ListBox.Item
                            key={role.id}
                            id={role.id}
                            textValue={role.name}
                          >
                            {role.name}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Autocomplete.Filter>
                  </Autocomplete.Popover>
                </Autocomplete>
              )}

              {/* Selected Role Summary Preview */}
              {selectedRoleName ? (
                <div className="rounded-xl border border-border/60 bg-background/50 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <LuShield className="size-4 text-violet-600 dark:text-violet-400" />
                      <span className="text-sm font-semibold text-foreground">
                        {selectedRoleName}
                      </span>
                    </div>
                    {rolesDirty ? (
                      <StatusBadge variant="warning">
                        Alteração pendente
                      </StatusBadge>
                    ) : (
                      <StatusBadge variant="security">
                        Grupo ativo
                      </StatusBadge>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-muted">
                    As permissões operacionais do colaborador são herdadas
                    diretamente deste grupo de acesso.
                  </p>
                </div>
              ) : null}

              <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-4">
                {rolesDirty ? (
                  <span className="text-xs font-medium text-amber-500 dark:text-amber-400">
                    • Novo grupo selecionado
                  </span>
                ) : (
                  <span className="text-xs text-muted">
                    Grupo de acesso mantido
                  </span>
                )}
                <Button
                  isDisabled={!rolesDirty}
                  isPending={savingRoles}
                  className="gap-1.5 font-medium"
                  onPress={() => {
                    void saveRoles();
                  }}
                >
                  <LuCheck className="size-4" />
                  Salvar acesso
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="flex items-center gap-2">
                <LuShield className="size-4 text-violet-600 dark:text-violet-400" />
                <span className="text-sm font-semibold text-foreground">
                  {user.roles[0]?.name ?? 'Nenhum grupo atribuído'}
                </span>
              </div>
            </div>
          )}
        </DetailSectionCard>
      </div>

      {/* Section 3: IXC Soft ERP Technical Attributes */}
      <DetailSectionCard
        title="Dados do ERP (IXC Soft)"
        subtitle="Informações operacionais obtidas via integração de dados."
        icon={<LuBuilding2 className="size-4" />}
        themeColor="erp"
        badge={
          <StatusBadge variant="erp">
            Sincronizado
          </StatusBadge>
        }
      >
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3.5 text-xs text-sky-900 dark:text-sky-200">
          <LuRefreshCw className="size-4 shrink-0 text-sky-600 dark:text-sky-400" />
          <span>
            Estes campos pertencem ao cadastro do IXC Soft e não podem ser
            editados manualmente no GigaHub.
          </span>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {readonlyFields.map((field) => (
            <div
              key={field.label}
              className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/40 p-3.5"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-surface text-muted">
                {field.icon}
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <dt className="text-xs font-medium uppercase tracking-wider text-muted">
                  {field.label}
                </dt>
                <dd className="truncate text-sm font-semibold text-foreground">
                  {field.value}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </DetailSectionCard>
    </div>
  );
};

