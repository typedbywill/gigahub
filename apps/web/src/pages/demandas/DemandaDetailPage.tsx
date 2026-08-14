import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import {
  Button,
  EmptyState,
  Label,
  Modal,
  Select,
  Spinner,
  TextField,
  Input,
} from '@heroui/react';
import {
  LuArrowLeft,
  LuCheck,
  LuClock,
  LuFileText,
  LuRefreshCw,
  LuSend,
  LuTag,
  LuUser,
  LuUserCheck,
  LuUsers,
  LuX,
} from 'react-icons/lu';
import type {
  DemandDto,
  DemandQueueDto,
  DemandSubjectDto,
  UserListItemDto,
} from '@gigahub/shared/contracts';
import { useAuthStore } from '../../shared/stores/auth.store';
import { ApiClientError } from '../../shared/api/auth.api';
import {
  assignDemandRequest,
  claimDemandRequest,
  closeDemandRequest,
  getDemandRequest,
  reopenDemandRequest,
  resolveDemandRequest,
  transferDemandRequest,
  updateDemandValuesRequest,
} from '../../shared/api/demandas.api';
import {
  getSubjectRequest,
  listDemandQueuesRequest,
} from '../../shared/api/assuntos.api';
import { useUsersStore } from '../../shared/stores/users.store';
import { routes } from '../../shared/routes';
import { Permissions } from '../../shared/permissions';
import { StatusBadge, type StatusBadgeVariant } from '../../shared/ui/StatusBadge';
import { toast } from '../../shared/ui/toast';

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

