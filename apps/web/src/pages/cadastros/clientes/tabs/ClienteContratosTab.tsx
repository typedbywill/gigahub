import React from 'react';
import { LuFileText } from 'react-icons/lu';
import { useCustomerContext } from '../CustomerContext';
import { StatusBadge, type StatusBadgeVariant } from '../../../../shared/ui/StatusBadge';

function formatDate(value?: string): string {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getContractStatusBadge(status?: string): { label: string; variant: StatusBadgeVariant } {
  const normalized = (status ?? '').toUpperCase();
  if (normalized === 'A' || normalized === 'ATIVO' || normalized === 'ACTIVE') {
    return { label: 'Ativo', variant: 'success' };
  }
  if (normalized === 'C' || normalized === 'CANCELADO' || normalized === 'CANCELLED') {
    return { label: 'Cancelado', variant: 'neutral' };
  }
  if (normalized === 'B' || normalized === 'BLOQUEADO' || normalized === 'BLOCKED') {
    return { label: 'Bloqueado', variant: 'danger' };
  }
  return { label: status || 'Desconhecido', variant: 'warning' };
}

export const ClienteContratosTab: React.FC = () => {
  const { consultation, loading } = useCustomerContext();
  const contratos = consultation?.data?.contratos?.items ?? [];
  const total = consultation?.data?.contratos?.total ?? contratos.length;

  if (loading && contratos.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted">
        Carregando contratos…
      </div>
    );
  }

  if (contratos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
        <LuFileText className="size-10 text-muted/60" />
        <h3 className="mt-3 text-sm font-semibold text-foreground">Nenhum contrato encontrado</h3>
        <p className="mt-1 text-xs text-muted">
          Este cliente não possui contratos cadastrados no momento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            Contratos Vinculados ({total})
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/80 bg-default/40 text-xs font-semibold text-muted uppercase">
              <tr>
                <th className="px-5 py-3.5">ID ERP</th>
                <th className="px-5 py-3.5">ID GigaHub</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Data de Ativação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {contratos.map((contrato) => {
                const statusBadge = getContractStatusBadge(contrato.status);
                return (
                  <tr
                    key={contrato.id}
                    className="transition-colors hover:bg-default/30"
                  >
                    <td className="px-5 py-4 font-mono font-medium text-foreground">
                      #{contrato.idErp}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-muted truncate max-w-[180px]">
                      {contrato.id}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge variant={statusBadge.variant}>
                        {statusBadge.label}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted">
                      {formatDate(contrato.activatedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
