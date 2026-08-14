import React, { useEffect } from 'react';
import { Button } from '@heroui/react';
import {
  LuBell,
  LuCamera,
  LuCheck,
  LuCircleAlert,
  LuCircleCheck,
  LuClock,
  LuCopy,
  LuDatabase,
  LuInfo,
  LuLoaderCircle,
  LuMapPin,
  LuShield,
  LuSparkles,
  LuVolume2,
  LuX,
} from 'react-icons/lu';
import {
  type PermissionDetail,
  type PermissionKey,
  useSystemPermissionsStore,
} from '../stores/system-permissions.store';

function getPermissionIcon(key: PermissionKey): React.ReactNode {
  switch (key) {
    case 'geolocation':
      return <LuMapPin className="size-5" />;
    case 'notifications':
      return <LuBell className="size-5" />;
    case 'audio':
      return <LuVolume2 className="size-5" />;
    case 'storage':
      return <LuDatabase className="size-5" />;
    case 'clipboard':
      return <LuCopy className="size-5" />;
    case 'camera':
      return <LuCamera className="size-5" />;
  }
}

function StatusBadge({ status }: { status: PermissionDetail['status'] }) {
  switch (status) {
    case 'granted':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <LuCircleCheck className="size-3.5" aria-hidden />
          Permitido
        </span>
      );
    case 'denied':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
          <LuCircleAlert className="size-3.5" aria-hidden />
          Bloqueado
        </span>
      );
    case 'unsupported':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-default/40 px-2.5 py-0.5 text-xs font-medium text-muted">
          Indisponível
        </span>
      );
    case 'prompt':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
          <LuClock className="size-3.5" aria-hidden />
          Pendente
        </span>
      );
  }
}

export const SystemPermissionsModal: React.FC = () => {
  const isOpen = useSystemPermissionsStore((s) => s.isOpen);
  const closeModal = useSystemPermissionsStore((s) => s.closeModal);
  const permissions = useSystemPermissionsStore((s) => s.permissions);
  const isRequestingAll = useSystemPermissionsStore((s) => s.isRequestingAll);
  const requestPermission = useSystemPermissionsStore((s) => s.requestPermission);
  const requestAllPermissions = useSystemPermissionsStore((s) => s.requestAllPermissions);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, closeModal]);

  if (!isOpen) return null;

  const permList = Object.values(permissions);
  const grantedCount = permList.filter((p) => p.status === 'granted').length;
  const totalSupported = permList.filter((p) => p.status !== 'unsupported').length;
  const allGranted = grantedCount >= totalSupported;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="perm-modal-title"
      aria-describedby="perm-modal-desc"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={closeModal}
        aria-hidden="true"
      />

      {/* Dialog Body */}
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border/80 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-foreground">
              <LuShield className="size-5" />
            </div>
            <div>
              <h2
                id="perm-modal-title"
                className="font-display text-lg font-bold tracking-tight text-foreground sm:text-xl"
              >
                Permissões do Sistema GigaHub
              </h2>
              <p id="perm-modal-desc" className="text-xs text-muted sm:text-sm">
                Conceda os acessos do navegador para garantir o funcionamento completo de mapas,
                alertas e operações.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-default hover:text-foreground"
            aria-label="Fechar modal de permissões"
          >
            <LuX className="size-5" />
          </button>
        </div>

        {/* Status banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-surface-secondary/40 px-6 py-3">
          <div className="flex items-center gap-2 text-xs text-foreground/80 sm:text-sm">
            <LuSparkles className="size-4 text-amber-500" aria-hidden />
            <span>
              Status atual:{' '}
              <strong className="font-semibold text-foreground">
                {grantedCount} de {totalSupported} permissões ativas
              </strong>
            </span>
          </div>

          <Button
            size="sm"
            onPress={() => void requestAllPermissions()}
            isDisabled={isRequestingAll || allGranted}
            className="rounded-lg bg-accent font-medium text-accent-foreground shadow-xs hover:opacity-90 transition-opacity"
          >
            {isRequestingAll ? (
              <span className="inline-flex items-center gap-1.5">
                <LuLoaderCircle className="size-3.5 animate-spin" />
                Solicitando…
              </span>
            ) : allGranted ? (
              <span className="inline-flex items-center gap-1.5">
                <LuCheck className="size-3.5" />
                Tudo Concedido
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <LuShield className="size-3.5" />
                Permitir Todas
              </span>
            )}
          </Button>
        </div>

        {/* Permissions list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="flex flex-col gap-3">
            {permList.map((perm) => {
              const isGranted = perm.status === 'granted';
              const isDenied = perm.status === 'denied';
              const isUnsupported = perm.status === 'unsupported';

              return (
                <div
                  key={perm.key}
                  className={`flex flex-col gap-3 rounded-xl border p-4 transition-all sm:flex-row sm:items-center sm:justify-between ${
                    isGranted
                      ? 'border-emerald-500/20 bg-emerald-500/5'
                      : isDenied
                      ? 'border-red-500/20 bg-red-500/5'
                      : 'border-border bg-surface hover:border-foreground/20'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                        isGranted
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : isDenied
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                          : 'bg-default text-muted'
                      }`}
                      aria-hidden
                    >
                      {getPermissionIcon(perm.key)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">
                          {perm.name}
                        </h3>
                        <StatusBadge status={perm.status} />
                        {perm.isOptional ? (
                          <span className="rounded bg-default px-1.5 py-0.5 text-[10px] text-muted">
                            Opcional
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted leading-relaxed">
                        {perm.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-end gap-2 pt-2 sm:pt-0">
                    {isGranted ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        isDisabled
                        className="rounded-lg text-xs"
                      >
                        <LuCheck className="size-3.5 text-emerald-500" />
                        Ativo
                      </Button>
                    ) : isDenied ? (
                      <span className="text-xs text-muted" title="Altere nas configurações do navegador (ícone de cadeado)">
                        Desbloqueie no navegador
                      </span>
                    ) : isUnsupported ? (
                      <span className="text-xs text-muted">Não suportado</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={() => void requestPermission(perm.key)}
                        className="rounded-lg text-xs font-medium"
                      >
                        Habilitar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-border/60 bg-surface-secondary/40 p-3.5 text-xs text-muted">
            <LuInfo className="mt-0.5 size-4 shrink-0 text-foreground/60" aria-hidden />
            <p>
              Caso alguma permissão tenha sido recusada anteriormente, você pode clicar no
              ícone de cadeado / configurações ao lado do endereço do site no navegador para
              redefini-la.
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 border-t border-border bg-surface px-6 py-4">
          <Button
            variant="secondary"
            onPress={closeModal}
            className="rounded-xl text-sm"
          >
            {allGranted ? 'Concluir' : 'Continuar para o Sistema'}
          </Button>
        </div>
      </div>
    </div>
  );
};
