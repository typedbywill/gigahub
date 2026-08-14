import React, {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Dropdown, Label } from '@heroui/react';
import {
  LuArrowRight,
  LuEllipsisVertical,
  LuEye,
  LuFileText,
  LuIdCard,
  LuMapPin,
  LuNetwork,
  LuReceipt,
  LuUser,
  LuUsers,
} from 'react-icons/lu';
import type { CustomerSearchHitDto } from '@gigahub/shared/contracts';
import {
  DataTable,
  type DataTableColumn,
} from '../../../shared/components/DataTable';
import {
  PageContainer,
  PageHeader,
} from '../../../shared/components/PageHeader';
import { useAuthStore } from '../../../shared/stores/auth.store';
import { searchCustomersRequest } from '../../../shared/api/clientes.api';
import {
  clientesListHref,
  parseClientesListSearch,
  toClientesListSearchParams,
  type ClientesListSearchState,
} from './clientes-list-search';
import { routes } from '../../../shared/routes';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { getAvatarColor } from '../../../shared/lib/avatar-color';

function formatCpfCnpj(value?: string): string {
  if (!value) return '';
  const clean = value.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
}

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (!first) return '?';
  if (parts.length === 1 || !last) return first.substring(0, 2).toUpperCase();
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

const ClienteActionsCell = React.memo(function ClienteActionsCell({
  cliente,
}: {
  cliente: CustomerSearchHitDto;
}) {
  const navigate = useNavigate();

  return (
    <Dropdown>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label={`Ações de ${cliente.name}`}
      >
        <LuEllipsisVertical className="size-4" />
      </Button>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu
          aria-label={`Ações do cliente ${cliente.name}`}
          onAction={(key) => {
            if (key === 'view-visao-geral') {
              navigate(routes.cadastrosClienteVisaoGeral(cliente.idErp || cliente.id));
            } else if (key === 'view-contratos') {
              navigate(routes.cadastrosClienteContratos(cliente.idErp || cliente.id));
            } else if (key === 'view-financeiro') {
              navigate(routes.cadastrosClienteFinanceiro(cliente.idErp || cliente.id));
            } else if (key === 'view-logins') {
              navigate(routes.cadastrosClienteLogins(cliente.idErp || cliente.id));
            }
          }}
        >
          <Dropdown.Item id="view-visao-geral" textValue="Visão Geral">
            <div className="flex items-center gap-2">
              <LuEye className="size-4 text-muted" />
              <span>Visão Geral</span>
            </div>
          </Dropdown.Item>
          <Dropdown.Item id="view-contratos" textValue="Contratos">
            <div className="flex items-center gap-2">
              <LuFileText className="size-4 text-muted" />
              <span>Contratos</span>
            </div>
          </Dropdown.Item>
          <Dropdown.Item id="view-financeiro" textValue="Financeiro">
            <div className="flex items-center gap-2">
              <LuReceipt className="size-4 text-muted" />
              <span>Financeiro</span>
            </div>
          </Dropdown.Item>
          <Dropdown.Item id="view-logins" textValue="Logins e Fibra">
            <div className="flex items-center gap-2">
              <LuNetwork className="size-4 text-muted" />
              <span>Logins & Sinal Fibra</span>
            </div>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
});

export const ClientesListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useMemo(
    () => parseClientesListSearch(searchParams),
    [searchParams],
  );

  const [searchInput, setSearchInput] = useState(state.q);
  const [items, setItems] = useState<CustomerSearchHitDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accessToken = useAuthStore((s) => s.accessToken);
  const navigate = useNavigate();

  useEffect(() => {
    setSearchInput(state.q);
  }, [state.q]);

  const updateSearch = useCallback(
    (next: Partial<ClientesListSearchState>) => {
      const merged: ClientesListSearchState = { ...state, ...next };
      const nextParams = toClientesListSearchParams(merged);
      startTransition(() => {
        setSearchParams(nextParams, { replace: true });
      });
    },
    [state, setSearchParams],
  );

  const fetchClientes = useCallback(
    async (query: string) => {
      if (!accessToken) return;
      if (!query.trim() || query.trim().length < 2) {
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await searchCustomersRequest(accessToken, {
          q: query.trim(),
          limit: state.limit,
        });
        setItems(res.items ?? []);
      } catch (err: any) {
        setError(err?.message || 'Erro ao buscar clientes');
      } finally {
        setLoading(false);
      }
    },
    [accessToken, state.limit],
  );

  useEffect(() => {
    void fetchClientes(state.q);
  }, [fetchClientes, state.q]);

  const columns: DataTableColumn<CustomerSearchHitDto>[] = useMemo(
    () => [
      {
        key: 'name',
        title: 'Cliente / Razão Social',
        render: (cliente) => {
          const avatarColor = getAvatarColor(cliente.idErp || cliente.name);
          const detailUrl = routes.cadastrosClienteVisaoGeral(cliente.idErp || cliente.id);

          return (
            <Link
              to={detailUrl}
              className="flex min-w-0 items-center gap-3 py-1 transition-opacity hover:opacity-80"
            >
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarColor.bg} ${avatarColor.text}`}
              >
                {userInitials(cliente.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-foreground">
                  {cliente.name}
                </div>
                {cliente.document ? (
                  <div className="flex items-center gap-1 font-mono text-xs text-muted">
                    <LuIdCard className="size-3 text-accent" />
                    <span>{formatCpfCnpj(cliente.document)}</span>
                  </div>
                ) : null}
              </div>
            </Link>
          );
        },
      },
      {
        key: 'idErp',
        title: 'ID ERP (IXC)',
        width: 140,
        render: (cliente) => (
          <span className="font-mono text-xs font-semibold text-foreground">
            #{cliente.idErp}
          </span>
        ),
      },
      {
        key: 'location',
        title: 'Localização',
        width: 200,
        render: (cliente) => {
          if (!cliente.location) {
            return <span className="text-xs text-muted">-</span>;
          }
          return (
            <div className="flex items-center gap-1 font-mono text-xs text-muted">
              <LuMapPin className="size-3.5 text-accent shrink-0" />
              <span>
                {cliente.location.latitude.toFixed(4)}, {cliente.location.longitude.toFixed(4)}
              </span>
            </div>
          );
        },
      },
      {
        key: 'actions',
        title: 'Ações',
        width: 100,
        align: 'right',
        render: (cliente) => <ClienteActionsCell cliente={cliente} />,
      },
    ],
    [],
  );

  return (
    <PageContainer>
      <PageHeader
        title="Cadastros > Clientes"
        subtitle="Consulte e gerencie assinantes, contratos, faturas, logins e ordens de serviço."
        icon={<LuUsers className="size-6 text-accent" />}
      />

      <div className="mt-6">
        <DataTable
          data={items}
          columns={columns}
          loading={loading}
          searchPlaceholder="Buscar por nome, CPF, CNPJ ou ID ERP… (pressione / para focar)"
          searchValue={searchInput}
          onSearchChange={(value) => {
            setSearchInput(value);
            updateSearch({ q: value });
          }}
          emptyMessage={
            state.q.trim().length < 2
              ? 'Digite ao menos 2 caracteres na busca para consultar clientes no ERP.'
              : 'Nenhum cliente encontrado para os termos pesquisados.'
          }
        />
      </div>
    </PageContainer>
  );
};
