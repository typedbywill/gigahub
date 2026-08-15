import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@heroui/react';
import {
  LuCalendarClock,
  LuCar,
  LuClock,
  LuExternalLink,
  LuMapPin,
  LuPhone,
  LuPlay,
  LuSend,
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

interface WorkOrderCardProps {
  workOrder: WorkOrderSummaryDto;
  onStartDisplacement: (wo: WorkOrderSummaryDto) => void;
  onStartExecution: (wo: WorkOrderSummaryDto) => void;
  onReschedule: (wo: WorkOrderSummaryDto) => void;
  isDisplacingLoading?: boolean;
}

function formatTimeOnly(dateStr?: string): string {
  if (!dateStr) return '--:--';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const WorkOrderCard: React.FC<WorkOrderCardProps> = ({
  workOrder,
  onStartDisplacement,
  onStartExecution,
  onReschedule,
  isDisplacingLoading = false,
}) => {
  const navigate = useNavigate();

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

  const isAgendada = workOrder.status === 'AG';
  const isDeslocamento = workOrder.status === 'DS';
  const isExecucao = workOrder.status === 'EX';
  const isFinalizada = workOrder.status === 'F';

  return (
    <div className="group flex flex-col justify-between rounded-2xl border border-border bg-surface p-4 transition hover:border-foreground/20 hover:shadow-sm">
      <div className="space-y-3">
        {/* Header: Horário, Status e Protocolo */}
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground">
            <LuClock className="size-3.5 text-muted" />
            <span>{formatTimeOnly(workOrder.scheduledAt)}</span>
          </div>

          <div className="flex items-center gap-2">
            <WorkOrderStatusChip status={workOrder.status} />
            <Link
              to={routes.osDetalhe(workOrder.idErp)}
              className="text-xs font-mono font-medium text-muted transition hover:text-accent"
              title="Ver detalhes da OS"
            >
              #{workOrder.idErp}
            </Link>
          </div>
        </div>

        {/* Cliente & Assunto */}
        <div>
          <Link
            to={routes.osDetalhe(workOrder.idErp)}
            className="block text-sm font-semibold text-foreground transition hover:text-accent"
          >
            {workOrder.customerName}
          </Link>
          <div className="mt-0.5 text-xs text-muted">
            <span className="font-medium text-foreground/80">
              {workOrder.subjectName || 'Atendimento em Campo'}
            </span>
            {workOrder.priority && (
              <span className="ml-1.5 rounded bg-muted/10 px-1.5 py-0.2 text-[10px] uppercase font-bold text-muted">
                {workOrder.priority}
              </span>
            )}
          </div>
        </div>

        {/* Endereço */}
        {workOrder.customerAddress && (
          <div className="flex items-start gap-1.5 text-xs text-muted">
            <LuMapPin className="mt-0.5 size-3.5 shrink-0 text-muted/70" />
            <span className="line-clamp-2 leading-relaxed">
              {workOrder.customerAddress}
              {workOrder.customerNeighborhood ? ` - ${workOrder.customerNeighborhood}` : ''}
              {workOrder.customerCity ? `, ${workOrder.customerCity}` : ''}
            </span>
          </div>
        )}

        {/* Descrição / Mensagem de abertura */}
        {workOrder.description && (
          <p className="line-clamp-2 rounded-lg bg-background/60 p-2 text-xs text-muted/90 italic">
            "{workOrder.description}"
          </p>
        )}
      </div>

      {/* Footer com Ações */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
        {/* Contato & Navegação */}
        <div className="flex items-center gap-1.5">
          {workOrder.customerPhone && (
            <>
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                title="Conversar no WhatsApp"
                className="flex size-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 transition hover:bg-emerald-500/20 dark:text-emerald-400"
              >
                <FaWhatsapp className="size-3.5" />
              </a>
              <a
                href={telUrl}
                aria-label="Ligar"
                title="Ligar para cliente"
                className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted transition hover:border-foreground/20 hover:text-foreground"
              >
                <LuPhone className="size-3.5" />
              </a>
            </>
          )}

          <a
            href={wazeUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Abrir no Waze"
            title="Abrir no Waze"
            className="flex size-8 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-600 transition hover:bg-sky-500/20 dark:text-sky-400"
          >
            <LuCar className="size-3.5" />
          </a>

          {!isFinalizada && (
            <button
              type="button"
              onClick={() => onReschedule(workOrder)}
              aria-label="Reagendar"
              title="Reagendar OS"
              className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted transition hover:border-foreground/20 hover:text-foreground"
            >
              <LuCalendarClock className="size-3.5" />
            </button>
          )}
        </div>

        {/* Botão de Ação Primária */}
        <div>
          {isAgendada && (
            <Button
              size="sm"
              color="warning"
              variant="flat"
              className="font-semibold"
              isLoading={isDisplacingLoading}
              startContent={!isDisplacingLoading && <LuCar className="size-3.5" />}
              onPress={() => onStartDisplacement(workOrder)}
            >
              Iniciar Deslocamento
            </Button>
          )}

          {isDeslocamento && (
            <Button
              size="sm"
              color="success"
              className="font-semibold shadow-xs"
              startContent={<LuPlay className="size-3.5" />}
              onPress={() => onStartExecution(workOrder)}
            >
              Iniciar Execução
            </Button>
          )}

          {isExecucao && (
            <Button
              size="sm"
              color="accent"
              className="font-semibold shadow-xs"
              startContent={<LuWrench className="size-3.5" />}
              onPress={() => navigate(routes.osDetalhe(workOrder.idErp))}
            >
              Continuar
            </Button>
          )}

          {isFinalizada && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-muted"
              onPress={() => navigate(routes.osDetalhe(workOrder.idErp))}
            >
              Ver Detalhes
            </Button>
          )}

          {!isAgendada && !isDeslocamento && !isExecucao && !isFinalizada && (
            <Button
              size="sm"
              variant="flat"
              onPress={() => navigate(routes.osDetalhe(workOrder.idErp))}
            >
              Abrir OS
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
