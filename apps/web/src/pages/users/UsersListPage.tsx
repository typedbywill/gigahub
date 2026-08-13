import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertDialog, Button, Chip } from '@heroui/react';
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

type StatusFilter = 'all' | 'active' | 'blocked';

function statusLabel(status: UserListItemDto['status']): string {
  return status === 'active' ? 'Ativo' : 'Inativo';
}

export const UsersListPage: React.FC = () => {
  const accessToken = useAuthStore((s) => s.accessToken);

  const [items, setItems] = useState<UserListItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  /** 0 until DataTable measures available height. */
  const [pageSize, setPageSize] = useState(0);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [erpLinked, setErpLinked] = useState<boolean | undefined>(undefined);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingInactivate, setPendingInactivate] =
    useState<UserListItemDto | null>(null);
  const [inactivating, setInactivating] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || pageSize < 1) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listUsersRequest(accessToken, {
        q: search || undefined,
        status,
        erpLinked,
        page,
        pageSize,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível carregar os usuários.',
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, erpLinked, page, pageSize, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const applySearch = (value: string) => {
    setPage(1);
    setSearch(value.trim());
  };

  const handlePageSizeChange = useCallback((next: number) => {
    setPageSize((prev) => {
      if (prev === next) {
        return prev;
      }
      setPage(1);
      return next;
    });
  }, []);

  const presets: DataTablePreset[] = [
    {
      id: 'all',
      label: 'Todos',
      active: status === 'all' && erpLinked === undefined,
      onPress: () => {
        setStatus('all');
        setErpLinked(undefined);
        setPage(1);
      },
    },
    {
      id: 'active',
      label: 'Ativos',
      active: status === 'active' && erpLinked === undefined,
      onPress: () => {
        setStatus('active');
        setErpLinked(undefined);
        setPage(1);
      },
    },
    {
      id: 'blocked',
      label: 'Inativos',
      active: status === 'blocked' && erpLinked === undefined,
      onPress: () => {
        setStatus('blocked');
        setErpLinked(undefined);
        setPage(1);
      },
    },
    {
      id: 'erp',
      label: 'Com ERP',
      active: erpLinked === true,
      onPress: () => {
        setErpLinked(true);
        setPage(1);
      },
    },
  ];

  const columns: DataTableColumn<UserListItemDto>[] = [
    {
      id: 'name',
      header: 'Nome',
      isRowHeader: true,
      cell: (row) => (
        <Link
          to={`/usuarios/${row.id}`}
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          {row.name}
        </Link>
      ),
    },
    {
      id: 'email',
      header: 'E-mail',
      cell: (row) => row.email,
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => (
        <Chip
          size="sm"
          color={row.status === 'active' ? 'success' : 'danger'}
          variant="soft"
        >
          {statusLabel(row.status)}
        </Chip>
      ),
    },
    {
      id: 'jobTitle',
      header: 'Cargo',
      cell: (row) => row.jobTitle ?? '—',
    },
    {
      id: 'erp',
      header: 'ERP',
      cell: (row) => (row.idErp ? `IXC #${row.idErp}` : 'Local'),
    },
    {
      id: 'actions',
      header: 'Ações',
      cell: (row) =>
        row.status === 'active' ? (
          <Button
            size="sm"
            variant="danger"
            onPress={() => setPendingInactivate(row)}
          >
            Inativar
          </Button>
        ) : (
          <span className="text-sm text-muted">—</span>
        ),
    },
  ];

  const confirmInactivate = async () => {
    if (!accessToken || !pendingInactivate) {
      return;
    }
    setInactivating(true);
    setError(null);
    try {
      await inactivateUserRequest(accessToken, pendingInactivate.id);
      setPendingInactivate(null);
      await load();
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
        estimatedRowHeight={48}
        onPageSizeChange={handlePageSizeChange}
        ariaLabel="Lista de usuários"
        leading={
          <h1 className="font-display truncate text-xl font-bold text-foreground md:text-2xl">
            Usuários
          </h1>
        }
        columns={columns}
        items={items}
        getRowId={(row) => row.id}
        isLoading={loading}
        emptyMessage="Nenhum usuário encontrado com esses filtros."
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={applySearch}
        onSearchClear={() => {
          setSearchInput('');
          applySearch('');
        }}
        searchPlaceholder="Buscar por nome ou e-mail…"
        presets={presets}
        pagination={{
          page,
          pageSize: pageSize || 1,
          total,
          onPageChange: setPage,
        }}
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
