import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertDialog,
  Avatar,
  Button,
  Chip,
  Dropdown,
  Label,
} from '@heroui/react';
import {
  LuArrowLeft,
  LuBriefcase,
  LuCamera,
  LuCopy,
  LuMail,
  LuShield,
  LuTrash2,
  LuUserX,
} from 'react-icons/lu';
import { toast } from '../../shared/ui/toast';

export interface UserDetailHeaderProps {
  name: string;
  email: string;
  status: 'active' | 'blocked';
  avatarUrl?: string;
  jobTitle?: string;
  roleName?: string;
  idErp?: string;
  userId?: string;
  backTo: string;
  canUpdate: boolean;
  canInactivate: boolean;
  uploadingAvatar: boolean;
  inactivating: boolean;
  confirmOpen: boolean;
  onConfirmOpenChange: (open: boolean) => void;
  onAvatarFile: (file: File) => void;
  onRemoveAvatar: () => void;
  onInactivate: () => void;
}

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  const last = parts[parts.length - 1];

  if (!first) {
    return '?';
  }
  if (parts.length === 1) {
    return first.substring(0, 2).toUpperCase();
  }
  if (last) {
    return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
  }
  return first.substring(0, 2).toUpperCase();
}

export const UserDetailHeader: React.FC<UserDetailHeaderProps> = ({
  name,
  email,
  status,
  avatarUrl,
  jobTitle,
  roleName,
  idErp,
  userId,
  backTo,
  canUpdate,
  canInactivate,
  uploadingAvatar,
  inactivating,
  confirmOpen,
  onConfirmOpenChange,
  onAvatarFile,
  onRemoveAvatar,
  onInactivate,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isActive = status === 'active';

  const handleCopy = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  return (
    <header className="flex flex-col gap-4">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <nav
          aria-label="Navegação de migalhas"
          className="flex items-center gap-2 text-xs font-medium text-muted"
        >
          <Link
            to={backTo}
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <LuArrowLeft className="size-3.5" />
            <span>Usuários</span>
          </Link>
          <span className="text-border">/</span>
          <span className="max-w-48 truncate font-semibold text-foreground md:max-w-xs">
            {name}
          </span>
        </nav>

        <span className="text-xs text-muted">
          {canUpdate ? 'Modo de edição ativo' : 'Somente leitura'}
        </span>
      </div>

      {/* Hero Card Container */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
        {/* Ambient Gradient Overlay */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-accent/10 via-transparent to-accent/5"
          aria-hidden
        />
        <div className="h-1.5 w-full bg-accent" aria-hidden />

        <div className="relative flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-start">
            {/* Avatar & Photo Upload Controls */}
            <div className="group relative shrink-0 self-start">
              <div className="relative">
                <Avatar
                  size="lg"
                  color="accent"
                  className={`size-24 text-xl ring-4 ring-offset-2 ring-offset-surface ${
                    isActive ? 'ring-emerald-500/30' : 'ring-danger/30'
                  }`}
                >
                  {avatarUrl ? (
                    <Avatar.Image alt={name} src={avatarUrl} />
                  ) : null}
                  <Avatar.Fallback>{userInitials(name)}</Avatar.Fallback>
                </Avatar>

                <span
                  className={`absolute bottom-1 left-1 size-4 rounded-full border-2 border-surface ${
                    isActive ? 'bg-emerald-500' : 'bg-danger'
                  }`}
                  title={isActive ? 'Usuário Ativo' : 'Usuário Inativo'}
                />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) {
                    onAvatarFile(file);
                  }
                }}
              />

              {canUpdate ? (
                avatarUrl ? (
                  <Dropdown>
                    <Button
                      size="sm"
                      variant="secondary"
                      isIconOnly
                      aria-label="Gerenciar foto de perfil"
                      isPending={uploadingAvatar}
                      className="absolute -bottom-1 -right-1 size-9 min-w-9 rounded-full border border-border shadow-sm"
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
                            onRemoveAvatar();
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
                    variant="secondary"
                    isIconOnly
                    aria-label="Trocar foto de perfil"
                    isPending={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 size-9 min-w-9 rounded-full border border-border shadow-sm"
                    onPress={() => fileInputRef.current?.click()}
                  >
                    <LuCamera className="size-4" aria-hidden />
                  </Button>
                )
              ) : null}
            </div>

            {/* Name, Chips & Key Meta */}
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  {name}
                </h1>
                <Chip
                  size="sm"
                  color={isActive ? 'success' : 'danger'}
                  variant="soft"
                  className="font-medium"
                >
                  {isActive ? 'Ativo' : 'Inativo'}
                </Chip>

                {roleName ? (
                  <Chip
                    size="sm"
                    variant="soft"
                    color="accent"
                    className="font-medium"
                  >
                    <LuShield className="mr-1 inline size-3" />
                    {roleName}
                  </Chip>
                ) : null}

                {idErp ? (
                  <Chip size="sm" variant="dot" color="primary">
                    IXC #{idErp}
                  </Chip>
                ) : null}
              </div>

              {/* Quick Info & 1-Click Copy Toolbar */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
                <div className="flex items-center gap-1.5">
                  <LuMail className="size-4 shrink-0 text-muted" />
                  <span className="font-medium text-foreground/90">
                    {email}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    isIconOnly
                    aria-label="Copiar e-mail"
                    className="size-6 min-w-6 text-muted hover:text-foreground"
                    onPress={() => handleCopy(email, 'E-mail')}
                  >
                    <LuCopy className="size-3.5" />
                  </Button>
                </div>

                {jobTitle ? (
                  <div className="flex items-center gap-1.5">
                    <LuBriefcase className="size-4 shrink-0 text-muted" />
                    <span>{jobTitle}</span>
                  </div>
                ) : null}

                {userId ? (
                  <div className="flex items-center gap-1 text-xs text-muted">
                    <span>ID:</span>
                    <span className="font-mono text-muted">{userId.slice(0, 8)}…</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      isIconOnly
                      aria-label="Copiar ID do usuário"
                      className="size-6 min-w-6 text-muted hover:text-foreground"
                      onPress={() => handleCopy(userId, 'ID do usuário')}
                    >
                      <LuCopy className="size-3" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          {canInactivate && isActive ? (
            <div className="flex shrink-0 items-center gap-2 self-start">
              <AlertDialog
                isOpen={confirmOpen}
                onOpenChange={onConfirmOpenChange}
              >
                <Button variant="danger" className="gap-1.5 font-medium">
                  <LuUserX className="size-4" />
                  Inativar usuário
                </Button>
                <AlertDialog.Backdrop>
                  <AlertDialog.Container>
                    <AlertDialog.Dialog className="sm:max-w-105">
                      <AlertDialog.CloseTrigger />
                      <AlertDialog.Header>
                        <AlertDialog.Icon status="danger" />
                        <AlertDialog.Heading>
                          Inativar usuário?
                        </AlertDialog.Heading>
                      </AlertDialog.Header>
                      <AlertDialog.Body>
                        <p className="text-sm text-muted">
                          {name} ({email}) será inativado no GigaHub
                          {idErp ? ' e no IXC' : ''}. Sessões ativas serão
                          encerradas.
                        </p>
                      </AlertDialog.Body>
                      <AlertDialog.Footer>
                        <Button
                          slot="close"
                          variant="secondary"
                          isDisabled={inactivating}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="danger"
                          isPending={inactivating}
                          onPress={onInactivate}
                        >
                          Inativar
                        </Button>
                      </AlertDialog.Footer>
                    </AlertDialog.Dialog>
                  </AlertDialog.Container>
                </AlertDialog.Backdrop>
              </AlertDialog>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};

