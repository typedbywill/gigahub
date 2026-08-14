import React, {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertDialog, Button, Dropdown, Label } from '@heroui/react';
import {
  LuBuilding2,
  LuEllipsisVertical,
  LuEye,
  LuUserX,
} from 'react-icons/lu';
import type { UserListItemDto } from '@gigahub/shared/contracts';
import {
  DataTable,
  type DataTableColumn,
  type DataTablePreset,
} from '../../shared/components/DataTable';
import { useAuthStore } from '../../shared/stores/auth.store';
import { ApiClientError } from '../../shared/api/auth.api';
import {
  inactivateUserRequest,
  listUsersRequest,
} from '../../shared/api/users.api';
import {
  parseUsersListSearch,
  toUsersListSearchParams,
  usersListHref,
  type UsersListSearchState,
  type UsersListStatusFilter,
} from './users-list-search';
import { routes } from '../../shared/routes';
import { Permissions } from '../../shared/permissions';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { getAvatarColor } from '../../shared/lib/avatar-color';

function statusLabel(status: UserListItemDto['status']): string {
  return status === 'active' ? 'Ativo' : 'Inativo';
}

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (!first) {
    return '?';
  }
  if (parts.length === 1 || !last) {
    return first.substring(0, 2).toUpperCase();
  }
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

