import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Spinner } from '@heroui/react';
import { LuChevronRight, LuRefreshCw, LuWrench } from 'react-icons/lu';
import type { WorkOrderSummaryDto } from '@gigahub/shared/contracts';
import { useAuthStore } from '../../../../shared/stores/auth.store';
import { listCustomerWorkOrders } from '../../../../shared/api/work-orders.api';
import { routes } from '../../../../shared/routes';
import { useCustomerContext } from '../CustomerContext';
import { WorkOrderStatusChip } from '../../../os/components/WorkOrderStatusChip';

export const ClienteOrdensServicoTab: React.FC = () => {
  const { consultation, loading: customerLoading } = useCustomerContext();
  const cliente = consultation?.data?.cadastro;
  const accessToken = useAuthStore((s) => s.accessToken);

  const [orders, setOrders] = useState<WorkOrderSummaryDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadCustomerOrders = async () => {
    if (!accessToken || !cliente?.idErp) return;
    try {
      setLoading(true);
      const data = await listCustomerWorkOrders(accessToken, cliente.idErp);
      setOrders(data);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cliente?.idErp) {
      void loadCustomerOrders();
    }
  }, [cliente?.idErp, accessToken]);

  if (customerLoading && !cliente) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted">
        Carregando ordens de serviço…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            Ordens de Serviço e Atendimentos
          </h3>
          <p className="text-xs text-muted">
            Histórico de manutenções, instalações e chamados de suporte técnico do assinante no IXC.
          </p>
        </div>

        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label="Recarregar"
          title="Recarregar histórico"
          onPress={() => void loadCustomerOrders()}
          isLoading={loading}
        >
          <LuRefreshCw className="size-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted">
          <Spinner size="md" />
          <span className="text-xs">Carregando ordens de serviço…</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
          <LuWrench className="size-10 text-muted/60" />
          <h3 className="mt-3 text-sm font-semibold text-foreground">
            Nenhuma ordem de serviço registrada
          </h3>
          <p className="mt-1 max-w-sm text-xs text-muted">
            Não há histórico de ordens de serviço no ERP para este cliente.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-background/50 text-[11px] font-semibold uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">OS</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assunto</th>
                  <th className="px-4 py-3">Técnico</th>
                  <th className="px-4 py-3">Data Agendada</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map((wo) => (
                  <tr key={wo.id} className="transition hover:bg-background/40">
                    <td className="px-4 py-3 font-mono font-semibold text-accent">
                      #{wo.idErp}
                    </td>
                    <td className="px-4 py-3">
                      <WorkOrderStatusChip status={wo.status} />
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {wo.subjectName || 'Atendimento'}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {wo.technicianName || '—'}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {wo.scheduledAt
                        ? new Date(wo.scheduledAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={routes.osDetalhe(wo.idErp)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition hover:border-foreground/20 hover:text-accent"
                      >
                        <span>Abrir</span>
                        <LuChevronRight className="size-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
