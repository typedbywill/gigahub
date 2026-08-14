import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Dropdown, Label } from '@heroui/react';
import {
  LuEllipsisVertical,
  LuFolderGit2,
  LuPencil,
  LuPlus,
  LuPower,
} from 'react-icons/lu';
import type { DemandQueueDto, DemandSubjectDto } from '@gigahub/shared/contracts';
import {
  DataTable,
  type DataTableColumn,
} from '../../shared/components/DataTable';
import { useAuthStore } from '../../shared/stores/auth.store';
import { ApiClientError } from '../../shared/api/auth.api';
import {
  createSubjectRequest,
  listDemandQueuesRequest,
  listSubjectsRequest,
  updateSubjectRequest,
} from '../../shared/api/assuntos.api';
import { routes } from '../../shared/routes';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { toast } from '../../shared/ui/toast';
import {
  PageContainer,
  PageHeader,
} from '../../shared/components/PageHeader';

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const AssuntosPage: React.FC = () => {
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [subjects, setSubjects] = useState<DemandSubjectDto[]>([]);
  const [queues, setQueues] = useState<DemandQueueDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // New subject modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [slugInput, setSlugInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [defaultQueueInput, setDefaultQueueInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const [subs, qList] = await Promise.all([
        listSubjectsRequest(accessToken, false),
        listDemandQueuesRequest(accessToken, false),
      ]);
      setSubjects(subs);
      setQueues(qList);
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.danger('Erro ao carregar assuntos', { description: err.message });
      }
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleToggleActive = useCallback(
    async (sub: DemandSubjectDto) => {
      if (!accessToken) return;
      try {
        await updateSubjectRequest(accessToken, sub.id, {
          isActive: !sub.isActive,
        });
        toast.success(
          sub.isActive
            ? 'Assunto desativado com sucesso!'
            : 'Assunto ativado com sucesso!',
        );
        void loadData();
      } catch (err) {
        if (err instanceof ApiClientError) {
          toast.danger('Erro ao alterar status', { description: err.message });
        }
      }
    },
    [accessToken, loadData],
  );

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    const finalSlug = slugInput.trim() || slugify(nameInput);
    if (!finalSlug) {
      toast.danger('Informe um slug válido');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createSubjectRequest(accessToken, {
        id: finalSlug,
        name: nameInput.trim(),
        description: descInput.trim() || undefined,
        defaultQueueId: defaultQueueInput || undefined,
        params: [],
        isActive: true,
      });

      toast.success('Assunto criado com sucesso!');
      setCreateModalOpen(false);
      navigate(routes.assunto(created.id));
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.danger('Erro ao criar assunto', { description: err.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!search.trim()) return subjects;
    const q = search.toLowerCase().trim();
    return subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q),
    );
  }, [subjects, search]);

  const columns = useMemo<DataTableColumn<DemandSubjectDto>[]>(() => {
    const queueMap = new Map(queues.map((q) => [q.id, q.name]));

    return [
      {
        id: 'name',
        header: 'Nome / Identificador',
        isRowHeader: true,
        cell: (row) => (
          <div className="flex flex-col gap-0.5 min-w-0">
            <Link
              to={routes.assunto(row.id)}
              className="font-medium text-accent hover:underline truncate"
            >
              {row.name}
            </Link>
            <span className="font-mono text-xs text-muted truncate">
              {row.id}
            </span>
          </div>
        ),
      },
      {
        id: 'description',
        header: 'Descrição',
        cell: (row) => (
          <div className="text-sm text-foreground/80 line-clamp-1">
            {row.description || '—'}
          </div>
        ),
      },
      {
        id: 'queue',
        header: 'Fila Padrão',
        cell: (row) => (
          <div className="text-sm text-foreground">
            {row.defaultQueueId
              ? (queueMap.get(row.defaultQueueId) ?? row.defaultQueueId)
              : '—'}
          </div>
        ),
      },
      {
        id: 'paramsCount',
        header: 'Parâmetros',
        cell: (row) => (
          <span className="font-mono text-xs px-2 py-1 rounded-md bg-default border border-border">
            {row.params.length} campos
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => (
          <StatusBadge
            label={row.isActive ? 'Ativo' : 'Inativo'}
            variant={row.isActive ? 'active' : 'inactive'}
          />
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: (row) => (
          <div className="flex items-center justify-end">
            <Dropdown>
              <Button isIconOnly size="sm" variant="ghost" aria-label="Opções">
                <LuEllipsisVertical className="size-4" />
              </Button>
              <Dropdown.Popover placement="bottom end">
                <Dropdown.Menu
                  onAction={(k) => {
                    if (k === 'edit') {
                      navigate(routes.assunto(row.id));
                    } else if (k === 'toggle') {
                      void handleToggleActive(row);
                    }
                  }}
                >
                  <Dropdown.Item id="edit" textValue="Editar parâmetros">
                    <LuPencil className="size-4 shrink-0 text-muted" />
                    <Label>Editar parâmetros</Label>
                  </Dropdown.Item>
                  <Dropdown.Item
                    id="toggle"
                    textValue={row.isActive ? 'Desativar' : 'Ativar'}
                  >
                    <LuPower className="size-4 shrink-0 text-muted" />
                    <Label>{row.isActive ? 'Desativar' : 'Ativar'}</Label>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </div>
        ),
      },
    ];
  }, [handleToggleActive, navigate, queues]);

  return (
    <PageContainer
      header={
        <PageHeader
          icon={<LuFolderGit2 className="size-6" />}
          title="Assuntos e Parâmetros de Demandas"
          description="Configure os tipos de solicitações e os campos customizados que cada assunto exige"
          actions={
            <Button
              variant="primary"
              onPress={() => {
                setNameInput('');
                setSlugInput('');
                setDescInput('');
                setDefaultQueueInput(queues[0]?.id ?? '');
                setCreateModalOpen(true);
              }}
              className="shrink-0"
            >
              <LuPlus className="size-4" />
              Novo Assunto
            </Button>
          }
        />
      }
    >
      <DataTable
        ariaLabel="Lista de Assuntos"
        columns={columns}
        items={filteredItems}
        getRowId={(s) => s.id}
        isLoading={isLoading}
        emptyMessage="Nenhum assunto configurado ainda."
        searchValue={search}
        searchPlaceholder="Buscar por assunto ou identificador..."
        onSearchChange={setSearch}
        onSearchClear={() => setSearch('')}
      />

      {/* Create Subject Modal */}
      {createModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl flex flex-col gap-4">
            <h3 className="text-lg font-bold text-foreground">Novo Assunto de Demanda</h3>
            <p className="text-xs text-muted">
              Defina o nome e a fila padrão. Você poderá adicionar parâmetros personalizados a seguir.
            </p>

            <form onSubmit={handleCreateSubject} className="flex flex-col gap-4 pt-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Nome do Assunto <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    if (!slugInput || slugInput === slugify(nameInput)) {
                      setSlugInput(slugify(e.target.value));
                    }
                  }}
                  placeholder="Ex: Alteração de Vencimento"
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Identificador (Slug) <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={slugInput}
                  onChange={(e) => setSlugInput(e.target.value)}
                  placeholder="Ex: alteracao-de-vencimento"
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm font-mono text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Descrição (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  placeholder="Explicação sobre o propósito deste assunto"
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Fila Padrão (Opcional)
                </label>
                <select
                  value={defaultQueueInput}
                  onChange={(e) => setDefaultQueueInput(e.target.value)}
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

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => setCreateModalOpen(false)}
                  isDisabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isDisabled={isSubmitting}
                >
                  Criar Assunto
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
};
