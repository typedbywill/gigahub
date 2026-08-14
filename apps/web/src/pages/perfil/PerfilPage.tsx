import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Button,
  Chip,
  Disclosure,
  Dropdown,
  Input,
  Label,
  Spinner,
  TextField,
} from '@heroui/react';
import {
  LuBuilding2,
  LuCamera,
  LuChevronDown,
  LuKeyRound,
  LuTrash2,
  LuUserRound,
} from 'react-icons/lu';
import type { UserDetailDto } from '@gigahub/shared/contracts';
import { ApiClientError, changePasswordRequest } from '../../shared/api/auth.api';
import {
  deleteUserAvatarRequest,
  getUserRequest,
  uploadUserAvatarRequest,
} from '../../shared/api/users.api';
import { routes } from '../../shared/routes';
import { useAuthStore } from '../../shared/stores/auth.store';
import { toast } from '../../shared/ui/toast';

const fieldClassName =
  'h-10 rounded-xl border border-border bg-background text-foreground shadow-none placeholder:text-muted';

const MIN_PASSWORD_LENGTH = 8;

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0]!.substring(0, 2).toUpperCase();
  }
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'long',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function ProfileInfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-sm text-muted">{label}</dt>
      <dd className="truncate text-sm font-medium text-foreground sm:text-right">
        {value}
      </dd>
    </div>
  );
}

function ProfilePanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="h-0.5 bg-accent" aria-hidden />
      <div className="p-5 md:p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent"
            aria-hidden
          >
            {icon}
          </span>
          <h2 className="font-display text-base font-semibold text-foreground">
            {title}
          </h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function DisclosureSection({
  title,
  icon,
  children,
  defaultExpanded = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="h-0.5 bg-accent/60" aria-hidden />
      <Disclosure
        className="p-5 md:p-6"
        isExpanded={expanded}
        onExpandedChange={setExpanded}
      >
        <Disclosure.Heading>
          <Button
            slot="trigger"
            variant="ghost"
            className="h-auto w-full justify-between gap-3 px-0 py-0 font-normal hover:bg-transparent"
            aria-expanded={expanded}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent"
                aria-hidden
              >
                {icon}
              </span>
              <span className="font-display text-base font-semibold text-foreground">
                {title}
              </span>
            </span>
            <Disclosure.Indicator>
              <LuChevronDown className="size-4 shrink-0 text-accent transition-transform" />
            </Disclosure.Indicator>
          </Button>
        </Disclosure.Heading>
        <Disclosure.Content>
          <Disclosure.Body className="border-t border-border pt-4">
            {children}
          </Disclosure.Body>
        </Disclosure.Content>
      </Disclosure>
    </section>
  );
}

