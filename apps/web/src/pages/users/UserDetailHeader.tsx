import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertDialog,
  Avatar,
  Button,
  Dropdown,
  Label,
} from '@heroui/react';
import {
  LuArrowLeft,
  LuBriefcase,
  LuCamera,
  LuCheck,
  LuCopy,
  LuMail,
  LuShield,
  LuTrash2,
  LuUserX,
} from 'react-icons/lu';
import { routes } from '../../shared/routes';
import { toast } from '../../shared/ui/toast';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { getAvatarColor } from '../../shared/lib/avatar-color';

export type UserDetailHeaderProps = {
  name: string;
  email: string;
  jobTitle?: string | null;
  status: 'active' | 'blocked';
  idErp?: number | string | null;
  roleName?: string | null;
  avatarUrl?: string | null;
  userId?: string;
  canUpdate: boolean;
  canInactivate: boolean;
  onAvatarFile: (file: File) => void;
  onRemoveAvatar: () => void;
  uploadingAvatar: boolean;
  onInactivate: () => void;
  inactivating: boolean;
  confirmOpen: boolean;
  onConfirmOpenChange: (open: boolean) => void;
  backTo?: string;
};

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (!first) {
    return '?';
  }
  if (parts.length === 1 || !last) {
    return first.substring(0, 2).toUpperCase();
  }
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

export const UserDetailHeader: React.FC<UserDetailHeaderProps> = ({
  name,
  email,
  jobTitle,
  status,
  idErp,
  roleName,
  avatarUrl,
  userId,
  canUpdate,
  canInactivate,
  onAvatarFile,
  onRemoveAvatar,
  uploadingAvatar,
  onInactivate,
  inactivating,
  confirmOpen,
  onConfirmOpenChange,
  backTo = routes.usuarios,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success(`${label} copiado!`);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const isActive = status === 'active';
  const avatarColor = getAvatarColor(userId ?? name);

  return (
    <header className="flex flex-col gap-4">
      {/* Breadcrumb Navigation Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <nav
          aria-label="Caminho de navegação"
          className="flex items-center gap-2 text-sm text-muted"
        >
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
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
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-xs">
        <div className="relative flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-start">
            {/* Avatar & Photo Upload Controls */}
            <div className="group relative shrink-0 self-start">
              <div className="relative">
                <Avatar
                  size="lg"
                  className={`size-24 text-xl ring-4 ring-offset-2 ring-offset-surface ${
                    isActive ? 'ring-emerald-500/20' : 'ring-zinc-500/20'
                  } ${!avatarUrl ? `${avatarColor.bg} ${avatarColor.text}` : ''}`}
                >
                  {avatarUrl ? (
                    <Avatar.Image alt={name} src={avatarUrl} />
                  ) : null}
                  <Avatar.Fallback className={avatarColor.text}>
                    {userInitials(name)}
                  </Avatar.Fallback>
                </Avatar>

                <span
                  className={`absolute bottom-1 left-1 size-4 rounded-full border-2 border-surface ${
                    isActive ? 'bg-emerald-500' : 'bg-zinc-400'
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
                <StatusBadge
                  variant={isActive ? 'active' : 'inactive'}
                  showDot
                >
                  {isActive ? 'Ativo' : 'Inativo'}
                </StatusBadge>

                {roleName ? (
                  <StatusBadge
                    variant="security"
                    icon={<LuShield />}
                  >
                    {roleName}
                  </StatusBadge>
                ) : null}

                {idErp ? (
                  <StatusBadge variant="erp">
                    IXC #{idErp}
                  </StatusBadge>
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
                    {copiedKey === 'E-mail' ? (
                      <LuCheck className="size-3.5 text-success" />
                    ) : (
                      <LuCopy className="size-3.5" />
                    )}
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
                      {copiedKey === 'ID do usuário' ? (
                        <LuCheck className="size-3 text-success" />
                      ) : (
                        <LuCopy className="size-3" />
                      )}
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
