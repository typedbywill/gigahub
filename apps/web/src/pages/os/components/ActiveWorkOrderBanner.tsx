import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@heroui/react';
import {
  LuCar,
  LuClock,
  LuExternalLink,
  LuMapPin,
  LuPhone,
  LuPlay,
  LuWrench,
} from 'react-icons/lu';
import { FaWhatsapp } from 'react-icons/fa';
import type { WorkOrderSummaryDto } from '@gigahub/shared/contracts';
import { routes } from '../../../shared/routes';
import {
  getGoogleMapsUrl,
  getTelUrl,
  getWazeUrl,
  getWhatsAppUrl,
} from '../../../shared/lib/geo-navigation';
import { WorkOrderStatusChip } from './WorkOrderStatusChip';

interface ActiveWorkOrderBannerProps {
  workOrder: WorkOrderSummaryDto;
  onStartExecutionClick: (wo: WorkOrderSummaryDto) => void;
}

function formatElapsed(startDateStr?: string): string {
  if (!startDateStr) return '0 min';
  const start = new Date(startDateStr).getTime();
  if (Number.isNaN(start)) return '0 min';
  const now = Date.now();
  const diffMs = Math.max(0, now - start);
  const totalMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins} min`;
}

export const ActiveWorkOrderBanner: React.FC<ActiveWorkOrderBannerProps> = ({
  workOrder,
  onStartExecutionClick,
}) => {
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState<string>('');

  const isDisplacement = workOrder.status === 'DS';
  const isExecution = workOrder.status === 'EX';

  useEffect(() => {
    const timeRef = isExecution
      ? workOrder.executionStartedAt
      : workOrder.displacementStartedAt || workOrder.updatedAt;

    setElapsed(formatElapsed(timeRef));

    const timer = setInterval(() => {
      setElapsed(formatElapsed(timeRef));
    }, 15000);

    return () => clearInterval(timer);
  }, [isExecution, workOrder]);

  const wazeUrl = getWazeUrl(
    workOrder.location?.latitude,
    workOrder.location?.longitude,
    workOrder.customerAddress,
  );
  const mapsUrl = getGoogleMapsUrl(
    workOrder.location?.latitude,
    workOrder.location?.longitude,
    workOrder.customerAddress,
  );
  const waUrl = getWhatsAppUrl(
    workOrder.customerPhone,
    `Olá, aqui é o técnico da Giganet sobre sua ordem de serviço #${workOrder.idErp}.`,
  );
  const telUrl = getTelUrl(workOrder.customerPhone);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-surface p-4 shadow-sm md:p-5">
      {/* Indicador de barra de progresso / acento */}
      <div
        className={`absolute inset-x-0 top-0 h-1.5 ${
          isExecution
            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
            : 'bg-gradient-to-r from-orange-500 to-amber-400'
        }`}
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <WorkOrderStatusChip status={workOrder.status} />
            <span className="text-xs font-mono font-semibold text-muted">
              OS #{workOrder.idErp}
            </span>
            <div className="flex items-center gap-1 rounded-md bg-muted/10 px-2 py-0.5 text-xs font-medium text-foreground">
              <LuClock className="size-3 text-muted" />
              <span>{elapsed} decorridos</span>
            </div>
          </div>

          <h3 className="truncate text-base font-bold text-foreground">
            {workOrder.customerName}
          </h3>

          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-muted">
            <span className="font-medium text-foreground/80">
              {workOrder.subjectName || 'Atendimento em Campo'}
            </span>
            {workOrder.customerAddress && (
              <span className="flex items-center gap-1">
                <LuMapPin className="size-3.5 shrink-0 text-muted" />
                <span className="truncate">{workOrder.customerAddress}</span>
              </span>
            )}
          </div>
        </div>

        {/* Ações de navegação rápida e transição */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border md:border-t-0 md:pt-0">
          {workOrder.customerPhone && (
            <>
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Abrir WhatsApp com cliente"
                className="flex size-9 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 transition hover:bg-emerald-500/20 dark:text-emerald-400"
              >
                <FaWhatsapp className="size-4" />
              </a>
              <a
                href={telUrl}
                aria-label="Ligar para cliente"
                className="flex size-9 items-center justify-center rounded-xl border border-border bg-surface text-muted transition hover:border-foreground/20 hover:text-foreground"
              >
                <LuPhone className="size-4" />
              </a>
            </>
          )}

          <a
            href={wazeUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Navegar com Waze"
            className="flex items-center gap-1.5 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-600 transition hover:bg-sky-500/20 dark:text-sky-400"
          >
            <LuCar className="size-3.5" />
            <span>Waze</span>
          </a>

          {isDisplacement && (
            <Button
              color="success"
              size="sm"
              className="font-semibold shadow-xs"
              startContent={<LuPlay className="size-4" />}
              onPress={() => onStartExecutionClick(workOrder)}
            >
              Iniciar Execução
            </Button>
          )}

          {isExecution && (
            <Button
              color="accent"
              size="sm"
              className="font-semibold shadow-xs"
              startContent={<LuWrench className="size-4" />}
              onPress={() => navigate(routes.osDetalhe(workOrder.idErp))}
            >
              Continuar Atendimento
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
