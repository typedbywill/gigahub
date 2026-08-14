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
  LuClock,
  LuEllipsisVertical,
  LuEye,
  LuInbox,
  LuLayers,
  LuPlus,
  LuUserCheck,
} from 'react-icons/lu';
import type {
  DemandDto,
  DemandQueueDto,
  DemandSubjectDto,
} from '@gigahub/shared/contracts';
import {
  DataTable,
  type DataTableColumn,
  type DataTablePreset,
} from '../../shared/components/DataTable';
import { useAuthStore } from '../../shared/stores/auth.store';
import { useDemandCountsStore } from '../../shared/stores/demand-counts.store';
import { ApiClientError } from '../../shared/api/auth.api';
import {
  claimDemandRequest,
  listDemandsRequest,
} from '../../shared/api/demandas.api';
import {
  listDemandQueuesRequest,
  listSubjectsRequest,
} from '../../shared/api/assuntos.api';
import { routes } from '../../shared/routes';
import { Permissions } from '../../shared/permissions';
import { StatusBadge, type StatusBadgeVariant } from '../../shared/ui/StatusBadge';
import { toast } from '../../shared/ui/toast';
import {
  demandListViewHref,
  parseDemandListSearch,
  toDemandListSearchParams,
  type DemandViewMode,
} from './demand-list-search';

const STATUS_LABELS: Record<string, string> = {
  open: 'Aberta',
  queued: 'Pendente na Fila',
  in_progress: 'Em Atendimento',
  waiting: 'Aguardando',
  resolved: 'Resolvida',
  closed: 'Encerrada',
};

const STATUS_VARIANTS: Record<string, StatusBadgeVariant> = {
  open: 'accent',
  queued: 'warning',
  in_progress: 'active',
  waiting: 'warning',
  resolved: 'security',
  closed: 'neutral',
};

interface DemandasListPageProps {
  view: DemandViewMode;
}

