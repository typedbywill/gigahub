import React from 'react';
import { Chip } from '@heroui/react';
import type { WorkOrderStatus } from '@gigahub/shared/contracts';

interface WorkOrderStatusChipProps {
  status: WorkOrderStatus;
  className?: string;
}

export const WORK_ORDER_STATUS_MAP: Record<
  WorkOrderStatus,
  { label: string; color: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'; badgeClass: string }
> = {
  A: { label: 'Aberta', color: 'default', badgeClass: 'bg-muted/10 text-muted border-border' },
  AN: { label: 'Em Análise', color: 'warning', badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  EN: { label: 'Encaminhada', color: 'secondary', badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  AS: { label: 'Assumida', color: 'primary', badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  AG: { label: 'Agendada', color: 'primary', badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
  DS: { label: 'Deslocamento', color: 'warning', badgeClass: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30 animate-pulse' },
  EX: { label: 'Em Execução', color: 'success', badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  F: { label: 'Finalizada', color: 'success', badgeClass: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20' },
  RAG: { label: 'Reagendamento', color: 'danger', badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
};

export const WorkOrderStatusChip: React.FC<WorkOrderStatusChipProps> = ({
  status,
  className,
}) => {
  const conf = WORK_ORDER_STATUS_MAP[status] ?? {
    label: status,
    color: 'default',
    badgeClass: 'bg-muted/10 text-muted border-border',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${conf.badgeClass} ${className ?? ''}`}
    >
      {status === 'EX' && (
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
      )}
      {status === 'DS' && (
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-orange-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-orange-500" />
        </span>
      )}
      {conf.label}
    </span>
  );
};
