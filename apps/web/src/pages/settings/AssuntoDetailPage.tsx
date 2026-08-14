import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, EmptyState, Spinner } from '@heroui/react';
import {
  LuArrowLeft,
  LuFolderGit2,
  LuPlus,
  LuSave,
  LuTrash2,
} from 'react-icons/lu';
import type {
  DemandQueueDto,
  DemandSubjectDto,
  ParamTypeDto,
  SubjectParamDto,
} from '@gigahub/shared/contracts';
import { useAuthStore } from '../../shared/stores/auth.store';
import { ApiClientError } from '../../shared/api/auth.api';
import {
  getSubjectRequest,
  listDemandQueuesRequest,
  updateSubjectRequest,
} from '../../shared/api/assuntos.api';
import { routes } from '../../shared/routes';
import { toast } from '../../shared/ui/toast';

const PARAM_TYPE_OPTIONS: Array<{ value: ParamTypeDto; label: string }> = [
  { value: 'text', label: 'Texto Curto (text)' },
  { value: 'longtext', label: 'Texto Longo (textarea)' },
  { value: 'number', label: 'Numérico (number)' },
  { value: 'date', label: 'Data (date)' },
  { value: 'checkbox', label: 'Caixa de Seleção / Booleano (checkbox)' },
  { value: 'select', label: 'Seleção Única (select)' },
  { value: 'multiselect', label: 'Seleção Múltipla (multiselect)' },
  { value: 'ref:customer', label: 'Referência a Cliente (IXC)' },
  { value: 'ref:user', label: 'Referência a Colaborador' },
  { value: 'ref:workOrder', label: 'Referência a Ordem de Serviço (OS)' },
  { value: 'ref:contract', label: 'Referência a Contrato/Plano' },
];

