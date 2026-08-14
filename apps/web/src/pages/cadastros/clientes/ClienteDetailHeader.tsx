import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Button } from '@heroui/react';
import {
  LuArrowLeft,
  LuBuilding2,
  LuCheck,
  LuCopy,
  LuExternalLink,
  LuIdCard,
  LuMail,
  LuPhone,
  LuRefreshCw,
  LuUser,
} from 'react-icons/lu';
import type { CustomerDto } from '@gigahub/shared/contracts';
import { routes } from '../../../shared/routes';
import { StatusBadge, type StatusBadgeVariant } from '../../../shared/ui/StatusBadge';
import { toast } from '../../../shared/ui/toast';
import { getAvatarColor } from '../../../shared/lib/avatar-color';

export interface ClienteDetailHeaderProps {
  cliente: CustomerDto | null;
  loading: boolean;
  onRefresh: () => void;
  backTo?: string;
}

function formatCpfCnpj(value?: string): string {
  if (!value) return '-';
  const clean = value.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
}

function formatPhone(value?: string): string {
  if (!value) return '-';
  const clean = value.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return value;
}

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (!first) return '?';
  if (parts.length === 1 || !last) return first.substring(0, 2).toUpperCase();
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

function getStatusBadge(status?: CustomerDto['status']): { label: string; variant: StatusBadgeVariant } {
  switch (status) {
    case 'active':
      return { label: 'Ativo', variant: 'success' };
    case 'blocked':
      return { label: 'Bloqueado', variant: 'danger' };
    case 'cancelled':
      return { label: 'Cancelado', variant: 'neutral' };
    case 'inactive':
    default:
      return { label: 'Inativo', variant: 'warning' };
  }
}

export const ClienteDetailHeader: React.FC<ClienteDetailHeaderProps> = ({
  cliente,
  loading,
  onRefresh,
  backTo = routes.cadastrosClientes,
}) => {
  const [copiedDoc, setCopiedDoc] = useState(false);

  const handleCopyDoc = () => {
    if (!cliente?.document) return;
    void navigator.clipboard.writeText(cliente.document);
    setCopiedDoc(true);
    toast.success('Documento copiado!');
    setTimeout(() => setCopiedDoc(false), 2000);
  };

  const avatarColor = cliente ? getAvatarColor(cliente.idErp || cliente.name) : null;
  const statusInfo = getStatusBadge(cliente?.status);

  return (
    <div className="flex flex-col gap-4">
      {/* Navegação e ações superiores */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-default hover:text-foreground"
          >
            <LuArrowLeft className="size-4" />
            <span>Voltar para Clientes</span>
          </Link>
          <span>/</span>
          <span className="font-medium text-foreground truncate max-w-[240px]">
            {cliente?.name ?? (loading ? 'Carregando…' : 'Cliente')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            onPress={onRefresh}
            isDisabled={loading}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <LuRefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Cartão principal do cabeçalho */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs transition-all md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <Avatar
              className={`size-14 shrink-0 text-base font-semibold ${
                avatarColor ? `${avatarColor.bg} ${avatarColor.text}` : ''
              }`}
            >
              <Avatar.Fallback className={avatarColor?.text}>
                {cliente ? userInitials(cliente.name) : '?'}
              </Avatar.Fallback>
            </Avatar>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="truncate text-xl font-bold tracking-tight text-foreground md:text-2xl">
                  {cliente?.name ?? (loading ? 'Carregando cliente…' : 'Cliente não encontrado')}
                </h1>
                {cliente ? (
                  <StatusBadge variant={statusInfo.variant}>
                    {statusInfo.label}
                  </StatusBadge>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
                {cliente?.idErp ? (
                  <div className="flex items-center gap-1 font-mono">
                    <span className="rounded bg-default/80 px-1.5 py-0.5 font-medium text-foreground">
                      ID ERP: {cliente.idErp}
                    </span>
                  </div>
                ) : null}

                {cliente?.document ? (
                  <button
                    type="button"
                    onClick={handleCopyDoc}
                    title="Copiar documento"
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-default hover:text-foreground"
                  >
                    <LuIdCard className="size-3.5 text-accent" />
                    <span className="font-mono">{formatCpfCnpj(cliente.document)}</span>
                    {copiedDoc ? (
                      <LuCheck className="size-3 text-success" />
                    ) : (
                      <LuCopy className="size-3 text-muted/60" />
                    )}
                  </button>
                ) : null}

                {cliente?.phone ? (
                  <a
                    href={`tel:${cliente.phone.replace(/\D/g, '')}`}
                    className="flex items-center gap-1 transition-colors hover:text-accent"
                  >
                    <LuPhone className="size-3.5 text-accent" />
                    <span>{formatPhone(cliente.phone)}</span>
                  </a>
                ) : null}

                {cliente?.email ? (
                  <a
                    href={`mailto:${cliente.email}`}
                    className="flex items-center gap-1 transition-colors hover:text-accent"
                  >
                    <LuMail className="size-3.5 text-accent" />
                    <span>{cliente.email}</span>
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
