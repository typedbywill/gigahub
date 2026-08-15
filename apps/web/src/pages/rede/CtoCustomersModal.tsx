import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Button,
  Input,
  Spinner,
  Tooltip,
} from '@heroui/react';
import {
  LuCircleAlert,
  LuCheck,
  LuCopy,
  LuMapPin,
  LuRefreshCw,
  LuSearch,
  LuUsers,
  LuX,
  LuRadio,
} from 'react-icons/lu';
import type {
  CtoCustomerDto,
  CtoCustomersResponseDto,
  OpticalSignalQualityDto,
} from '@gigahub/shared/contracts';
import { getCtoCustomersRequest } from '../../shared/api/projeto.api';
import { useAuthStore } from '../../shared/stores/auth.store';
import { getContrastTextColor } from '../../shared/lib/color-contrast';

interface CtoCustomersModalProps {
  fatId: string | null;
  onClose: () => void;
}

type FilterStatus = 'all' | 'occupied' | 'available' | 'online' | 'offline';

export const CtoCustomersModal: React.FC<CtoCustomersModalProps> = ({
  fatId,
  onClose,
}) => {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [data, setData] = useState<CtoCustomersResponseDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const fetchCustomers = useCallback(
    async (signal?: AbortSignal) => {
      if (!fatId || !accessToken) return;
      setLoading(true);
      setError(null);
      try {
        const response = await getCtoCustomersRequest(accessToken, fatId, signal);
        setData(response);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(
          err instanceof Error
            ? err.message
            : 'Não foi possível carregar os clientes da CTO.',
        );
      } finally {
        setLoading(false);
      }
    },
    [accessToken, fatId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchCustomers(controller.signal);
    return () => controller.abort();
  }, [fetchCustomers]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopy = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Matriz completa de portas (1..totalPorts)
  const fullPortMatrix = useMemo(() => {
    if (!data) return [];
    const customerMap = new Map<number, CtoCustomerDto>();
    data.customers.forEach((c) => customerMap.set(c.portaFtth, c));

    return Array.from({ length: data.totalPorts }, (_, i) => {
      const portNumber = i + 1;
      const customer = customerMap.get(portNumber);
      return {
        portNumber,
        isOccupied: Boolean(customer),
        customer,
      };
    });
  }, [data]);

  // Portas filtradas por busca e status
  const filteredPorts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return fullPortMatrix.filter((item) => {
      // Filtro de status
      if (filterStatus === 'occupied' && !item.isOccupied) return false;
      if (filterStatus === 'available' && item.isOccupied) return false;
      if (filterStatus === 'online' && (!item.customer || !item.customer.online))
        return false;
      if (filterStatus === 'offline' && (!item.customer || item.customer.online))
        return false;

      // Filtro textual
      if (!query) return true;

      const portMatch =
        `porta ${item.portNumber}`.includes(query) ||
        `p${item.portNumber}`.includes(query) ||
        `${item.portNumber}` === query;
      if (portMatch) return true;

      if (!item.customer) return false;

      return (
        item.customer.razaoSocial.toLowerCase().includes(query) ||
        (item.customer.nomeFantasia?.toLowerCase().includes(query) ?? false) ||
        (item.customer.cpfCnpj?.toLowerCase().includes(query) ?? false) ||
        item.customer.login.toLowerCase().includes(query) ||
        (item.customer.contratoId?.toLowerCase().includes(query) ?? false) ||
        (item.customer.endereco?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [fullPortMatrix, searchQuery, filterStatus]);

  if (!fatId) return null;

  const occupancyRate =
    data && data.totalPorts > 0
      ? Math.min(100, Math.round((data.occupiedPorts / data.totalPorts) * 100))
      : 0;

  const getSignalBadge = (quality: OpticalSignalQualityDto, rxDbm: number) => {
    let colorClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    let label = 'Excelente';

    switch (quality) {
      case 'EXCELLENT':
        colorClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
        label = 'Excelente';
        break;
      case 'GOOD':
        colorClass = 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
        label = 'Bom';
        break;
      case 'WARNING':
        colorClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
        label = 'Atenção';
        break;
      case 'CRITICAL':
        colorClass = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
        label = 'Crítico';
        break;
      case 'OFFLINE':
        colorClass = 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20';
        label = 'Offline';
        break;
    }

    return (
      <Tooltip
        content={
          <div className="p-1 text-xs">
            <div className="font-semibold">{label} ({rxDbm.toFixed(2)} dBm)</div>
            <div className="text-muted text-[11px] mt-0.5">Sinal óptico na ONU</div>
          </div>
        }
      >
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold border ${colorClass}`}
        >
          <LuRadio className="size-3" />
          {quality === 'OFFLINE' ? 'OFFLINE' : `${rxDbm.toFixed(1)} dBm`}
        </span>
      </Tooltip>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 backdrop-blur-md bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cto-customers-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative flex flex-col w-full max-w-4xl max-h-[88vh] rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden"
      >
        {/* HEADER LIMPO COM CHIP DA CTO MINIMALISTA */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 bg-surface">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-default/70 text-foreground">
              <LuUsers className="size-5 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="cto-customers-title"
                  className="text-base font-bold text-foreground leading-none"
                >
                  {data?.fatName || `CTO #${fatId}`}
                </h2>
                {/* Chip da CTO com cor da CTO e ID centralizado com contraste dinâmico de texto */}
                <span
                  className="inline-flex items-center justify-center px-3 py-0.5 rounded-full text-xs font-mono font-bold shadow-sm border transition-colors"
                  style={{
                    backgroundColor: '#d97706',
                    color: getContrastTextColor('#d97706'),
                    borderColor: 'rgba(255,255,255,0.2)',
                  }}
                >
                  #{fatId}
                </span>
              </div>
              <p className="text-xs text-muted mt-1">
                Clientes e conexões ativas nas portas FTTH
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              isIconOnly
              size="sm"
              variant="flat"
              aria-label="Atualizar dados"
              onClick={() => void fetchCustomers()}
              isLoading={loading}
              className="rounded-lg"
            >
              <LuRefreshCw className="size-4" />
            </Button>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              aria-label="Fechar"
              onClick={onClose}
              className="rounded-lg text-muted hover:text-foreground"
            >
              <LuX className="size-5" />
            </Button>
          </div>
        </div>

        {/* METRICS & FILTERS BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-b border-border bg-default/30">
          {/* Métricas de Ocupação */}
          {data ? (
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-muted">Ocupação:</span>
                <span className="font-bold text-foreground font-mono">
                  {data.occupiedPorts}/{data.totalPorts}
                </span>
                <span className="text-muted font-mono">({occupancyRate}%)</span>
              </div>
              <div className="h-2 w-24 overflow-hidden rounded-full bg-default/80">
                <div
                  className={`h-full rounded-full transition-all ${
                    occupancyRate >= 90
                      ? 'bg-rose-500'
                      : occupancyRate >= 70
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  }`}
                  style={{ width: `${occupancyRate}%` }}
                />
              </div>
            </div>
          ) : null}

          {/* Filtros rápidos de Status */}
          <div className="flex items-center rounded-lg bg-default/60 p-0.5 border border-border/60 text-xs">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 font-semibold rounded-md transition-colors ${
                filterStatus === 'all'
                  ? 'bg-surface text-foreground shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Todas ({data?.totalPorts ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('occupied')}
              className={`px-3 py-1 font-semibold rounded-md transition-colors ${
                filterStatus === 'occupied'
                  ? 'bg-surface text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Ocupadas ({data?.occupiedPorts ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('available')}
              className={`px-3 py-1 font-semibold rounded-md transition-colors ${
                filterStatus === 'available'
                  ? 'bg-surface text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Livres ({data?.availablePorts ?? 0})
            </button>
          </div>
        </div>

        {/* CAMPO DE BUSCA RÁPIDA */}
        <div className="px-5 py-2.5 border-b border-border/50 bg-surface">
          <Input
            size="sm"
            placeholder="Buscar por nome, documento, login ou número da porta..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            isClearable
            startContent={<LuSearch className="size-4 text-muted" />}
            aria-label="Buscar clientes"
            classNames={{
              inputWrapper: 'rounded-xl bg-default/40 hover:bg-default/60 border border-border/60',
            }}
          />
        </div>

        {/* LISTAGEM DE PORTAS E CLIENTES */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-[320px]">
          {loading && !data ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Spinner size="md" color="default" />
              <span className="text-xs font-medium text-muted">
                Carregando conexões da CTO...
              </span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 mb-2">
                <LuCircleAlert className="size-5" />
              </div>
              <h3 className="text-sm font-bold text-foreground">
                Não foi possível carregar os clientes
              </h3>
              <p className="text-xs text-muted max-w-sm mt-1">{error}</p>
              <Button
                size="sm"
                variant="flat"
                onClick={() => void fetchCustomers()}
                className="mt-3 rounded-lg"
              >
                Tentar novamente
              </Button>
            </div>
          ) : filteredPorts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted">
              <LuUsers className="size-8 stroke-[1.5] mb-2 opacity-40" />
              <p className="text-sm font-semibold text-foreground">
                Nenhum cliente ou porta encontrado
              </p>
              <p className="text-xs mt-0.5">
                Tente ajustar os termos de busca ou o filtro selecionado.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPorts.map((item) => (
                <div
                  key={item.portNumber}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:px-4 rounded-xl border transition-colors ${
                    item.isOccupied
                      ? 'border-border bg-surface hover:bg-default/20'
                      : 'border-dashed border-border/60 bg-default/10 text-muted'
                  }`}
                >
                  {/* Identificação da Porta e Dados do Cliente */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div
                      className={`flex size-9 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold border ${
                        item.isOccupied
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      P{item.portNumber.toString().padStart(2, '0')}
                    </div>

                    {item.customer ? (
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-foreground text-sm truncate">
                            {item.customer.razaoSocial}
                          </h4>
                          {item.customer.nomeFantasia ? (
                            <span className="text-xs text-muted truncate">
                              ({item.customer.nomeFantasia})
                            </span>
                          ) : null}
                          {item.customer.online ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              <span className="size-1.5 rounded-full bg-emerald-500" />
                              Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-500 bg-zinc-500/10 px-2 py-0.5 rounded-full">
                              <span className="size-1.5 rounded-full bg-zinc-400" />
                              Offline
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-muted">
                          {item.customer.cpfCnpj ? (
                            <span className="font-mono">{item.customer.cpfCnpj}</span>
                          ) : null}
                          <span>
                            Login: <strong className="text-foreground font-mono">{item.customer.login}</strong>
                          </span>
                          {item.customer.contratoId ? (
                            <span>
                              Contrato: #{item.customer.contratoId}
                            </span>
                          ) : null}
                        </div>

                        {item.customer.endereco ? (
                          <div className="flex items-center gap-1 text-[11px] text-muted mt-0.5 truncate">
                            <LuMapPin className="size-3 shrink-0" />
                            <span className="truncate">{item.customer.endereco}</span>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          Porta Livre
                        </span>
                        <p className="text-[11px] text-muted">
                          Disponível para nova ativação de assinante
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Sinal Óptico e Ação de Copiar */}
                  {item.customer ? (
                    <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 shrink-0">
                      {getSignalBadge(
                        item.customer.signal.quality,
                        item.customer.signal.rxPowerDbm,
                      )}

                      <Tooltip content={copiedText === item.customer.login ? 'Copiado!' : 'Copiar Login'}>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="flat"
                          aria-label="Copiar login do cliente"
                          onClick={() => handleCopy(item.customer!.login, item.customer!.login)}
                          className="rounded-lg text-muted hover:text-foreground"
                        >
                          {copiedText === item.customer.login ? (
                            <LuCheck className="size-3.5 text-emerald-500" />
                          ) : (
                            <LuCopy className="size-3.5" />
                          )}
                        </Button>
                      </Tooltip>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-surface text-xs text-muted">
          <span>
            Mostrando <strong>{filteredPorts.length}</strong> de{' '}
            <strong>{data?.totalPorts ?? 0}</strong> portas
          </span>
          <Button size="sm" variant="flat" onClick={onClose} className="rounded-lg">
            Fechar
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
