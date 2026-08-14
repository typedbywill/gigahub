import React, { useMemo } from 'react';
import {
  LuCalendar,
  LuCircleCheck,
  LuCreditCard,
  LuDollarSign,
  LuReceipt,
  LuTriangleAlert,
} from 'react-icons/lu';
import { useCustomerContext } from '../CustomerContext';
import { StatusBadge, type StatusBadgeVariant } from '../../../../shared/ui/StatusBadge';

function formatCurrency(value?: number): string {
  if (value == null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

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

function getInvoiceStatusBadge(status?: string): { label: string; variant: StatusBadgeVariant } {
  const normalized = (status ?? '').toUpperCase();
  switch (normalized) {
    case 'R':
    case 'RECEBIDO':
    case 'PAGO':
      return { label: 'Pago', variant: 'success' };
    case 'A':
    case 'ABERTO':
      return { label: 'Em Aberto', variant: 'warning' };
    case 'C':
    case 'CANCELADO':
      return { label: 'Cancelado', variant: 'neutral' };
    case 'P':
    case 'PENDENTE':
      return { label: 'Pendente', variant: 'info' };
    default:
      return { label: status || 'Desconhecido', variant: 'neutral' };
  }
}

export const ClienteFinanceiroTab: React.FC = () => {
  const { consultation, loading } = useCustomerContext();
  const faturas = consultation?.data?.faturas?.items ?? [];
  const total = consultation?.data?.faturas?.total ?? faturas.length;

  const { totalAberto, countAberto } = useMemo(() => {
    let sum = 0;
    let count = 0;
    for (const fat of faturas) {
      if (fat.status === 'A' || fat.status === 'ABERTO') {
        sum += fat.openAmount ?? 0;
        count++;
      }
    }
    return { totalAberto: sum, countAberto: count };
  }, [faturas]);

  if (loading && faturas.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted">
        Carregando informações financeiras…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo Financeiro Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <LuTriangleAlert className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Títulos em Aberto</p>
              <p className="text-xl font-bold tracking-tight text-foreground">
                {countAberto} {countAberto === 1 ? 'fatura' : 'faturas'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <LuDollarSign className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Saldo em Aberto</p>
              <p className="text-xl font-bold tracking-tight text-accent">
                {formatCurrency(totalAberto)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-success/10 text-success">
              <LuReceipt className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Total de Títulos</p>
              <p className="text-xl font-bold tracking-tight text-foreground">
                {total} registros
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Faturas */}
      {faturas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
          <LuCreditCard className="size-10 text-muted/60" />
          <h3 className="mt-3 text-sm font-semibold text-foreground">
            Nenhuma fatura encontrada
          </h3>
          <p className="mt-1 text-xs text-muted">
            Este cliente não possui títulos financeiros listados.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/80 bg-default/40 text-xs font-semibold text-muted uppercase">
                <tr>
                  <th className="px-5 py-3.5">ID ERP</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Emissão</th>
                  <th className="px-5 py-3.5">Vencimento</th>
                  <th className="px-5 py-3.5 text-right">Valor em Aberto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {faturas.map((fatura) => {
                  const statusBadge = getInvoiceStatusBadge(fatura.status);
                  return (
                    <tr
                      key={fatura.id}
                      className="transition-colors hover:bg-default/30"
                    >
                      <td className="px-5 py-4 font-mono font-medium text-foreground">
                        #{fatura.idErp}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge variant={statusBadge.variant}>
                          {statusBadge.label}
                        </StatusBadge>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted">
                        {formatDate(fatura.issuedAt)}
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-foreground">
                        {formatDate(fatura.dueDate)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-semibold text-foreground">
                        {formatCurrency(fatura.openAmount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