const UserActionsCell = React.memo(function UserActionsCell({
  user,
  listHref,
  canInactivate,
  onInactivate,
}: {
  user: UserListItemDto;
  listHref: string;
  canInactivate: boolean;
  onInactivate: (user: UserListItemDto) => void;
}) {
  const navigate = useNavigate();

  return (
    <Dropdown>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label={`Ações de ${user.name}`}
      >
        <LuEllipsisVertical className="size-4" />
      </Button>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu
          onAction={(key) => {
            if (key === 'view') {
              navigate(routes.usuario(user.id), { state: { from: listHref } });
              return;
            }
            if (key === 'inactivate') {
              onInactivate(user);
            }
          }}
        >
          <Dropdown.Item id="view" textValue="Ver detalhes">
            <LuEye className="size-4 shrink-0 text-muted" />
            <Label>Ver detalhes</Label>
          </Dropdown.Item>
          {canInactivate && user.status === 'active' ? (
            <Dropdown.Item
              id="inactivate"
              textValue="Inativar"
              variant="danger"
            >
              <LuUserX className="size-4 shrink-0 text-danger" />
              <Label>Inativar</Label>
            </Dropdown.Item>
          ) : null}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
});

export const UsersListPage: React.FC = () => {
  const accessToken = useAuthStore((s) => s.accessToken);
  const canInactivate = useAuthStore((s) =>
    s.hasPermission(Permissions.UsersInactivate),
  );
  const [searchParams, setSearchParams] = useSearchParams();

  const listState = useMemo(
    () => parseUsersListSearch(searchParams),
    [searchParams],
  );
  const { q: search, status, erpLinked, page } = listState;
  const listHref = useMemo(() => usersListHref(listState), [listState]);

  const [items, setItems] = useState<UserListItemDto[]>([]);
  const [total, setTotal] = useState(0);
  /** 0 until DataTable measures available height. */
  const [pageSize, setPageSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingInactivate, setPendingInactivate] =
    useState<UserListItemDto | null>(null);
  const [inactivating, setInactivating] = useState(false);

  const patchListState = useCallback(
    (patch: Partial<UsersListSearchState>) => {
      const next: UsersListSearchState = { ...listState, ...patch };
      startTransition(() => {
        setSearchParams(toUsersListSearchParams(next), { replace: true });
      });
    },
    [listState, setSearchParams],
  );

  useEffect(() => {
    if (!accessToken || pageSize < 1) {
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void listUsersRequest(
      accessToken,
      {
        q: search || undefined,
        status,
        erpLinked,
        page,
        pageSize,
      },
      controller.signal,
    )
      .then((result) => {
        startTransition(() => {
          setItems(result.items);
          setTotal(result.total);
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
            : 'Não foi possível carregar os usuários.',
        );
      });

    return () => controller.abort();
  }, [accessToken, erpLinked, page, pageSize, search, status]);

  useEffect(() => {
    if (pageSize < 1 || total === 0) {
      return;
    }
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    if (page > maxPage) {
      patchListState({ page: maxPage });
    }
  }, [page, pageSize, patchListState, total]);

  const applySearch = useCallback(
    (value: string) => {
      patchListState({ q: value.trim(), page: 1 });
    },
    [patchListState],
  );

  const handlePageSizeChange = useCallback((next: number) => {
    setPageSize((prev) => (prev === next ? prev : next));
  }, []);

  const handlePageChange = useCallback(
    (next: number) => {
      patchListState({ page: next });
    },
    [patchListState],
  );

  const handleInactivate = useCallback((user: UserListItemDto) => {
    setPendingInactivate(user);
  }, []);

  const setStatusFilter = useCallback(
    (next: UsersListStatusFilter, nextErp?: boolean) => {
      patchListState({
        status: next,
        erpLinked: nextErp,
        page: 1,
      });
    },
    [patchListState],
  );

  const presets: DataTablePreset[] = useMemo(
    () => [
      {
        id: 'all',
        label: 'Todos',
        active: status === 'all' && erpLinked === undefined,
        onPress: () => setStatusFilter('all', undefined),
      },
      {
        id: 'active',
        label: 'Ativos',
        active: status === 'active' && erpLinked === undefined,
        onPress: () => setStatusFilter('active', undefined),
      },
      {
        id: 'blocked',
        label: 'Inativos',
        active: status === 'blocked' && erpLinked === undefined,
        onPress: () => setStatusFilter('blocked', undefined),
      },
      {
        id: 'erp',
        label: 'Com ERP',
        active: erpLinked === true,
        onPress: () =>
          patchListState({ erpLinked: true, page: 1 }),
      },
    ],
    [erpLinked, patchListState, setStatusFilter, status],
  );

  const columns: DataTableColumn<UserListItemDto>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Usuário',
        isRowHeader: true,
        cell: (row) => {
          const avatarColor = getAvatarColor(row.id ?? row.name);
          return (
            <div className="flex items-center gap-3">
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${avatarColor.bg} ${avatarColor.text}`}
                aria-hidden
              >
                {userInitials(row.name)}
              </span>
              <div className="flex min-w-0 flex-col">
                <Link
                  to={routes.usuario(row.id)}
                  state={{ from: listHref }}
                  className="truncate font-medium text-foreground underline-offset-2 hover:underline"
                >
                  {row.name}
                </Link>
                <span className="truncate text-xs text-muted">{row.email}</span>
              </div>
            </div>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => (
          <StatusBadge
            variant={row.status === 'active' ? 'active' : 'inactive'}
            showDot
          >
            {statusLabel(row.status)}
          </StatusBadge>
        ),
      },
      {
        id: 'jobTitle',
        header: 'Cargo',
        cell: (row) => (
          <span className="text-sm text-foreground/90">
            {row.jobTitle || '—'}
          </span>
        ),
      },
      {
        id: 'erp',
        header: 'Integração ERP',
        cell: (row) =>
          row.idErp ? (
            <StatusBadge variant="erp" icon={<LuBuilding2 />}>
              IXC #{row.idErp}
            </StatusBadge>
          ) : (
            <StatusBadge variant="neutral">Local</StatusBadge>
          ),
      },
      {
        id: 'actions',
        header: '',
        cell: (row) => (
          <UserActionsCell
            user={row}
            listHref={listHref}
            canInactivate={canInactivate}
            onInactivate={handleInactivate}
          />
        ),
      },
    ],
    [canInactivate, handleInactivate, listHref],
  );

  const getRowId = useCallback((row: UserListItemDto) => row.id, []);

  const exportConfig = useMemo(
    () => ({
      filename: 'usuarios',
      title: 'Usuários',
      columns: [
        { id: 'name', label: 'Nome', value: (row: UserListItemDto) => row.name },
        {
          id: 'email',
          label: 'E-mail',
          value: (row: UserListItemDto) => row.email,
        },
        {
          id: 'status',
          label: 'Status',
          value: (row: UserListItemDto) => statusLabel(row.status),
        },
        {
          id: 'jobTitle',
          label: 'Cargo',
          value: (row: UserListItemDto) => row.jobTitle ?? '',
        },
        {
          id: 'erp',
          label: 'ERP',
          value: (row: UserListItemDto) =>
            row.idErp ? row.idErp : 'Local',
        },
      ],
    }),
    [],
  );

  const pagination = useMemo(
    () => ({
      page,
      pageSize: pageSize || 1,
      total,
      onPageChange: handlePageChange,
    }),
    [handlePageChange, page, pageSize, total],
  );

  const confirmInactivate = async () => {
    if (!accessToken || !pendingInactivate) {
      return;
    }
    setInactivating(true);
    setError(null);
    try {
      await inactivateUserRequest(accessToken, pendingInactivate.id);
      setPendingInactivate(null);
      setItems((prev) =>
        prev.map((user) =>
          user.id === pendingInactivate.id
            ? { ...user, status: 'blocked' as const }
            : user,
        ),
      );
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível inativar o usuário.',
      );
    } finally {
      setInactivating(false);
    }
  };

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
        estimatedRowHeight={52}
        onPageSizeChange={handlePageSizeChange}
        ariaLabel="Lista de usuários"
        leading={
          <div className="flex items-center gap-2.5">
            <h1 className="font-display truncate text-xl font-bold text-foreground md:text-2xl">
              Usuários
            </h1>
            <span className="hidden rounded-full bg-muted/15 px-2.5 py-0.5 text-xs font-semibold text-muted sm:inline-block">
              {total}
            </span>
          </div>
        }
        columns={columns}
        items={items}
        getRowId={getRowId}
        isLoading={loading}
        emptyMessage="Nenhum usuário encontrado com esses filtros."
        searchValue={search}
        onSearchSubmit={applySearch}
        onSearchClear={() => applySearch('')}
        searchPlaceholder="Buscar por nome ou e-mail…"
        presets={presets}
        exportConfig={exportConfig}
        pagination={pagination}
      />

      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={pendingInactivate !== null}
          onOpenChange={(open) => {
            if (!open && !inactivating) {
              setPendingInactivate(null);
            }
          }}
        >
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-105">
              <AlertDialog.CloseTrigger />
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>Inativar usuário?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p className="text-sm text-muted">
                  {pendingInactivate
                    ? `${pendingInactivate.name} (${pendingInactivate.email}) será inativado no GigaHub${pendingInactivate.idErp ? ' e no IXC' : ''}. Sessões ativas serão encerradas.`
                    : null}
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button
                  slot="close"
                  variant="secondary"
                  isDisabled={inactivating}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  isPending={inactivating}
                  onPress={() => {
                    void confirmInactivate();
                  }}
                >
                  Inativar
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
};
