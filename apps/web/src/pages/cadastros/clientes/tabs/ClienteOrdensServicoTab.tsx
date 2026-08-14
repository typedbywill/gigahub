import React from 'react';
import { LuWrench } from 'react-icons/lu';
import { useCustomerContext } from '../CustomerContext';

export const ClienteOrdensServicoTab: React.FC = () => {
  const { consultation, loading } = useCustomerContext();
  const cliente = consultation?.data?.cadastro;

  if (loading && !cliente) {
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
            Histórico de manutenções, instalações e chamados de suporte técnico do assinante.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
        <LuWrench className="size-10 text-muted/60" />
        <h3 className="mt-3 text-sm font-semibold text-foreground">
          Nenhuma ordem de serviço pendente
        </h3>
        <p className="mt-1 text-xs text-muted max-w-sm">
          Não há ordens de serviço abertas ou pendentes de atendimento para este cliente no momento.
        </p>
      </div>
    </div>
  );
};
