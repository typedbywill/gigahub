import React, { useCallback, useEffect, useState } from 'react';
import { Button, Spinner, Switch } from '@heroui/react';
import {
  LuActivity,
  LuPlay,
  LuRefreshCw,
  LuWrench,
} from 'react-icons/lu';
import type { WorkOrderSummaryDto } from '@gigahub/shared/contracts';
import { useAuthStore } from '../../shared/stores/auth.store';
import {
  listActiveWorkOrders,
  rescheduleWorkOrder,
  startWorkOrderDisplacement,
  startWorkOrderExecution,
} from '../../shared/api/work-orders.api';
import { useGeolocation } from '../../shared/hooks/use-geolocation';
import { toast } from '../../shared/ui/toast';
import { WorkOrderCard } from './components/WorkOrderCard';
import { StartExecutionModal } from './components/StartExecutionModal';
import { RescheduleModal } from './components/RescheduleModal';

export const EmAndamentoPage: React.FC = () => {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [workOrders, setWorkOrders] = useState<WorkOrderSummaryDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [onlyMine, setOnlyMine] = useState<boolean>(false);
  const [displacingId, setDisplacingId] = useState<string | null>(null);

  const [executingOrder, setExecutingOrder] = useState<WorkOrderSummaryDto | null>(null);
  const [reschedulingOrder, setReschedulingOrder] = useState<WorkOrderSummaryDto | null>(null);

  const { getCurrentLocation } = useGeolocation();

  const loadActive = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      const data = await listActiveWorkOrders(accessToken, onlyMine);
      setWorkOrders(data);
    } catch (err: any) {
      toast.error('Erro ao carregar OSs em andamento', {
        description: err?.message || 'Verifique sua conexão.',
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken, onlyMine]);

  useEffect(() => {
    void loadActive();
  }, [loadActive]);

  const handleStartDisplacement = async (wo: WorkOrderSummaryDto) => {
    if (!accessToken) return;
    try {
      setDisplacingId(wo.idErp);
      const loc = await getCurrentLocation();
      await startWorkOrderDisplacement(accessToken, wo.idErp, {
        location: loc ?? undefined,
      });
      toast.success(`Deslocamento iniciado para OS #${wo.idErp}!`);
      await loadActive();
    } catch (err: any) {
      toast.error('Erro ao iniciar deslocamento', {
        description: err?.message || 'Falha ao registrar no IXC.',
      });
    } finally {
      setDisplacingId(null);
    }
  };

  const handleConfirmExecution = async (data: {
    estimatedDurationMinutes: number;
    reason: string;
  }) => {
    if (!accessToken || !executingOrder) return;
    const loc = await getCurrentLocation();
    await startWorkOrderExecution(accessToken, executingOrder.idErp, {
      ...data,
      location: loc ?? undefined,
    });
    toast.success(`Execução iniciada para OS #${executingOrder.idErp}!`);
    await loadActive();
  };

  const handleConfirmReschedule = async (data: {
    newDate: string;
    reason: string;
  }) => {
    if (!accessToken || !reschedulingOrder) return;
    await rescheduleWorkOrder(accessToken, reschedulingOrder.idErp, data);
    toast.success(`OS #${reschedulingOrder.idErp} reagendada!`);
    await loadActive();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Em Andamento
            </h1>
            <span className="flex size-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <p className="text-xs text-muted md:text-sm">
            Monitoramento de ordens de serviço atualmente em deslocamento ou execução.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-1.5 shadow-xs">
            <span className="text-xs font-medium text-foreground">
              Somente minhas
            </span>
            <Switch
              size="sm"
              isSelected={onlyMine}
              onValueChange={setOnlyMine}
              aria-label="Filtrar somente minhas OSs"
            />
          </div>

          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label="Atualizar"
            title="Atualizar lista"
            onPress={() => void loadActive()}
            isLoading={loading}
          >
            <LuRefreshCw className="size-4" />
          </Button>
        </div>
      </div>

      {/* Grid de OSs em andamento */}
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted">
          <Spinner size="lg" />
          <p className="text-xs">Carregando ordens de serviço ativas…</p>
        </div>
      ) : workOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/10 text-muted">
            <LuActivity className="size-6" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-foreground">
            Nenhuma OS em andamento no momento
          </h3>
          <p className="mt-1 max-w-sm text-xs text-muted">
            {onlyMine
              ? 'Você não possui nenhum deslocamento ou atendimento em execução aberto no momento.'
              : 'Nenhum técnico está em deslocamento ou execução no momento.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workOrders.map((wo) => (
            <WorkOrderCard
              key={wo.id}
              workOrder={wo}
              isDisplacingLoading={displacingId === wo.idErp}
              onStartDisplacement={handleStartDisplacement}
              onStartExecution={(order) => setExecutingOrder(order)}
              onReschedule={(order) => setReschedulingOrder(order)}
            />
          ))}
        </div>
      )}

      <StartExecutionModal
        isOpen={Boolean(executingOrder)}
        onClose={() => setExecutingOrder(null)}
        workOrder={executingOrder}
        onConfirm={handleConfirmExecution}
      />

      <RescheduleModal
        isOpen={Boolean(reschedulingOrder)}
        onClose={() => setReschedulingOrder(null)}
        workOrder={reschedulingOrder}
        onConfirm={handleConfirmReschedule}
      />
    </div>
  );
};
export default EmAndamentoPage;
