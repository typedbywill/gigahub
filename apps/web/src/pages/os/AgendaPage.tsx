import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Spinner } from '@heroui/react';
import {
  LuCalendar,
  LuChevronLeft,
  LuChevronRight,
  LuListFilter,
  LuRefreshCw,
  LuSearch,
  LuWrench,
} from 'react-icons/lu';
import type { WorkOrderStatus, WorkOrderSummaryDto } from '@gigahub/shared/contracts';
import { useAuthStore } from '../../shared/stores/auth.store';
import {
  getMySchedule,
  rescheduleWorkOrder,
  startWorkOrderDisplacement,
  startWorkOrderExecution,
} from '../../shared/api/work-orders.api';
import { useGeolocation } from '../../shared/hooks/use-geolocation';
import { toast } from '../../shared/ui/toast';
import { ActiveWorkOrderBanner } from './components/ActiveWorkOrderBanner';
import { WorkOrderCard } from './components/WorkOrderCard';
import { StartExecutionModal } from './components/StartExecutionModal';
import { RescheduleModal } from './components/RescheduleModal';

function toYmd(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const AgendaPage: React.FC = () => {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [selectedDate, setSelectedDate] = useState<string>(() => toYmd(new Date()));
  const [workOrders, setWorkOrders] = useState<WorkOrderSummaryDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [displacingId, setDisplacingId] = useState<string | null>(null);

  // Modais
  const [executingOrder, setExecutingOrder] = useState<WorkOrderSummaryDto | null>(null);
  const [reschedulingOrder, setReschedulingOrder] = useState<WorkOrderSummaryDto | null>(null);

  const { getCurrentLocation } = useGeolocation();

  const loadSchedule = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      const data = await getMySchedule(accessToken, { date: selectedDate });
      setWorkOrders(data);
    } catch (err: any) {
      toast.error('Erro ao carregar agenda', {
        description: err?.message || 'Verifique sua conexão e tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedDate]);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  // Navegação de dias
  const changeDay = (delta: number) => {
    const current = new Date(`${selectedDate}T12:00:00`);
    current.setDate(current.getDate() + delta);
    setSelectedDate(toYmd(current));
  };

  const isToday = selectedDate === toYmd(new Date());

  // Ação: Iniciar Deslocamento
  const handleStartDisplacement = async (wo: WorkOrderSummaryDto) => {
    if (!accessToken) return;
    try {
      setDisplacingId(wo.idErp);
      toast.info('Obtendo localização GPS…');
      const loc = await getCurrentLocation();

      await startWorkOrderDisplacement(accessToken, wo.idErp, {
        location: loc ?? undefined,
      });

      toast.success(`Deslocamento iniciado para OS #${wo.idErp}!`, {
        description: 'Status sincronizado no IXC com sucesso.',
      });
      await loadSchedule();
    } catch (err: any) {
      toast.error('Erro ao iniciar deslocamento', {
        description: err?.message || 'Falha ao registrar no IXC.',
      });
    } finally {
      setDisplacingId(null);
    }
  };

  // Ação: Iniciar Execução (modal callback)
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
    toast.success(`Execução iniciada para OS #${executingOrder.idErp}!`, {
      description: 'Atendimento em andamento registrado no IXC.',
    });
    await loadSchedule();
  };

  // Ação: Reagendar (modal callback)
  const handleConfirmReschedule = async (data: {
    newDate: string;
    reason: string;
  }) => {
    if (!accessToken || !reschedulingOrder) return;
    await rescheduleWorkOrder(accessToken, reschedulingOrder.idErp, data);
    toast.success(`OS #${reschedulingOrder.idErp} reagendada!`, {
      description: 'Alteração gravada no ERP.',
    });
    await loadSchedule();
  };

  // Identifica OS ativa em andamento (DS ou EX)
  const activeOrder = useMemo(() => {
    return workOrders.find((w) => w.status === 'EX') || workOrders.find((w) => w.status === 'DS') || null;
  }, [workOrders]);

  // Contadores
  const counts = useMemo(() => {
    const res = { total: workOrders.length, ag: 0, ds: 0, ex: 0, f: 0 };
    for (const w of workOrders) {
      if (w.status === 'AG') res.ag += 1;
      else if (w.status === 'DS') res.ds += 1;
      else if (w.status === 'EX') res.ex += 1;
      else if (w.status === 'F') res.f += 1;
    }
    return res;
  }, [workOrders]);

  // Filtragem
  const filteredOrders = useMemo(() => {
    return workOrders.filter((w) => {
      if (statusFilter !== 'ALL' && w.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchProtocol = w.idErp.includes(q);
        const matchCustomer = w.customerName.toLowerCase().includes(q);
        const matchAddress = w.customerAddress?.toLowerCase().includes(q);
        const matchSubject = w.subjectName?.toLowerCase().includes(q);
        if (!matchProtocol && !matchCustomer && !matchAddress && !matchSubject) {
          return false;
        }
      }
      return true;
    });
  }, [workOrders, statusFilter, searchQuery]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-8">
      {/* Header & Seletor de Data */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Minha Agenda
          </h1>
          <p className="text-xs text-muted md:text-sm">
            Grade de ordens de serviço de campo atribuídas a você no IXC.
          </p>
        </div>

        {/* Controles de Data */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-border bg-surface p-1 shadow-xs">
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label="Dia anterior"
              onPress={() => changeDay(-1)}
            >
              <LuChevronLeft className="size-4" />
            </Button>

            <Button
              size="sm"
              variant={isToday ? 'solid' : 'ghost'}
              color={isToday ? 'accent' : 'default'}
              className="px-3 font-semibold"
              onPress={() => setSelectedDate(toYmd(new Date()))}
            >
              Hoje
            </Button>

            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label="Próximo dia"
              onPress={() => changeDay(1)}
            >
              <LuChevronRight className="size-4" />
            </Button>
          </div>

          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground shadow-xs transition hover:border-foreground/20 focus:outline-hidden focus:ring-2 focus:ring-accent"
            />
          </div>

          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label="Recarregar agenda"
            title="Recarregar agenda"
            onPress={() => void loadSchedule()}
            isLoading={loading}
          >
            <LuRefreshCw className="size-4" />
          </Button>
        </div>
      </div>

      {/* Banner de OS Ativa em Deslocamento ou Execução */}
      {activeOrder && (
        <ActiveWorkOrderBanner
          workOrder={activeOrder}
          onStartExecutionClick={(wo) => setExecutingOrder(wo)}
        />
      )}

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 shadow-xs md:flex-row md:items-center md:justify-between md:p-4">
        {/* Contadores / Abas de Status */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              statusFilter === 'ALL'
                ? 'bg-accent text-accent-foreground shadow-xs'
                : 'text-muted hover:bg-default hover:text-foreground'
            }`}
          >
            <span>Todas</span>
            <span className="rounded-full bg-background/40 px-1.5 py-0.2 text-[10px] font-bold">
              {counts.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('AG')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              statusFilter === 'AG'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-muted hover:bg-default hover:text-foreground'
            }`}
          >
            <span>Agendadas</span>
            <span className="rounded-full bg-background/40 px-1.5 py-0.2 text-[10px] font-bold">
              {counts.ag}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('DS')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              statusFilter === 'DS'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-muted hover:bg-default hover:text-foreground'
            }`}
          >
            <span>Deslocamento</span>
            <span className="rounded-full bg-background/40 px-1.5 py-0.2 text-[10px] font-bold">
              {counts.ds}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('EX')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              statusFilter === 'EX'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-muted hover:bg-default hover:text-foreground'
            }`}
          >
            <span>Execução</span>
            <span className="rounded-full bg-background/40 px-1.5 py-0.2 text-[10px] font-bold">
              {counts.ex}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('F')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              statusFilter === 'F'
                ? 'bg-zinc-600 text-white shadow-xs'
                : 'text-muted hover:bg-default hover:text-foreground'
            }`}
          >
            <span>Finalizadas</span>
            <span className="rounded-full bg-background/40 px-1.5 py-0.2 text-[10px] font-bold">
              {counts.f}
            </span>
          </button>
        </div>

        {/* Campo de Busca Rápida */}
        <div className="w-full md:w-64">
          <Input
            size="sm"
            placeholder="Buscar por cliente, OS ou endereço…"
            value={searchQuery}
            onValueChange={setSearchQuery}
            startContent={<LuSearch className="size-3.5 text-muted" />}
            isClearable
            variant="bordered"
          />
        </div>
      </div>

      {/* Listagem de Cards */}
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted">
          <Spinner size="lg" />
          <p className="text-xs">Sincronizando agenda com o IXC…</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/10 text-muted">
            <LuCalendar className="size-6" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-foreground">
            Nenhuma ordem de serviço encontrada
          </h3>
          <p className="mt-1 max-w-sm text-xs text-muted">
            {searchQuery
              ? 'Nenhuma OS corresponde aos filtros de busca informados.'
              : `Você não possui ordens de serviço agendadas para ${selectedDate}.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((wo) => (
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

      {/* Modal de Iniciar Execução */}
      <StartExecutionModal
        isOpen={Boolean(executingOrder)}
        onClose={() => setExecutingOrder(null)}
        workOrder={executingOrder}
        onConfirm={handleConfirmExecution}
      />

      {/* Modal de Reagendamento */}
      <RescheduleModal
        isOpen={Boolean(reschedulingOrder)}
        onClose={() => setReschedulingOrder(null)}
        workOrder={reschedulingOrder}
        onConfirm={handleConfirmReschedule}
      />
    </div>
  );
};
export default AgendaPage;