export const DemandasListPage: React.FC<DemandasListPageProps> = ({ view }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchState = useMemo(
    () => parseDemandListSearch(view, searchParams),
    [view, searchParams],
  );

  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const canOpen = hasPermission(Permissions.DemandOpen);
  const canClaim = hasPermission(Permissions.DemandClaim);
  const canReadAll = hasPermission(Permissions.DemandReadAll);

  const counts = useDemandCountsStore((s) => s.counts);

  const [items, setItems] = useState<DemandDto[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [subjectsMap, setSubjectsMap] = useState<Map<string, DemandSubjectDto>>(
    new Map(),
  );
  const [queuesMap, setQueuesMap] = useState<Map<string, DemandQueueDto>>(
    new Map(),
  );

  // Load subjects and queues once
  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();

    Promise.all([
      listSubjectsRequest(accessToken, false, controller.signal),
      listDemandQueuesRequest(accessToken, false, controller.signal),
    ])
      .then(([subs, queues]) => {
        setSubjectsMap(new Map(subs.map((s) => [s.id, s])));
        setQueuesMap(new Map(queues.map((q) => [q.id, q])));
      })
      .catch(() => {});

    return () => controller.abort();
  }, [accessToken]);

  const loadDemands = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const res = await listDemandsRequest(accessToken, {
        view: searchState.view,
        status: searchState.status,
        subjectId: searchState.subjectId,
        queueId: searchState.queueId,
        q: searchState.q,
        page: searchState.page,
        pageSize: 20,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.danger('Erro ao carregar demandas', { description: err.message });
      }
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, searchState]);

  useEffect(() => {
    void loadDemands();
  }, [loadDemands]);

  const handleClaim = useCallback(
    async (demandId: string) => {
      if (!accessToken) return;
      try {
        await claimDemandRequest(accessToken, demandId);
        toast.success('Demanda assumida com sucesso!');
        void loadDemands();
      } catch (err) {
        if (err instanceof ApiClientError) {
          toast.danger('Não foi possível assumir a demanda', {
            description: err.message,
          });
        }
      }
    },
    [accessToken, loadDemands],
  );

  const updateSearch = useCallback(
    (patch: Partial<typeof searchState>) => {
      const next = { ...searchState, ...patch, page: patch.page ?? 1 };
      startTransition(() => {
        setSearchParams(toDemandListSearchParams(next));
      });
    },
    [searchState, setSearchParams],
  );

  const presets = useMemo<DataTablePreset[]>(() => {
    const list: DataTablePreset[] = [
      {
        id: 'queue',
        label: `Pendentes (${counts.queue})`,
        active: view === 'queue',
        onPress: () => navigate(routes.demandasPendentes),
      },
      {
        id: 'mine',
        label: `Caixa (${counts.inbox})`,
        active: view === 'mine',
        onPress: () => navigate(routes.demandasCaixa),
      },
      {
        id: 'claimed',
        label: `Assumidas (${counts.claimed})`,
        active: view === 'claimed',
        onPress: () => navigate(routes.demandasAssumidas),
      },
    ];
    if (canReadAll) {
      list.push({
        id: 'all',
        label: `Todas (${counts.all})`,
        active: view === 'all',
        onPress: () => navigate(routes.demandasTodas),
      });
    }
    return list;
  }, [counts, navigate, view, canReadAll]);

  const columns = useMemo<DataTableColumn<DemandDto>[]>(() => {
    const cols: DataTableColumn<DemandDto>[] = [
      {
        id: 'id',
        header: 'ID / Assunto',
        isRowHeader: true,
        cell: (row) => {
          const subject = subjectsMap.get(row.subjectId);
          return (
            <div className="flex flex-col gap-0.5 min-w-0">
              <Link
                to={routes.demanda(row.id)}
                state={{ from: demandListViewHref(view, searchState) }}
                className="font-medium text-accent hover:underline truncate"
              >
                {row.title}
              </Link>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="font-mono">{row.id}</span>
                <span>•</span>
                <span className="font-semibold text-foreground/80">
                  {subject?.name ?? row.subjectId}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: 'queue',
        header: 'Fila / Setor',
        cell: (row) => {
          const queue = queuesMap.get(row.queueId);
          return (
            <div className="text-sm">
              <div>{queue?.name ?? row.queueId}</div>
              {queue?.department ? (
                <div className="text-xs text-muted">{queue.department}</div>
              ) : null}
            </div>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => (
          <StatusBadge
            label={STATUS_LABELS[row.status] ?? row.status}
            variant={STATUS_VARIANTS[row.status] ?? 'neutral'}
          />
        ),
      },
      {
        id: 'dates',
        header: 'Abertura',
        cell: (row) => {
          const opened = new Date(row.openedAt);
          return (
            <div className="text-xs text-muted">
              <div>{opened.toLocaleDateString('pt-BR')}</div>
              <div>{opened.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: (row) => (
          <div className="flex items-center justify-end gap-1">
            {canClaim && (row.status === 'queued' || row.status === 'open') ? (
              <Button
                size="sm"
                variant="primary"
                onPress={() => void handleClaim(row.id)}
              >
                Assumir
              </Button>
            ) : null}
            <Dropdown>
              <Button isIconOnly size="sm" variant="ghost" aria-label="Opções">
                <LuEllipsisVertical className="size-4" />
              </Button>
              <Dropdown.Popover placement="bottom end">
                <Dropdown.Menu
                  onAction={(k) => {
                    if (k === 'view') {
                      navigate(routes.demanda(row.id), {
                        state: { from: demandListViewHref(view, searchState) },
                      });
                    }
                  }}
                >
                  <Dropdown.Item id="view" textValue="Ver detalhes">
                    <LuEye className="size-4 shrink-0 text-muted" />
                    <Label>Ver detalhes</Label>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </div>
        ),
      },
    ];
    return cols;
  }, [
    canClaim,
    handleClaim,
    navigate,
    queuesMap,
    searchState,
    subjectsMap,
    view,
  ]);

  const viewTitle =
    view === 'mine'
      ? 'Caixa de Entrada (Atribuídas a mim)'
      : view === 'queue'
        ? 'Demandas Pendentes (Fila do Setor)'
        : view === 'claimed'
          ? 'Minhas Demandas em Atendimento'
          : 'Todas as Demandas';

  const viewIcon =
    view === 'mine' ? (
      <LuInbox className="size-6 text-accent" />
    ) : view === 'queue' ? (
      <LuClock className="size-6 text-amber-500" />
    ) : view === 'claimed' ? (
      <LuUserCheck className="size-6 text-emerald-500" />
    ) : (
      <LuLayers className="size-6 text-accent" />
    );

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20">
            {viewIcon}
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              {viewTitle}
            </h1>
            <p className="text-xs md:text-sm text-muted">
              Gerencie chamados, solicitações internas e atendimentos
            </p>
          </div>
        </div>

        {canOpen ? (
          <Button
            variant="primary"
            onPress={() => navigate(routes.demandasNova)}
            className="shrink-0"
          >
            <LuPlus className="size-4" />
            Nova Demanda
          </Button>
        ) : null}
      </div>

      <DataTable
        ariaLabel="Lista de Demandas"
        columns={columns}
        items={items}
        getRowId={(d) => d.id}
        isLoading={isLoading}
        emptyMessage="Nenhuma demanda encontrada nesta caixa."
        presets={presets}
        searchValue={searchState.q}
        searchPlaceholder="Buscar por título ou ID..."
        onSearchChange={(q) => updateSearch({ q })}
        onSearchSubmit={(q) => updateSearch({ q })}
        onSearchClear={() => updateSearch({ q: '' })}
        pagination={{
          page: searchState.page,
          pageSize: 20,
          total,
          onPageChange: (page) => updateSearch({ page }),
        }}
      />
    </div>
  );
};
