import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Input,
  Pagination,
  Select,
  SelectItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react';
import {
  LuCalendar,
  LuChevronRight,
  LuFilter,
  LuRefreshCw,
  LuSearch,
  LuWrench,
} from 'react-icons/lu';
import type { WorkOrderStatus, WorkOrderSummaryDto } from '@gigahub/shared/contracts';
import { useAuthStore } from '../../shared/stores/auth.store';
import { listWorkOrders } from '../../shared/api/work-orders.api';
import { routes } from '../../shared/routes';
import { toast } from '../../shared/ui/toast';
import { WorkOrderStatusChip } from './components/WorkOrderStatusChip';

const STATUS_OPTIONS: { key: WorkOrderStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'Todos os Status' },
  { key: 'A', label: 'Aberta' },
  { key: 'AN', label: 'Em Análise' },
  { key: 'EN', label: 'Encaminhada' },
  { key: 'AS', label: 'Assumida' },
  { key: 'AG', label: 'Agendada' },
  { key: 'DS', label: 'Deslocamento' },
  { key: 'EX', label: 'Em Execução' },
  { key: 'F', label: 'Finalizada' },
  { key: 'RAG', label: 'Aguardando Reagendamento' },
];

export const WorkOrdersListPage: React.FC = () => {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [items, setItems] = useState<WorkOrderSummaryDto[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [pages, setPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [status, setStatus] = useState<WorkOrderStatus | 'ALL'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      const res = await listWorkOrders(accessToken, {
        page,
        limit: 20,
        q: search.trim() || undefined,
        status: status !== 'ALL' ? status : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err: any) {
      toast.error('Erro ao listar ordens de serviço', {
        description: err?.message || 'Verifique sua conexão.',
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, search, status, startDate, endDate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void loadData();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Todas as Ordens de Serviço
          </h1>
          <p className="text-xs text-muted md:text-sm">
            Consulta e histórico de ordens de serviço no IXC.
          </p>
        </div>

        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label="Recarregar lista"
          title="Recarregar lista"
          onPress={() => void loadData()}
          isLoading={loading}
        >
          <LuRefreshCw className="size-4" />
        </Button>
      </div>

      {/* Filtros */}
      <form
        onSubmit={handleSearchSubmit}
        className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xs md:grid-cols-4"
      >
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-foreground">
            Buscar por cliente, OS ou mensagem
          </label>
          <Input
            size="sm"
            placeholder="Digite protocolo, cliente, CPF…"
            value={search}
            onValueChange={setSearch}
            startContent={<LuSearch className="size-3.5 text-muted" />}
            isClearable
            variant="bordered"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">
            Status da OS
          </label>
          <select
            aria-label="Status da OS"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as WorkOrderStatus | 'ALL');
              setPage(1);
            }}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-accent"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <Button
            type="submit"
            size="sm"
            color="accent"
            className="w-full font-semibold"
            startContent={<LuSearch className="size-3.5" />}
          >
            Filtrar
          </Button>
        </div>
      </form>

      {/* Tabela de Resultados */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted">
            <Spinner size="lg" />
            <p className="text-xs">Carregando ordens de serviço…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <LuWrench className="mx-auto size-8 text-muted/60" />
            <h3 className="mt-2 text-sm font-semibold text-foreground">
              Nenhuma ordem de serviço encontrada
            </h3>
            <p className="mt-1 text-xs">
              Ajuste os filtros de pesquisa para visualizar resultados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-background/50 text-[11px] font-semibold text-muted uppercase">
                <tr>
                  <th className="px-4 py-3">OS</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Assunto</th>
                  <th className="px-4 py-3">Técnico</th>
                  <th className="px-4 py-3">Data Agendada</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {items.map((wo) => (
                  <tr
                    key={wo.id}
                    className="transition hover:bg-background/40"
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-accent">
                      #{wo.idErp}
                    </td>
                    <td className="px-4 py-3">
                      <WorkOrderStatusChip status={wo.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">
                        {wo.customerName}
                      </div>
                      <div className="text-[11px] text-muted truncate max-w-xs">
                        {wo.customerAddress || 'Endereço não informado'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {wo.subjectName || 'Atendimento'}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {wo.technicianName || '—'}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {wo.scheduledAt
                        ? new Date(wo.scheduledAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={routes.osDetalhe(wo.idErp)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition hover:border-foreground/20 hover:text-accent"
                      >
                        <span>Abrir</span>
                        <LuChevronRight className="size-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-border p-3">
            <span className="text-xs text-muted">
              Total: <strong>{total}</strong> ordens de serviço
            </span>
            <Pagination
              size="sm"
              page={page}
              total={pages}
              onChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};
export default WorkOrdersListPage;
