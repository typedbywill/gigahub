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
import { LuArrowLeft, LuCamera, LuMail, LuShield, LuTrash2 } from 'react-icons/lu';

export interface UserDetailHeaderProps {
  name: string;
  email: string;
  status: 'active' | 'blocked';
  avatarUrl?: string;
  jobTitle?: string;
  roleName?: string;
  idErp?: string;
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
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0]!.substring(0, 2).toUpperCase();
  }
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export const UserDetailHeader: React.FC<UserDetailHeaderProps> = ({
  name,
  email,
  status,
  avatarUrl,
  jobTitle,
  roleName,
  idErp,
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

  return (
    <header className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="h-1.5 w-full bg-accent" aria-hidden />

      <div className="flex flex-col gap-5 p-5 md:p-6">
        <Link
          to={backTo}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          <LuArrowLeft className="size-4" />
          Usuários
        </Link>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start">
            <div className="group relative shrink-0 self-start">
              <Avatar
                size="lg"
                color="accent"
                className="size-24 text-xl ring-2 ring-border ring-offset-2 ring-offset-surface"
              >
                {avatarUrl ? (
                  <Avatar.Image alt={name} src={avatarUrl} />
                ) : null}
                <Avatar.Fallback>{userInitials(name)}</Avatar.Fallback>
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
                      aria-label="Gerenciar foto"
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
                    aria-label="Trocar foto"
                    isPending={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 size-9 min-w-9 rounded-full border border-border shadow-sm"
                    onPress={() => fileInputRef.current?.click()}
                  >
                    <LuCamera className="size-4" aria-hidden />
                  </Button>
                )
              ) : null}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  {name}
                </h1>
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

              <div className="flex flex-col gap-1.5 text-sm text-muted">
                <div className="flex min-w-0 items-center gap-2">
                  <LuMail className="size-3.5 shrink-0" />
                  <span className="truncate text-foreground/80">{email}</span>
                </div>
                {jobTitle ? (
                  <div className="flex min-w-0 items-center gap-2">
                    <LuShield className="size-3.5 shrink-0" />
                    <span className="truncate">{jobTitle}</span>
                    {idErp ? (
                      <span className="truncate text-xs">· {idErp}</span>
                    ) : null}
                  </div>
                ) : idErp ? (
                  <p className="text-xs">{idErp}</p>
                ) : (
                  <p className="text-xs">Usuário local</p>
                )}
              </div>
            </div>
          </div>

          {canInactivate && isActive ? (
            <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
              <AlertDialog
                isOpen={confirmOpen}
                onOpenChange={onConfirmOpenChange}
              >
                <Button variant="danger">Inativar usuário</Button>
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