export const AssuntoDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [subject, setSubject] = useState<DemandSubjectDto | null>(null);
  const [queues, setQueues] = useState<DemandQueueDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultQueueId, setDefaultQueueId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [params, setParams] = useState<SubjectParamDto[]>([]);

  const loadData = useCallback(async () => {
    if (!accessToken || !id) return;
    setIsLoading(true);
    try {
      const [sub, qList] = await Promise.all([
        getSubjectRequest(accessToken, id),
        listDemandQueuesRequest(accessToken, false),
      ]);
      setSubject(sub);
      setName(sub.name);
      setDescription(sub.description ?? '');
      setDefaultQueueId(sub.defaultQueueId ?? '');
      setIsActive(sub.isActive);
      setParams(sub.params);
      setQueues(qList);
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.danger('Erro ao carregar assunto', { description: err.message });
      }
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleAddParam = () => {
    const newId = `campo_${params.length + 1}`;
    setParams((prev) => [
      ...prev,
      {
        id: newId,
        label: `Novo Campo ${prev.length + 1}`,
        type: 'text',
        required: false,
        placeholder: '',
      },
    ]);
  };

  const handleRemoveParam = (index: number) => {
    setParams((prev) => prev.filter((_, i) => i !== index));
  };

  const handleParamChange = (
    index: number,
    patch: Partial<SubjectParamDto>,
  ) => {
    setParams((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !id) return;

    // Validate parameters
    for (const p of params) {
      if (!p.id.trim() || !p.label.trim()) {
        toast.danger('Todos os parâmetros devem possuir identificador e rótulo');
        return;
      }
      if (
        (p.type === 'select' || p.type === 'multiselect') &&
        (!p.options || p.options.length === 0)
      ) {
        toast.danger(`O campo "${p.label}" exige pelo menos uma opção configurada`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const updated = await updateSubjectRequest(accessToken, id, {
        name: name.trim(),
        description: description.trim() || undefined,
        defaultQueueId: defaultQueueId || undefined,
        isActive,
        params,
      });

      setSubject(updated);
      toast.success('Assunto e parâmetros atualizados com sucesso!');
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.danger('Erro ao salvar alterações', { description: err.message });
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="p-6">
        <EmptyState
          title="Assunto não encontrado"
          description="O assunto solicitado não existe no sistema."
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onPress={() => navigate(routes.assuntos)}
          className="gap-2"
        >
          <LuArrowLeft className="size-4" />
          Voltar para assuntos
        </Button>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Main info card */}
        <div className="rounded-2xl border border-border bg-surface p-6 md:p-8 flex flex-col gap-6 shadow-xs">
          <div className="flex items-center gap-3 pb-6 border-b border-border">
            <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
              <LuFolderGit2 className="size-6 text-accent" />
            </div>
            <div>
              <div className="text-xs font-mono text-muted">{subject.id}</div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                Editar Assunto
              </h1>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">
                Nome do Assunto <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">
                Fila Padrão
              </label>
              <select
                value={defaultQueueId}
                onChange={(e) => setDefaultQueueId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-accent focus:outline-none"
              >
                <option value="">Nenhuma fila padrão</option>
                {queues.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name} {q.department ? `(${q.department})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">
                Descrição
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-2 pt-2">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="size-4 rounded border-border"
                />
                <span className="font-medium">Assunto Ativo para novas demandas</span>
              </label>
            </div>
          </div>
        </div>

        {/* Parameters editor */}
        <div className="rounded-2xl border border-border bg-surface p-6 md:p-8 flex flex-col gap-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Campos e Parâmetros Customizados
              </h2>
              <p className="text-xs text-muted">
                Estes campos serão exigidos no formulário dinâmico no momento de abertura da demanda
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onPress={handleAddParam}
              className="gap-1.5"
            >
              <LuPlus className="size-4" />
              Adicionar Campo
            </Button>
          </div>

          {params.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-xl text-muted text-sm">
              Nenhum parâmetro adicionado ainda. Clique em "Adicionar Campo" acima.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {params.map((param, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl border border-border bg-background flex flex-col gap-4 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-xs font-mono font-bold text-accent px-2 py-1 rounded bg-accent/10">
                      #{index + 1}
                    </span>

                    <Button
                      type="button"
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      aria-label="Remover parâmetro"
                      onPress={() => handleRemoveParam(index)}
                    >
                      <LuTrash2 className="size-4 text-danger" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-foreground">
                        Rótulo do Campo (Label) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={param.label}
                        onChange={(e) =>
                          handleParamChange(index, { label: e.target.value })
                        }
                        placeholder="Ex: Motivo da troca"
                        className="w-full rounded-lg border border-border bg-surface p-2.5 text-sm text-foreground focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-foreground">
                        Identificador (Slug) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={param.id}
                        onChange={(e) =>
                          handleParamChange(index, { id: e.target.value })
                        }
                        placeholder="Ex: motivo_troca"
                        className="w-full rounded-lg border border-border bg-surface p-2.5 text-sm font-mono text-foreground focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-foreground">
                        Tipo de Campo <span className="text-danger">*</span>
                      </label>
                      <select
                        value={param.type}
                        onChange={(e) =>
                          handleParamChange(index, {
                            type: e.target.value as ParamTypeDto,
                          })
                        }
                        className="w-full rounded-lg border border-border bg-surface p-2.5 text-sm text-foreground focus:outline-none"
                      >
                        {PARAM_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Options input for select/multiselect */}
                  {param.type === 'select' || param.type === 'multiselect' ? (
                    <div className="flex flex-col gap-1 pt-2 border-t border-border">
                      <label className="text-xs font-medium text-foreground">
                        Opções de Escolha (separadas por vírgula){' '}
                        <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        value={param.options ? param.options.join(', ') : ''}
                        onChange={(e) =>
                          handleParamChange(index, {
                            options: e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="Ex: Opção 1, Opção 2, Opção 3"
                        className="w-full rounded-lg border border-border bg-surface p-2.5 text-sm text-foreground focus:outline-none"
                      />
                    </div>
                  ) : null}

                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={param.required}
                        onChange={(e) =>
                          handleParamChange(index, { required: e.target.checked })
                        }
                        className="size-4 rounded border-border"
                      />
                      <span>Preenchimento Obrigatório</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onPress={() => navigate(routes.assuntos)}
            isDisabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            isDisabled={isSaving}
            className="gap-2"
          >
            {isSaving ? <Spinner size="sm" /> : <LuSave className="size-4" />}
            Salvar Assunto e Parâmetros
          </Button>
        </div>
      </form>
    </div>
  );
};
