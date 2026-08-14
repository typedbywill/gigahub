import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useParams } from 'react-router-dom';
import {
  LuFileText,
  LuLayoutDashboard,
  LuNetwork,
  LuReceipt,
  LuWrench,
} from 'react-icons/lu';
import { PageContainer } from '../../../shared/components/PageHeader';
import { useAuthStore } from '../../../shared/stores/auth.store';
import { getCustomerConsultationRequest } from '../../../shared/api/clientes.api';
import type { CustomerConsultationResponseDto } from '@gigahub/shared/contracts';
import { toast } from '../../../shared/ui/toast';
import { ClienteDetailHeader } from './ClienteDetailHeader';
import { CustomerContext } from './CustomerContext';

const TABS = [
  { label: 'Visão Geral', path: 'visao-geral', icon: <LuLayoutDashboard className="size-4" /> },
  { label: 'Contratos', path: 'contratos', icon: <LuFileText className="size-4" /> },
  { label: 'Financeiro', path: 'financeiro', icon: <LuReceipt className="size-4" /> },
  { label: 'Logins & Fibra', path: 'logins', icon: <LuNetwork className="size-4" /> },
  { label: 'Ordens de Serviço', path: 'ordens-de-servico', icon: <LuWrench className="size-4" /> },
];

export const ClienteLayoutPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);
  const location = useLocation();

  const [consultation, setConsultation] =
    useState<CustomerConsultationResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCliente = useCallback(async () => {
    if (!id || !accessToken) return;
    setLoading(true);
    setError(null);

    try {
      const res = await getCustomerConsultationRequest(accessToken, id, {
        include: [
          'cadastro',
          'contratos',
          'logins',
          'fibra',
          'sinal',
          'fibraHistorico',
          'faturas',
          'comodatos',
          'senhasWifi',
          'acessoRemoto',
        ],
      });
      setConsultation(res);
    } catch (err: any) {
      const msg = err?.message || 'Falha ao carregar dados do cliente';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [id, accessToken]);

  useEffect(() => {
    void fetchCliente();
  }, [fetchCliente]);

  const cliente = consultation?.data?.cadastro ?? null;

  return (
    <CustomerContext.Provider
      value={{
        customerId: id ?? '',
        consultation,
        loading,
        error,
        refetch: fetchCliente,
      }}
    >
      <PageContainer>
        <div className="space-y-6">
          {/* Cabeçalho do Cliente */}
          <ClienteDetailHeader
            cliente={cliente}
            loading={loading}
            onRefresh={fetchCliente}
          />

          {/* Barra de Abas / Tabs de Navegação */}
          <div className="border-b border-border">
            <nav
              className="-mb-px flex space-x-2 overflow-x-auto sm:space-x-4"
              aria-label="Abas do Cliente"
            >
              {TABS.map((tab) => (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'border-accent text-accent'
                        : 'border-transparent text-muted hover:border-border hover:text-foreground'
                    }`
                  }
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Conteúdo Dinâmico das Sub-Rotas */}
          <div className="pt-2">
            <Outlet />
          </div>
        </div>
      </PageContainer>
    </CustomerContext.Provider>
  );
};
