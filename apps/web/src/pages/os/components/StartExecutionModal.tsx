import React, { useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { LuClock, LuPlay, LuWrench, LuX } from 'react-icons/lu';
import type { WorkOrderSummaryDto } from '@gigahub/shared/contracts';

interface StartExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: WorkOrderSummaryDto | null;
  onConfirm: (data: { estimatedDurationMinutes: number; reason: string }) => Promise<void>;
}

const PRESET_DURATIONS = [
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hora', value: 60 },
  { label: '1h 30m', value: 90 },
  { label: '2 horas', value: 120 },
];

export const StartExecutionModal: React.FC<StartExecutionModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  onConfirm,
}) => {
  const [duration, setDuration] = useState<number>(45);
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setReason('');
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen || !workOrder) return null;

  const isReasonValid = reason.trim().length >= 11;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isReasonValid) return;
    try {
      setLoading(true);
      setError(null);
      await onConfirm({
        estimatedDurationMinutes: duration,
        reason: reason.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Falha ao iniciar execução');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <LuPlay className="size-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Iniciar Execução da OS #{workOrder.idErp}
              </h3>
              <p className="text-xs text-muted">
                {workOrder.customerName} • {workOrder.subjectName || 'Atendimento'}
              </p>
            </div>
          </div>

          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label="Fechar"
            onPress={onClose}
          >
            <LuX className="size-4" />
          </Button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && (
            <div className="rounded-xl border border-danger/20 bg-danger/10 p-3 text-xs text-danger">
              {error}
            </div>
          )}

          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <LuClock className="size-3.5 text-muted" /> Previsão de Tempo de Atendimento
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_DURATIONS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setDuration(preset.value)}
                  className={`rounded-xl border px-3.5 py-1.5 text-xs font-medium transition ${
                    duration === preset.value
                      ? 'border-accent bg-accent text-accent-foreground shadow-xs'
                      : 'border-border bg-background text-muted hover:border-foreground/30 hover:text-foreground'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <LuWrench className="size-3.5 text-muted" /> Motivo / Diagnóstico Inicial
              </label>
              <span
                className={`text-[11px] font-mono font-semibold ${
                  isReasonValid ? 'text-emerald-500' : 'text-amber-500'
                }`}
              >
                {reason.trim().length}/11 mín.
              </span>
            </div>
            <textarea
              placeholder="Ex: Cheguei no local do cliente para verificar conector da ONU e sinal óptico."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-accent leading-relaxed"
            />
            <p className="mt-1 text-[11px] text-muted">
              Descreva o que será realizado (mínimo de 11 caracteres para registrar no IXC).
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" size="sm" onPress={onClose} isDisabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              color="success"
              size="sm"
              isLoading={loading}
              isDisabled={!isReasonValid}
              startContent={!loading && <LuPlay className="size-4" />}
            >
              Confirmar e Iniciar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
