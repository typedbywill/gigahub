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
      toast.success('Perfil atualizado.');
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
      <div className="flex w-full flex-col gap-4 p-6 md:p-8">
        <p className="text-sm text-danger" role="alert">
          {error ?? 'Usuário não encontrado.'}
        </p>
        <Button variant="secondary" onPress={() => navigate(backTo)}>
          Voltar para a lista
        </Button>
      </div>
    );
  }

  const readonlyFields: { label: string; value: string }[] = [
    { label: 'Cargo (IXC)', value: user.jobTitle ?? '—' },
    { label: 'ID ERP', value: user.idErp ?? '—' },
    { label: 'ID Funcionário ERP', value: user.idErpEmployee ?? '—' },
    { label: 'Caixa', value: user.cashboxId ?? '—' },
    { label: 'Almoxarifado', value: user.warehouseId ?? '—' },
    { label: 'Planejamento', value: user.planningId ?? '—' },
    { label: 'Criado em', value: formatDate(user.createdAt) },
    { label: 'Atualizado em', value: formatDate(user.updatedAt) },
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
        <section className="rounded-2xl border border-border bg-surface p-5 md:p-6">
          <div className="mb-4 flex flex-col gap-1">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Perfil
            </h2>
            <p className="text-sm text-muted">
              {canUpdate
                ? 'Nome e e-mail editáveis pelo administrador.'
                : 'Nome e e-mail do colaborador (somente leitura).'}
            </p>
          </div>
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
                <Label className="text-sm text-muted">Nome</Label>
                <Input fullWidth className={fieldClassName} />
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
                <Label className="text-sm text-muted">E-mail</Label>
                <Input fullWidth className={fieldClassName} />
              </TextField>
            </div>
            {canUpdate ? (
              <div>
                <Button
                  type="submit"
                  isDisabled={!profileDirty}
                  isPending={savingProfile}
                >
                  Salvar perfil
                </Button>
              </div>
            ) : null}
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 md:p-6">
          <div className="mb-4 flex flex-col gap-1">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Nível de acesso
            </h2>
            <p className="text-sm text-muted">
              Grupo de permissões do usuário no GigaHub.
            </p>
          </div>

          {canManageAccess ? (
            <>
              {rolesCatalog.length === 0 ? (
                <p className="text-sm text-muted">Nenhum grupo disponível.</p>
              ) : (
                <Autocomplete
                  className="w-full"
                  placeholder="Buscar grupo…"
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
                  <Label className="text-sm text-muted">Grupo</Label>
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
                            placeholder="Pesquisar…"
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

              <div className="mt-4">
                <Button
                  isDisabled={!rolesDirty}
                  isPending={savingRoles}
                  onPress={() => {
                    void saveRoles();
                  }}
                >
                  Salvar acesso
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-foreground">
              {user.roles[0]?.name ?? 'Nenhum grupo atribuído'}
            </p>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5 md:p-6">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Dados do ERP
          </h2>
          <p className="text-sm text-muted">
            Informações sincronizadas do IXC (somente leitura).
          </p>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {readonlyFields.map((field) => (
            <div key={field.label} className="flex flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                {field.label}
              </dt>
              <dd className="text-sm text-foreground">{field.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
};
