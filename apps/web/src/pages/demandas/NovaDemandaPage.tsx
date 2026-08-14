import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spinner } from '@heroui/react';
import {
  LuArrowLeft,
  LuCheck,
  LuFileText,
  LuPlus,
  LuSend,
  LuSparkles,
  LuTag,
} from 'react-icons/lu';
import type {
  DemandQueueDto,
  DemandSubjectDto,
  SubjectParamDto,
  UserListItemDto,
} from '@gigahub/shared/contracts';
import { useAuthStore } from '../../shared/stores/auth.store';
import { ApiClientError } from '../../shared/api/auth.api';
import { openDemandRequest } from '../../shared/api/demandas.api';
import {
  listDemandQueuesRequest,
  listSubjectsRequest,
} from '../../shared/api/assuntos.api';
import { listUsersRequest } from '../../shared/api/users.api';
import { searchCustomersRequest } from '../../shared/api/clientes.api';
import { routes } from '../../shared/routes';
import { toast } from '../../shared/ui/toast';

export const NovaDemandaPage: React.FC = () => {
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [subjects, setSubjects] = useState<DemandSubjectDto[]>([]);
  const [queues, setQueues] = useState<DemandQueueDto[]>([]);
  const [users, setUsers] = useState<UserListItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [customerIdsInput, setCustomerIdsInput] = useState('');
  const [values, setValues] = useState<Record<string, unknown>>({});

  // Dynamic search state for refs
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerHits, setCustomerHits] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();

    Promise.all([
      listSubjectsRequest(accessToken, true, controller.signal),
      listDemandQueuesRequest(accessToken, true, controller.signal),
      listUsersRequest(accessToken, { status: 'active', pageSize: 100 }, controller.signal),
    ])
      .then(([subs, qList, uList]) => {
        setSubjects(subs);
        setQueues(qList);
        setUsers(uList.items);
        if (subs.length > 0) {
          const first = subs[0];
          setSelectedSubjectId(first.id);
          setSelectedQueueId(first.defaultQueueId ?? (qList[0]?.id ?? ''));
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [accessToken]);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  // Update default queue when subject changes
  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    const sub = subjects.find((s) => s.id === subjectId);
    if (sub?.defaultQueueId) {
      setSelectedQueueId(sub.defaultQueueId);
    }
    setValues({});
  };

  const handleValueChange = (paramId: string, val: unknown) => {
    setValues((prev) => ({ ...prev, [paramId]: val }));
  };

  const handleSearchCustomer = async (q: string) => {
    setCustomerSearchQuery(q);
    if (!accessToken || q.trim().length < 2) {
      setCustomerHits([]);
      return;
    }
    try {
      const res = await searchCustomersRequest(accessToken, { q, limit: 10 });
      setCustomerHits(res.items.map((i) => ({ id: i.idErp, name: i.name })));
    } catch {
      setCustomerHits([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !selectedSubject) return;

    if (!title.trim()) {
      toast.danger('Informe um título descritivo para a demanda');
      return;
    }

    const customerIds = customerIdsInput
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    setIsSubmitting(true);
    try {
      const created = await openDemandRequest(accessToken, {
        subjectId: selectedSubject.id,
        queueId: selectedQueueId || undefined,
        title: title.trim(),
        values,
        customerIds,
        assignedAgentId: selectedAgentId || undefined,
      });

      toast.success('Demanda aberta com sucesso!');
      navigate(routes.demanda(created.id));
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.danger('Erro ao abrir demanda', { description: err.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onPress={() => navigate(routes.demandasPendentes)}
          className="gap-2"
        >
          <LuArrowLeft className="size-4" />
          Voltar
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 md:p-8 flex flex-col gap-6 shadow-xs">
        <div className="flex items-center gap-3 pb-6 border-b border-border">
          <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
            <LuFileText className="size-6 text-accent" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Nova Demanda
            </h1>
            <p className="text-xs md:text-sm text-muted">
              Abra um novo chamado ou solicitação interna selecionando o assunto correto
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Step 1: Subject Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-foreground">
              Assunto da Demanda <span className="text-danger">*</span>
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-accent focus:outline-none"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} {sub.description ? `— ${sub.description}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-foreground">
              Título / Resumo da Demanda <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Troca de plano para 600MB fibra"
              className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-accent focus:outline-none"
            />
          </div>

          {/* Routing & Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">
                Fila / Setor de Destino
              </label>
              <select
                value={selectedQueueId}
                onChange={(e) => setSelectedQueueId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-accent focus:outline-none"
              >
                {queues.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name} {q.department ? `(${q.department})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">
                Atribuir a um Colaborador (Opcional)
              </label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-accent focus:outline-none"
              >
                <option value="">Nenhum (cairá na fila como Pendente)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer association */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-foreground">
              IDs de Clientes Vinculados (Opcional, separados por vírgula)
            </label>
            <input
              type="text"
              value={customerIdsInput}
              onChange={(e) => setCustomerIdsInput(e.target.value)}
              placeholder="Ex: 10423, 10899"
              className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-accent focus:outline-none"
            />
          </div>

          {/* Step 2: Dynamic Subject Parameters Form */}
          {selectedSubject?.params && selectedSubject.params.length > 0 ? (
            <div className="flex flex-col gap-4 pt-4 border-t border-border">
              <h3 className="text-base font-bold text-foreground">
                Parâmetros Específicos: {selectedSubject.name}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedSubject.params.map((param) => {
                  const val = values[param.id];

                  return (
                    <div key={param.id} className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-foreground">
                        {param.label}
                        {param.required ? (
                          <span className="text-danger ml-0.5">*</span>
                        ) : null}
                      </label>

                      {param.type === 'select' ? (
                        <select
                          required={param.required}
                          value={String(val ?? '')}
                          onChange={(e) => handleValueChange(param.id, e.target.value)}
                          className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground"
                        >
                          <option value="">Selecione uma opção...</option>
                          {param.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : param.type === 'checkbox' ? (
                        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer pt-2">
                          <input
                            type="checkbox"
                            checked={Boolean(val)}
                            onChange={(e) => handleValueChange(param.id, e.target.checked)}
                            className="size-4 rounded border-border"
                          />
                          <span>{param.label}</span>
                        </label>
                      ) : param.type === 'number' ? (
                        <input
                          type="number"
                          required={param.required}
                          value={val !== undefined ? String(val) : ''}
                          onChange={(e) =>
                            handleValueChange(
                              param.id,
                              e.target.value === '' ? undefined : Number(e.target.value),
                            )
                          }
                          placeholder={param.placeholder ?? '0'}
                          className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground"
                        />
                      ) : param.type === 'longtext' ? (
                        <textarea
                          required={param.required}
                          rows={3}
                          value={String(val ?? '')}
                          onChange={(e) => handleValueChange(param.id, e.target.value)}
                          placeholder={param.placeholder ?? ''}
                          className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground"
                        />
                      ) : param.type === 'ref:user' ? (
                        <select
                          required={param.required}
                          value={String(val ?? '')}
                          onChange={(e) => handleValueChange(param.id, e.target.value)}
                          className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground"
                        >
                          <option value="">Selecione um usuário...</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.email})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={param.type === 'date' ? 'date' : 'text'}
                          required={param.required}
                          value={String(val ?? '')}
                          onChange={(e) => handleValueChange(param.id, e.target.value)}
                          placeholder={param.placeholder ?? ''}
                          className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
            <Button
              variant="ghost"
              onPress={() => navigate(routes.demandasPendentes)}
              isDisabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isDisabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? <Spinner size="sm" /> : <LuSend className="size-4" />}
              Abrir Demanda
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
