import React, {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Chip,
  Dropdown,
  Input,
  Label,
  Modal,
  TextField,
} from '@heroui/react';
import { LuEllipsisVertical, LuPencil, LuPlus } from 'react-icons/lu';
import type { RoleListItemDto } from '@gigahub/shared/contracts';
import {
  DataTable,
  type DataTableColumn,
} from '../../shared/components/DataTable';
import { useAuthStore } from '../../shared/stores/auth.store';
import { ApiClientError } from '../../shared/api/auth.api';
import {
  createRoleRequest,
  listRolesRequest,
} from '../../shared/api/roles.api';
import { routes } from '../../shared/routes';

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const RoleActionsCell = React.memo(function RoleActionsCell({
  role,
}: {
  role: RoleListItemDto;
}) {
  const navigate = useNavigate();

  return (
    <Dropdown>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label={`Ações de ${role.name}`}
      >
        <LuEllipsisVertical className="size-4" />
      </Button>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu
          onAction={(key) => {
            if (key === 'edit') {
              navigate(routes.permissao(role.id), {
                state: { from: routes.permissoes },
              });
            }
          }}
        >
          <Dropdown.Item id="edit" textValue="Editar permissões">
            <LuPencil className="size-4 shrink-0 text-muted" />
            <Label>Editar permissões</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
});

export const PermissionsPage: React.FC = () => {
  const accessToken = useAuthStore((s) => s.accessToken);
  const navigate = useNavigate();

  const [items, setItems] = useState<RoleListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(0);
  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void listRolesRequest(accessToken, controller.signal)
      .then((result) => {
        startTransition(() => {
          setItems(result.items);
          setLoading(false);
        });
      })
      .catch((err: unknown) => {
        if (
          controller.signal.aborted ||
          (err instanceof DOMException && err.name === 'AbortError')
        ) {
          return;
        }
        setLoading(false);
        setError(
          err instanceof ApiClientError
            ? err.message
            : 'Não foi possível carregar as funções.',
        );
      });

    return () => controller.abort();
  }, [accessToken]);

  const handlePageSizeChange = useCallback((next: number) => {
    setPageSize((prev) => (prev === next ? prev : next));
  }, []);

  const applySearch = useCallback((value: string) => {
    setSearch(value.trim());
  }, []);

  const resetCreateForm = useCallback(() => {
    setCreateName('');
    setCreateSlug('');
    setSlugTouched(false);
    setCreateError(null);
  }, []);

  const openCreate = useCallback(() => {
    resetCreateForm();
    setCreateOpen(true);
  }, [resetCreateForm]);

  const onNameChange = useCallback(
    (value: string) => {
      setCreateName(value);
      if (!slugTouched) {
        setCreateSlug(slugify(value));
      }
    },
    [slugTouched],
  );

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accessToken) {
      return;
    }
    const name = createName.trim();
    const slug = createSlug.trim();
    if (!name || !slug) {
      setCreateError('Informe nome e slug.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const result = await createRoleRequest(accessToken, {
        name,
        slug,
        permissionIds: [],
      });
      setItems((prev) =>
        [...prev, result.role].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
      );
      setCreateOpen(false);
      resetCreateForm();
      navigate(routes.permissao(result.role.id), {
        state: { from: routes.permissoes },
      });
    } catch (err) {
      setCreateError(
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível criar a função.',
      );
    } finally {
      setCreating(false);
    }
  };

  const columns: DataTableColumn<RoleListItemDto>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Função',
        isRowHeader: true,
        cell: (row) => (
          <Link
            to={routes.permissao(row.id)}
            state={{ from: routes.permissoes }}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            {row.name}
          </Link>
        ),
      },
      {
        id: 'slug',
        header: 'Slug',
        cell: (row) => (
          <span className="font-mono text-xs text-muted">{row.slug}</span>
        ),
      },
      {
        id: 'permissions',
        header: 'Permissões',
        cell: (row) => (
          <Chip size="sm" variant="soft" color="accent">
            {row.permissionIds.length}
          </Chip>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: (row) => <RoleActionsCell role={row} />,
      },
    ],
    [],
  );

  const getRowId = useCallback((row: RoleListItemDto) => row.id, []);

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter(
      (role) =>
        role.name.toLowerCase().includes(q) ||
        role.slug.toLowerCase().includes(q) ||
        role.permissionIds.some((id) => id.toLowerCase().includes(q)),
    );
  }, [items, search]);

  const exportConfig = useMemo(
    () => ({
      filename: 'funcoes',
      title: 'Funções e permissões',
      columns: [
        {
          id: 'name',
          label: 'Função',
          value: (row: RoleListItemDto) => row.name,
        },
        {
          id: 'slug',
          label: 'Slug',
          value: (row: RoleListItemDto) => row.slug,
        },
        {
          id: 'permissions',
          label: 'Permissões',
          value: (row: RoleListItemDto) => row.permissionIds.length,
        },
      ],
      getRows: () => filteredItems,
    }),
    [filteredItems],
  );

  const visibleItems = useMemo(() => {
    if (pageSize < 1) {
      return filteredItems;
    }
    return filteredItems.slice(0, pageSize);
  }, [filteredItems, pageSize]);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col gap-3 overflow-hidden p-4 md:h-dvh md:gap-4 md:p-6 lg:p-8">
      {error ? (
        <p className="shrink-0 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <DataTable
        className="min-h-0 flex-1"
        fillHeight
        estimatedRowHeight={48}
        onPageSizeChange={handlePageSizeChange}
        ariaLabel="Lista de funções e permissões"
        leading={
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="font-display truncate text-xl font-bold text-foreground md:text-2xl">
              Permissões
            </h1>
          </div>
        }
        columns={columns}
        items={visibleItems}
        getRowId={getRowId}
        isLoading={loading}
        emptyMessage={
          search
            ? 'Nenhuma função encontrada com essa busca.'
            : 'Nenhuma função cadastrada.'
        }
        onSearchSubmit={applySearch}
        onSearchClear={() => applySearch('')}
        searchPlaceholder="Buscar por nome, slug ou permissão…"
        exportConfig={exportConfig}
        toolbarEnd={
          <Button size="sm" onPress={openCreate}>
            <LuPlus className="size-4" />
            Criar função
          </Button>
        }
        onRowAction={(key) => {
          navigate(routes.permissao(String(key)), {
            state: { from: routes.permissoes },
          });
        }}
      />

      <Modal>
        <Modal.Backdrop
          isOpen={createOpen}
          onOpenChange={(open) => {
            if (!open && !creating) {
              setCreateOpen(false);
              resetCreateForm();
            }
          }}
        >
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Nova função</Modal.Heading>
              </Modal.Header>
              <form
                onSubmit={(event) => {
                  void submitCreate(event);
                }}
              >
                <Modal.Body className="flex flex-col gap-4">
                  <p className="text-sm text-muted">
                    Crie uma função e depois escolha as permissões do catálogo.
                  </p>
                  <TextField
                    name="name"
                    isRequired
                    value={createName}
                    onChange={onNameChange}
                    className="flex flex-col gap-1.5"
                  >
                    <Label>Nome</Label>
                    <Input placeholder="Ex.: Auditor" autoFocus />
                  </TextField>
                  <TextField
                    name="slug"
                    isRequired
                    value={createSlug}
                    onChange={(value) => {
                      setSlugTouched(true);
                      setCreateSlug(value);
                    }}
                    className="flex flex-col gap-1.5"
                  >
                    <Label>Slug</Label>
                    <Input placeholder="ex.: auditor" className="font-mono" />
                  </TextField>
                  {createError ? (
                    <p className="text-sm text-danger" role="alert">
                      {createError}
                    </p>
                  ) : null}
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    slot="close"
                    variant="secondary"
                    isDisabled={creating}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" isPending={creating}>
                    Criar e editar permissões
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
};