export const DemandaDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const accessToken = useAuthStore((s) => s.accessToken);
  const currentUser = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const users = useUsersStore((s) => s.users);
  const fetchUsers = useUsersStore((s) => s.fetchUsers);

  const canClaim = hasPermission(Permissions.DemandClaim);
  const canAssign = hasPermission(Permissions.DemandAssign);
  const canClose = hasPermission(Permissions.DemandClose);
  const canReply = hasPermission(Permissions.DemandReply);

  const [demand, setDemand] = useState<DemandDto | null>(null);
  const [subject, setSubject] = useState<DemandSubjectDto | null>(null);
  const [queues, setQueues] = useState<DemandQueueDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Transfer modal
  const [transferOpen, setTransferOpen] = useState(false);
  const [selectedQueueId, setSelectedQueueId] = useState('');

  // Assign modal
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');

  // Close / Resolve modal
  const [closeOpen, setCloseOpen] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');

  // Edit Values
  const [isEditingValues, setIsEditingValues] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});

  const backHref = (location.state as { from?: string } | null)?.from ?? routes.demandasPendentes;

  const loadDemand = useCallback(async () => {
    if (!accessToken || !id) return;
    setIsLoading(true);
    try {
      const d = await getDemandRequest(accessToken, id);
      setDemand(d);
      setEditValues(d.values);

      void fetchUsers(accessToken);

      const [sub, qList] = await Promise.all([
        getSubjectRequest(accessToken, d.subjectId).catch(() => null),
        listDemandQueuesRequest(accessToken, true).catch(() => []),
      ]);

      setSubject(sub);
      setQueues(qList);
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.danger('Erro ao carregar demanda', { description: err.message });
      }
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, fetchUsers, id]);

  useEffect(() => {
    void loadDemand();
  }, [loadDemand]);

  const handleClaim = async () => {
    if (!accessToken || !id) return;
    try {
      const updated = await claimDemandRequest(accessToken, id);
      setDemand(updated);
      toast.success('Demanda assumida com sucesso!');
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.danger('Erro ao assumir demanda', { description: err.message });
      }
    }
  };

  const handleResolve = async () => {
    if (!accessToken || !id) return;
    try {
      const updated = await resolveDemandRequest(accessToken, id);
      setDemand(updated);
      toast.success('Demanda marcada como resolvida!');
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.danger('Erro ao resolver demanda', { description: err.message });
      }
    }
  };

  const handleClose = async () => {
    if (!accessToken || !id) return;
    try {
      const updated = await closeDemandRequest(accessToken, id);
      setDemand(updated);
      toast.success('Demanda encerrada!');
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.danger('Erro ao encerrar demanda', { description: err.message });
      }
    }
  };

  const handleReopen = async () => {
    if (!accessToken || !id) return;
    try {
      const updated = await reopenDemandRequest(accessToken, id);
      setDemand(updated);
      toast.success('Demanda reaberta!');
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.danger('Erro ao reabrir demanda', { description: err.message });
      }
    }
  };

  const handleTransfer = async () => {
    if (!accessToken || !id || !selectedQueueId) return;
    try {
      const updated = await transferDemandRequest(accessToken, id, {
        queueId: selectedQueueId,
      });
      setDemand(updated);
      setTransferOpen(false);
      toast.success('Demanda transferida de fila!');
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.danger('Erro ao transferir demanda', { description: err.message });
      }
    }
  };

  const handleAssign = async () => {
    if (!accessToken || !id || !selectedAgentId) return;
    try {
      const updated = await assignDemandRequest(accessToken, id, {
        agentId: selectedAgentId,
      });
      setDemand(updated);
      setAssignOpen(false);
      toast.success('Demanda atribuída com sucesso!');
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.danger('Erro ao atribuir demanda', { description: err.message });
      }
    }
  };

  const handleSaveValues = async () => {
    if (!accessToken || !id) return;
    try {
      const updated = await updateDemandValuesRequest(accessToken, id, {
        values: editValues,
      });
      setDemand(updated);
      setIsEditingValues(false);
      toast.success('Valores atualizados!');
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.danger('Erro ao salvar valores', { description: err.message });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!demand) {
    return (
      <div className="p-6">
        <EmptyState
          title="Demanda não encontrada"
          description="A demanda pode ter sido excluída ou o identificador informado está incorreto."
        />
      </div>
    );
  }

  const assignedUser = users.find((u) => u.id === demand.assignedAgentId);
  const currentQueue = queues.find((q) => q.id === demand.queueId);

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Top navigation */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onPress={() => navigate(backHref)}
          className="gap-2"
        >
          <LuArrowLeft className="size-4" />
          Voltar para listagem
        </Button>

        <div className="flex items-center gap-2">
          {canClaim && (demand.status === 'queued' || demand.status === 'open') ? (
            <Button variant="primary" size="sm" onPress={() => void handleClaim()}>
              <LuUserCheck className="size-4" />
              Assumir Demanda
            </Button>
          ) : null}

          {canAssign && demand.status !== 'closed' ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onPress={() => setAssignOpen(true)}
              >
                <LuUser className="size-4" />
                Atribuir a...
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onPress={() => setTransferOpen(true)}
              >
                <LuRefreshCw className="size-4" />
                Transferir Fila
              </Button>
            </>
          ) : null}

          {canClose && (demand.status === 'in_progress' || demand.status === 'waiting') ? (
            <Button variant="secondary" size="sm" onPress={() => void handleResolve()}>
              <LuCheck className="size-4" />
              Resolver
            </Button>
          ) : null}

          {canClose && demand.status === 'resolved' ? (
            <Button variant="secondary" size="sm" onPress={() => void handleClose()}>
              <LuCheck className="size-4" />
              Encerrar
            </Button>
          ) : null}

          {canClose && demand.status === 'closed' ? (
            <Button variant="secondary" size="sm" onPress={() => void handleReopen()}>
              <LuRefreshCw className="size-4" />
              Reabrir
            </Button>
          ) : null}
        </div>
      </div>

      {/* Main card */}
      <div className="rounded-2xl border border-border bg-surface p-6 flex flex-col gap-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-border">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-mono text-muted">
              <span>{demand.id}</span>
              <span>•</span>
              <span className="text-accent font-semibold">{subject?.name ?? demand.subjectId}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {demand.title}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge
              label={STATUS_LABELS[demand.status] ?? demand.status}
              variant={STATUS_VARIANTS[demand.status] ?? 'neutral'}
            />
          </div>
        </div>

        {/* Metadata info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-background border border-border">
          <div>
            <div className="text-xs text-muted mb-1 flex items-center gap-1.5">
              <LuTag className="size-3.5" /> Fila / Setor
            </div>
            <div className="text-sm font-medium text-foreground">
              {currentQueue?.name ?? demand.queueId}
            </div>
            {currentQueue?.department ? (
              <div className="text-xs text-muted">{currentQueue.department}</div>
            ) : null}
          </div>

          <div>
            <div className="text-xs text-muted mb-1 flex items-center gap-1.5">
              <LuUser className="size-3.5" /> Responsável
            </div>
            <div className="text-sm font-medium text-foreground">
              {assignedUser?.name ?? (demand.assignedAgentId ? demand.assignedAgentId : 'Não atribuído (na fila)')}
            </div>
            {assignedUser?.email ? (
              <div className="text-xs text-muted font-mono">{assignedUser.email}</div>
            ) : null}
          </div>

          <div>
            <div className="text-xs text-muted mb-1 flex items-center gap-1.5">
              <LuUsers className="size-3.5" /> Clientes Vinculados
            </div>
            <div className="text-sm font-medium text-foreground">
              {demand.customerIds.length > 0
                ? demand.customerIds.join(', ')
                : 'Nenhum cliente vinculado'}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted mb-1 flex items-center gap-1.5">
              <LuClock className="size-3.5" /> Abertura
            </div>
            <div className="text-sm font-medium text-foreground">
              {new Date(demand.openedAt).toLocaleString('pt-BR')}
            </div>
          </div>
        </div>

        {/* Parameter values panel */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <LuFileText className="size-5 text-accent" />
              Parâmetros e Formulário do Assunto
            </h2>

            {canReply && demand.status !== 'closed' ? (
              !isEditingValues ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => setIsEditingValues(true)}
                >
                  Editar Valores
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onPress={() => {
                      setEditValues(demand.values);
                      setIsEditingValues(false);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onPress={() => void handleSaveValues()}
                  >
                    Salvar
                  </Button>
                </div>
              )
            ) : null}
          </div>

          {subject?.params && subject.params.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subject.params.map((param) => {
                const val = (isEditingValues ? editValues : demand.values)[param.id];

                return (
                  <div
                    key={param.id}
                    className="p-4 rounded-xl border border-border bg-background flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                        {param.label}
                        {param.required ? <span className="text-danger ml-0.5">*</span> : null}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-accent/10 text-accent">
                        {param.type}
                      </span>
                    </div>

                    {isEditingValues ? (
                      <div>
                        {param.type === 'select' ? (
                          <select
                            value={String(val ?? '')}
                            onChange={(e) =>
                              setEditValues((v) => ({ ...v, [param.id]: e.target.value }))
                            }
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
                          >
                            <option value="">Selecione...</option>
                            {param.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : param.type === 'checkbox' ? (
                          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={Boolean(val)}
                              onChange={(e) =>
                                setEditValues((v) => ({ ...v, [param.id]: e.target.checked }))
                              }
                              className="size-4 rounded border-border"
                            />
                            <span>{param.label}</span>
                          </label>
                        ) : param.type === 'number' ? (
                          <input
                            type="number"
                            value={val !== undefined ? String(val) : ''}
                            onChange={(e) =>
                              setEditValues((v) => ({
                                ...v,
                                [param.id]: e.target.value === '' ? undefined : Number(e.target.value),
                              }))
                            }
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
                          />
                        ) : param.type === 'longtext' ? (
                          <textarea
                            value={String(val ?? '')}
                            onChange={(e) =>
                              setEditValues((v) => ({ ...v, [param.id]: e.target.value }))
                            }
                            rows={3}
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
                          />
                        ) : (
                          <input
                            type={param.type === 'date' ? 'date' : 'text'}
                            value={String(val ?? '')}
                            onChange={(e) =>
                              setEditValues((v) => ({ ...v, [param.id]: e.target.value }))
                            }
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="text-sm font-medium text-foreground wrap-break-word pt-0.5">
                        {val === undefined || val === null || val === '' ? (
                          <span className="text-muted italic">Não informado</span>
                        ) : typeof val === 'boolean' ? (
                          val ? 'Sim' : 'Não'
                        ) : Array.isArray(val) ? (
                          val.join(', ')
                        ) : (
                          String(val)
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-border text-center text-sm text-muted">
              Este assunto não possui parâmetros configurados.
            </div>
          )}
        </div>
      </div>

      {/* Transfer Queue Modal */}
      {transferOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl flex flex-col gap-4">
            <h3 className="text-lg font-bold text-foreground">Transferir Fila da Demanda</h3>
            <p className="text-xs text-muted">
              Ao transferir, a demanda voltará para o status Pendente na nova fila selecionada.
            </p>

            <select
              value={selectedQueueId}
              onChange={(e) => setSelectedQueueId(e.target.value)}
              className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground"
            >
              <option value="">Selecione a nova fila...</option>
              {queues.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name} {q.department ? `(${q.department})` : ''}
                </option>
              ))}
            </select>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onPress={() => setTransferOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                isDisabled={!selectedQueueId}
                onPress={() => void handleTransfer()}
              >
                Transferir
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Assign User Modal */}
      {assignOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl flex flex-col gap-4">
            <h3 className="text-lg font-bold text-foreground">Atribuir a um Colaborador</h3>
            <p className="text-xs text-muted">
              A demanda entrará em atendimento direto na caixa do colaborador escolhido.
            </p>

            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground"
            >
              <option value="">Selecione o colaborador...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onPress={() => setAssignOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                isDisabled={!selectedAgentId}
                onPress={() => void handleAssign()}
              >
                Atribuir
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