export const PerfilPage: React.FC = () => {
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const authUser = useAuthStore((s) => s.user);
  const patchCurrentUser = useAuthStore((s) => s.patchCurrentUser);
  const logout = useAuthStore((s) => s.logout);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<UserDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const applyUser = useCallback(
    (detail: UserDetailDto) => {
      setUser(detail);
      patchCurrentUser({
        name: detail.name,
        email: detail.email,
        avatarUrl: detail.avatarUrl,
        jobTitle: detail.jobTitle,
        status: detail.status,
      });
    },
    [patchCurrentUser],
  );

  const load = useCallback(async () => {
    if (!accessToken || !authUser?.id) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const detail = await getUserRequest(accessToken, authUser.id);
      applyUser(detail);
    } catch (err) {
      setUser(null);
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível carregar seu perfil.',
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, applyUser, authUser?.id]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError(null);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`A nova senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmação da senha não confere.');
      return;
    }
    if (!accessToken) {
      return;
    }

    setSavingPassword(true);
    try {
      await changePasswordRequest(
        { currentPassword, newPassword },
        accessToken,
      );
      toast.success('Senha alterada. Faça login novamente.');
      logout();
      navigate(routes.login, { replace: true });
    } catch (err) {
      setPasswordError(
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível alterar a senha.',
      );
    } finally {
      setSavingPassword(false);
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
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-10 md:px-8">
        <p className="text-sm text-danger" role="alert">
          {error ?? 'Não foi possível carregar seu perfil.'}
        </p>
        <Button variant="secondary" onPress={() => void load()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const isActive = user.status === 'active';
  const roleName = user.roles[0]?.name;
  const passwordDirty =
    currentPassword.length > 0 ||
    newPassword.length > 0 ||
    confirmPassword.length > 0;

  const ixcFields = [
    user.idErp ? { label: 'ID IXC', value: user.idErp } : null,
    user.idErpEmployee
      ? { label: 'ID Funcionário', value: user.idErpEmployee }
      : null,
    user.cashboxId ? { label: 'Caixa', value: user.cashboxId } : null,
    user.warehouseId ? { label: 'Almoxarifado', value: user.warehouseId } : null,
    user.planningId ? { label: 'Planejamento', value: user.planningId } : null,
  ].filter((field): field is { label: string; value: string } => field !== null);

  const accountRows = [
    roleName ? { label: 'Grupo de acesso', value: roleName } : null,
    user.jobTitle ? { label: 'Cargo', value: user.jobTitle } : null,
    { label: 'Membro desde', value: formatDate(user.createdAt) },
  ].filter((row): row is { label: string; value: string } => row !== null);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <div className="grid gap-6 lg:grid-cols-[minmax(260px,320px)_1fr] lg:items-start lg:gap-8">
        <aside className="overflow-hidden rounded-2xl border border-border bg-surface lg:sticky lg:top-8">
          <div
            className="relative overflow-hidden bg-linear-to-br from-accent/20 via-accent/8 to-transparent px-6 pb-8 pt-8 md:px-8 md:pt-10"
            aria-hidden
          >
            <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-accent/15 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-6 -left-6 size-24 rounded-full bg-accent/10 blur-xl" />
          </div>

          <div className="-mt-14 flex flex-col items-center gap-4 px-6 pb-6 text-center md:px-8 lg:-mt-16 lg:items-start lg:pb-8 lg:text-left">
            <div className="relative shrink-0">
              <Avatar
                size="lg"
                color="accent"
                className="size-24 text-xl ring-4 ring-accent/20 ring-offset-2 ring-offset-surface md:size-28 md:text-2xl"
              >
                {user.avatarUrl ? (
                  <Avatar.Image
                    key={user.avatarUrl}
                    alt={user.name}
                    src={user.avatarUrl}
                  />
                ) : null}
                <Avatar.Fallback>{userInitials(user.name)}</Avatar.Fallback>
              </Avatar>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) {
                    void onAvatarFile(file);
                  }
                }}
              />

              {user.avatarUrl ? (
                <Dropdown>
                  <Button
                    size="sm"
                    variant="primary"
                    isIconOnly
                    aria-label="Gerenciar foto de perfil"
                    isPending={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 size-9 min-w-9 rounded-full shadow-md"
                  >
                    <LuCamera className="size-4" aria-hidden />
                  </Button>
                  <Dropdown.Popover placement="bottom end">
                    <Dropdown.Menu
                      onAction={(key) => {
                        if (key === 'change') {
                          fileInputRef.current?.click();
                          return;
                        }
                        if (key === 'remove') {
                          void removeAvatar();
                        }
                      }}
                    >
                      <Dropdown.Item id="change" textValue="Alterar foto">
                        <LuCamera className="size-4 shrink-0 text-muted" />
                        <Label>Alterar foto</Label>
                      </Dropdown.Item>
                      <Dropdown.Item
                        id="remove"
                        textValue="Remover foto"
                        variant="danger"
                      >
                        <LuTrash2 className="size-4 shrink-0 text-danger" />
                        <Label>Remover foto</Label>
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  isIconOnly
                  aria-label="Alterar foto de perfil"
                  isPending={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 size-9 min-w-9 rounded-full shadow-md"
                  onPress={() => fileInputRef.current?.click()}
                >
                  <LuCamera className="size-4" aria-hidden />
                </Button>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                {user.name}
              </h1>
              <p className="truncate text-sm text-muted">{user.email}</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <Chip
                size="sm"
                color={isActive ? 'success' : 'danger'}
                variant="soft"
              >
                {isActive ? 'Ativo' : 'Inativo'}
              </Chip>
              {roleName ? (
                <Chip size="sm" variant="soft" color="accent">
                  {roleName}
                </Chip>
              ) : null}
            </div>

            {user.jobTitle ? (
              <p className="text-sm text-muted">{user.jobTitle}</p>
            ) : null}
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-4 md:gap-5">
          <ProfilePanel
            title="Conta"
            icon={<LuUserRound className="size-4" />}
          >
            <dl className="divide-y divide-border">
              {accountRows.map((row) => (
                <ProfileInfoRow
                  key={row.label}
                  label={row.label}
                  value={row.value}
                />
              ))}
            </dl>
          </ProfilePanel>

          {ixcFields.length > 0 ? (
            <DisclosureSection
              title="Integração IXC"
              icon={<LuBuilding2 className="size-4" />}
            >
              <dl className="divide-y divide-border">
                {ixcFields.map((field) => (
                  <ProfileInfoRow
                    key={field.label}
                    label={field.label}
                    value={field.value}
                  />
                ))}
              </dl>
            </DisclosureSection>
          ) : null}

          <DisclosureSection
            title="Alterar senha"
            icon={<LuKeyRound className="size-4" />}
          >
            <p className="mb-4 text-sm text-muted">
              Todas as sessões serão encerradas após a troca.
            </p>
            <form
              className="flex flex-col gap-4 lg:max-w-md"
              onSubmit={(e) => void savePassword(e)}
            >
              <TextField
                name="currentPassword"
                type="password"
                isRequired
                fullWidth
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
                className="flex flex-col gap-1.5"
              >
                <Label className="text-sm text-muted">Senha atual</Label>
                <Input fullWidth className={fieldClassName} />
              </TextField>
              <TextField
                name="newPassword"
                type="password"
                isRequired
                fullWidth
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
                className="flex flex-col gap-1.5"
              >
                <Label className="text-sm text-muted">Nova senha</Label>
                <Input fullWidth className={fieldClassName} />
              </TextField>
              <TextField
                name="confirmPassword"
                type="password"
                isRequired
                fullWidth
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                className="flex flex-col gap-1.5"
              >
                <Label className="text-sm text-muted">Confirmar nova senha</Label>
                <Input fullWidth className={fieldClassName} />
              </TextField>
              {passwordError ? (
                <p className="text-sm text-danger" role="alert">
                  {passwordError}
                </p>
              ) : null}
              <Button
                type="submit"
                isDisabled={!passwordDirty}
                isPending={savingPassword}
                className="w-full sm:w-auto"
              >
                Alterar senha
              </Button>
            </form>
          </DisclosureSection>
        </div>
      </div>
    </div>
  );
};
