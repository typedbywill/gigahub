import React, { useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { LuCalendarClock, LuX } from 'react-icons/lu';
import type { WorkOrderSummaryDto } from '@gigahub/shared/contracts';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: WorkOrderSummaryDto | null;
  onConfirm: (data: { newDate: string; reason: string }) => Promise<void>;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  onConfirm,
}) => {
  const [newDate, setNewDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setNewDate('');
      setReason('');
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen || !workOrder) return null;

  const isFormValid = newDate.trim().length > 0 && reason.trim().length >= 5;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isFormValid) return;
    try {
      setLoading(true);
      setError(null);
      await onConfirm({
        newDate: newDate.trim(),
        reason: reason.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Falha ao reagendar OS');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <LuCalendarClock className="size-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Reagendar OS #{workOrder.idErp}
              </h3>
              <p className="text-xs text-muted">{workOrder.customerName}</p>
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
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Nova Data e Horário
            </label>
            <input
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Motivo do Reagendamento
            </label>
            <textarea
              placeholder="Ex: Cliente solicitou alteração para o período da tarde."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" size="sm" onPress={onClose} isDisabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              color="danger"
              size="sm"
              isLoading={loading}
              isDisabled={!isFormValid}
            >
              Confirmar Reagendamento
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
