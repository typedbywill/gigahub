import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertDialog, Button, Chip, Spinner } from '@heroui/react';
import { LuArrowLeft } from 'react-icons/lu';
import type { UserDetailDto } from '@gigahub/shared/contracts';
import { useAuthStore } from '../../shared/stores/auth.store';
import { ApiClientError } from '../../shared/api/auth.api';
import {
  getUserRequest,
  inactivateUserRequest,
} from '../../shared/api/users.api';

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export const UserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [user, setUser] = useState<UserDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [inactivating, setInactivating] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !id) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const detail = await getUserRequest(accessToken, id);
      setUser(detail);
    } catch (err) {
      setUser(null);
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível carregar o usuário.',
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmInactivate = async () => {
    if (!accessToken || !user) {
      return;
    }
    setInactivating(true);
    setError(null);
    try {
      const result = await inactivateUserRequest(accessToken, user.id);
      setUser(result.user);
      setConfirmOpen(false);
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

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center p-8">
        <Spinner size="sm" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-4 p-6 md:p-8">
        <p className="text-sm text-danger" role="alert">
          {error ?? 'Usuário não encontrado.'}
        </p>
        <Button variant="secondary" onPress={() => navigate('/usuarios')}>
          Voltar para a lista
        </Button>
      </div>
    );
  }

  const fields: { label: string; value: string }[] = [
    { label: 'E-mail', value: user.email },
    { label: 'Cargo', value: user.jobTitle ?? '—' },
    { label: 'ID ERP', value: user.idErp ?? '—' },
    { label: 'ID Funcionário ERP', value: user.idErpEmployee ?? '—' },
    { label: 'Caixa', value: user.cashboxId ?? '—' },
    { label: 'Almoxarifado', value: user.warehouseId ?? '—' },
    { label: 'Planejamento', value: user.planningId ?? '—' },
    { label: 'Criado em', value: formatDate(user.createdAt) },
    { label: 'Atualizado em', value: formatDate(user.updatedAt) },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <Link
            to="/usuarios"
            className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-foreground"
          >
            <LuArrowLeft className="size-4" />
            Usuários
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-foreground">
              {user.name}
            </h1>
            <Chip
              size="sm"
              color={user.status === 'active' ? 'success' : 'danger'}
              variant="soft"
            >
              {user.status === 'active' ? 'Ativo' : 'Inativo'}
            </Chip>
          </div>
        </div>

        {user.status === 'active' ? (
          <AlertDialog isOpen={confirmOpen} onOpenChange={setConfirmOpen}>
            <Button variant="danger">Inativar usuário</Button>
            <AlertDialog.Backdrop>
              <AlertDialog.Container>
                <AlertDialog.Dialog className="sm:max-w-[420px]">
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header>
                    <AlertDialog.Icon status="danger" />
                    <AlertDialog.Heading>Inativar usuário?</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted">
                      {user.name} será inativado no GigaHub
                      {user.idErp ? ' e no IXC' : ''}. Sessões ativas serão
                      encerradas.
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
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <dl className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label} className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
              {field.label}
            </dt>
            <dd className="text-sm text-foreground">{field.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};
