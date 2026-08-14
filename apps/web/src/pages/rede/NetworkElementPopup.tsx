import React, { useCallback, useEffect, useState } from 'react';
import { Button, Tooltip } from '@heroui/react';
import {
  LuCable,
  LuCheck,
  LuCopy,
  LuExternalLink,
  LuFolder,
  LuGitFork,
  LuGitMerge,
  LuRadioTower,
  LuSparkles,
  LuUser,
  LuUsers,
  LuWrench,
  LuX,
} from 'react-icons/lu';
import type {
  NearbyFiberAccessTerminalDto,
  NearbyFiberCableDto,
} from '@gigahub/shared/contracts';
import type { CustomerMapPin } from './ProjectMap';

export type SelectedElementData =
  | { kind: 'fat'; data: NearbyFiberAccessTerminalDto }
  | { kind: 'cable'; data: NearbyFiberCableDto }
  | {
      kind: 'customer';
      data: CustomerMapPin & { subtitle?: string; document?: string };
    };

export type NetworkElementPopupProps = {
  element: SelectedElementData;
  onClose: () => void;
  onOpenSplitting?: (fatId: string) => void;
};

export const NetworkElementPopup: React.FC<NetworkElementPopupProps> = ({
  element,
  onClose,
  onOpenSplitting,
}) => {

  const [copied, setCopied] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopyCoordinates = useCallback(
    (latitude: number, longitude: number) => {
      const text = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      void navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    },
    [],
  );

  const handleButtonPlaceholder = useCallback((actionName: string) => {
    setActionFeedback(actionName);
    setTimeout(() => setActionFeedback(null), 2500);
  }, []);

  if (element.kind === 'fat') {
    const fat = element.data;
    const totalPorts = fat.portCount ?? 16;
    const occupied = fat.occupiedPortCount ?? 0;
    const available =
      fat.availablePortCount ?? Math.max(0, totalPorts - occupied);
    const occupancyPercent =
      totalPorts > 0 ? Math.min(100, Math.round((occupied / totalPorts) * 100)) : 0;

    const occupancyColor =
      occupancyPercent >= 90
        ? 'bg-danger'
        : occupancyPercent >= 70
          ? 'bg-warning'
          : 'bg-success';

    return (
      <div
        role="dialog"
        aria-modal="false"
        aria-label={`Detalhes da CTO ${fat.name}`}
        className="w-84 max-w-[90vw] overflow-hidden rounded-2xl border border-border/80 bg-surface/95 text-foreground shadow-2xl backdrop-blur-md transition-all sm:w-92"
      >
        {/* Header */}
        <div className="relative border-b border-border/60 p-3.5 pb-3">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-xl shadow-xs"
                style={{
                  backgroundColor: fat.mapColorHex || '#1e293b',
                  color: '#ffffff',
                }}
                aria-hidden
              >
                <LuRadioTower className="size-4.5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent uppercase tracking-wider">
                    CTO
                  </span>
                  <span className="text-[11px] font-medium text-muted">
                    ID: #{fat.idErp}
                  </span>
                </div>
                <h2
                  className="font-display mt-0.5 truncate text-sm font-bold text-foreground leading-tight"
                  title={fat.name}
                >
                  {fat.name}
                </h2>
              </div>
            </div>

            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label="Fechar detalhes da CTO"
              className="size-7 shrink-0 rounded-lg text-muted hover:text-foreground"
              onPress={onClose}
            >
              <LuX className="size-4" />
            </Button>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-3.5 p-3.5">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-border/50 bg-default/40 p-2 transition-colors">
              <span className="block text-[10px] font-medium text-muted uppercase tracking-wider">
                Total Portas
              </span>
              <span className="font-display mt-0.5 block text-base font-bold text-foreground">
                {totalPorts}
              </span>
            </div>

            <div className="rounded-xl border border-border/50 bg-default/40 p-2 transition-colors">
              <span className="block text-[10px] font-medium text-muted uppercase tracking-wider">
                Clientes
              </span>
              <span className="font-display mt-0.5 block text-base font-bold text-warning-foreground dark:text-warning">
                {occupied}
              </span>
            </div>

            <div className="rounded-xl border border-border/50 bg-default/40 p-2 transition-colors">
              <span className="block text-[10px] font-medium text-muted uppercase tracking-wider">
                Livres
              </span>
              <span className="font-display mt-0.5 block text-base font-bold text-success-foreground dark:text-success">
                {available}
              </span>
            </div>
          </div>

          {/* Occupancy bar */}
          <div className="space-y-1.5 rounded-xl border border-border/40 bg-default/20 p-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Ocupação das portas</span>
              <span className="font-semibold text-foreground">
                {occupancyPercent}%
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-default/60"
              role="progressbar"
              aria-valuenow={occupancyPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Ocupação da CTO"
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${occupancyColor}`}
                style={{ width: `${occupancyPercent}%` }}
              />
            </div>
          </div>

          {/* Coordinates & Location */}
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-default/20 px-2.5 py-1.5 text-xs text-muted">
            <div className="truncate">
              <span className="font-mono text-[11px] text-foreground">
                {fat.location.latitude.toFixed(5)},{' '}
                {fat.location.longitude.toFixed(5)}
              </span>
              {fat.distanceMeters != null ? (
                <span className="ml-1.5 text-[10px] text-muted">
                  ({Math.round(fat.distanceMeters)}m)
                </span>
              ) : null}
            </div>

            <Tooltip content={copied ? 'Copiado!' : 'Copiar coordenadas'}>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label="Copiar coordenadas"
                className="size-6 shrink-0 rounded-md text-muted hover:text-foreground"
                onPress={() =>
                  handleCopyCoordinates(
                    fat.location.latitude,
                    fat.location.longitude,
                  )
                }
              >
                {copied ? (
                  <LuCheck className="size-3 text-success" />
                ) : (
                  <LuCopy className="size-3" />
                )}
              </Button>
            </Tooltip>
          </div>

          {/* Action Feedback Banner (if user clicks placeholder buttons) */}
          {actionFeedback ? (
            <div
              role="status"
              className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent animate-fadeIn"
            >
              <LuSparkles className="size-3.5 shrink-0" />
              <span>
                Módulo <strong>{actionFeedback}</strong> em desenvolvimento.
              </span>
            </div>
          ) : null}

          {/* Action Buttons requested by user */}
          <div className="pt-0.5">
            <p className="mb-1.5 px-0.5 text-[11px] font-semibold text-muted uppercase tracking-wider">
              Ações Rápidas
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                className="flex items-center justify-center gap-1.5 font-medium shadow-xs hover:bg-default"
                onPress={() => handleButtonPlaceholder('Clientes')}
                aria-label="Ver clientes da CTO"
              >
                <LuUsers className="size-3.5 text-amber-500 dark:text-amber-400" />
                <span>Clientes</span>
              </Button>

              <Button
                size="sm"
                variant="secondary"
                className="flex items-center justify-center gap-1.5 font-medium shadow-xs hover:bg-default"
                onPress={() => {
                  if (element.kind === 'fat' && onOpenSplitting) {
                    onOpenSplitting(element.data.idErp || element.data.id);
                  } else {
                    handleButtonPlaceholder('Splitagem');
                  }
                }}
                aria-label="Ver splitagem da CTO"
              >
                <LuGitFork className="size-3.5 text-sky-500 dark:text-sky-400" />
                <span>Splitagem</span>
              </Button>


              <Button
                size="sm"
                variant="secondary"
                className="flex items-center justify-center gap-1.5 font-medium shadow-xs hover:bg-default"
                onPress={() => handleButtonPlaceholder('Arquivos')}
                aria-label="Ver arquivos da CTO"
              >
                <LuFolder className="size-3.5 text-emerald-500 dark:text-emerald-400" />
                <span>Arquivos</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (element.kind === 'cable') {
    const cable = element.data;
    const centerPoint =
      cable.path[Math.floor(cable.path.length / 2)] ?? cable.path[0];

    return (
      <div
        role="dialog"
        aria-modal="false"
        aria-label={`Detalhes do cabo ${cable.name}`}
        className="w-84 max-w-[90vw] overflow-hidden rounded-2xl border border-border/80 bg-surface/95 text-foreground shadow-2xl backdrop-blur-md transition-all sm:w-92"
      >
        {/* Header */}
        <div className="relative border-b border-border/60 p-3.5 pb-3">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-xl shadow-xs"
                style={{
                  backgroundColor: cable.strokeColorHex || '#0284c7',
                  color: '#ffffff',
                }}
                aria-hidden
              >
                <LuCable className="size-4.5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent uppercase tracking-wider">
                    Cabo Óptico
                  </span>
                  <span className="text-[11px] font-medium text-muted">
                    ID: #{cable.idErp}
                  </span>
                </div>
                <h2
                  className="font-display mt-0.5 truncate text-sm font-bold text-foreground leading-tight"
                  title={cable.name}
                >
                  {cable.name}
                </h2>
              </div>
            </div>

            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label="Fechar detalhes do cabo"
              className="size-7 shrink-0 rounded-lg text-muted hover:text-foreground"
              onPress={onClose}
            >
              <LuX className="size-4" />
            </Button>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-3.5 p-3.5">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl border border-border/50 bg-default/40 p-2 transition-colors">
              <span className="block text-[10px] font-medium text-muted uppercase tracking-wider">
                Tipo
              </span>
              <span className="font-display mt-0.5 block truncate text-xs font-bold text-foreground">
                {cable.cableTypeName ?? 'Fibra Óptica'}
              </span>
            </div>

            <div className="rounded-xl border border-border/50 bg-default/40 p-2 transition-colors">
              <span className="block text-[10px] font-medium text-muted uppercase tracking-wider">
                Comprimento
              </span>
              <span className="font-display mt-0.5 block text-xs font-bold text-sky-600 dark:text-sky-400">
                {cable.lengthMeters ? `${cable.lengthMeters} m` : '—'}
              </span>
            </div>
          </div>

          {/* Coordinates */}
          {centerPoint ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-default/20 px-2.5 py-1.5 text-xs text-muted">
              <div className="truncate font-mono text-[11px] text-foreground">
                {centerPoint.latitude.toFixed(5)},{' '}
                {centerPoint.longitude.toFixed(5)}
              </div>

              <Tooltip content={copied ? 'Copiado!' : 'Copiar coordenadas'}>
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  aria-label="Copiar coordenadas"
                  className="size-6 shrink-0 rounded-md text-muted hover:text-foreground"
                  onPress={() =>
                    handleCopyCoordinates(
                      centerPoint.latitude,
                      centerPoint.longitude,
                    )
                  }
                >
                  {copied ? (
                    <LuCheck className="size-3 text-success" />
                  ) : (
                    <LuCopy className="size-3" />
                  )}
                </Button>
              </Tooltip>
            </div>
          ) : null}

          {/* Action Feedback Banner */}
          {actionFeedback ? (
            <div
              role="status"
              className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent"
            >
              <LuSparkles className="size-3.5 shrink-0" />
              <span>
                Módulo <strong>{actionFeedback}</strong> em desenvolvimento.
              </span>
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="pt-0.5">
            <p className="mb-1.5 px-0.5 text-[11px] font-semibold text-muted uppercase tracking-wider">
              Ações Rápidas
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                className="flex items-center justify-center gap-1.5 font-medium shadow-xs hover:bg-default"
                onPress={() => handleButtonPlaceholder('Fibras / Tubos')}
                aria-label="Ver fibras do cabo"
              >
                <LuCable className="size-3.5 text-sky-500 dark:text-sky-400" />
                <span className="truncate">Fibras</span>
              </Button>

              <Button
                size="sm"
                variant="secondary"
                className="flex items-center justify-center gap-1.5 font-medium shadow-xs hover:bg-default"
                onPress={() => handleButtonPlaceholder('Fusões')}
                aria-label="Ver fusões do cabo"
              >
                <LuGitMerge className="size-3.5 text-purple-500 dark:text-purple-400" />
                <span className="truncate">Fusões</span>
              </Button>

              <Button
                size="sm"
                variant="secondary"
                className="flex items-center justify-center gap-1.5 font-medium shadow-xs hover:bg-default"
                onPress={() => handleButtonPlaceholder('Arquivos')}
                aria-label="Ver arquivos do cabo"
              >
                <LuFolder className="size-3.5 text-emerald-500 dark:text-emerald-400" />
                <span className="truncate">Arquivos</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Customer Pin Popup
  const customer = element.data;
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={`Detalhes do cliente ${customer.name}`}
      className="w-84 max-w-[90vw] overflow-hidden rounded-2xl border border-border/80 bg-surface/95 text-foreground shadow-2xl backdrop-blur-md transition-all sm:w-92"
    >
      {/* Header */}
      <div className="relative border-b border-border/60 p-3.5 pb-3">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs"
              aria-hidden
            >
              <LuUser className="size-4.5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Cliente
                </span>
                <span className="text-[11px] font-medium text-muted">
                  ID: #{customer.id}
                </span>
              </div>
              <h2
                className="font-display mt-0.5 truncate text-sm font-bold text-foreground leading-tight"
                title={customer.name}
              >
                {customer.name}
              </h2>
            </div>
          </div>

          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label="Fechar detalhes do cliente"
            className="size-7 shrink-0 rounded-lg text-muted hover:text-foreground"
            onPress={onClose}
          >
            <LuX className="size-4" />
          </Button>
        </div>
      </div>

      {/* Content Body */}
      <div className="space-y-3.5 p-3.5">
        {customer.subtitle || customer.document ? (
          <div className="rounded-xl border border-border/50 bg-default/40 p-2.5">
            <span className="block text-[10px] font-medium text-muted uppercase tracking-wider">
              Documento / Identificação
            </span>
            <span className="font-mono mt-0.5 block text-xs font-semibold text-foreground">
              {customer.subtitle || customer.document}
            </span>
          </div>
        ) : null}

        {/* Coordinates */}
        <div className="flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-default/20 px-2.5 py-1.5 text-xs text-muted">
          <div className="truncate font-mono text-[11px] text-foreground">
            {customer.latitude.toFixed(5)}, {customer.longitude.toFixed(5)}
          </div>

          <Tooltip content={copied ? 'Copiado!' : 'Copiar coordenadas'}>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label="Copiar coordenadas"
              className="size-6 shrink-0 rounded-md text-muted hover:text-foreground"
              onPress={() =>
                handleCopyCoordinates(customer.latitude, customer.longitude)
              }
            >
              {copied ? (
                <LuCheck className="size-3 text-success" />
              ) : (
                <LuCopy className="size-3" />
              )}
            </Button>
          </Tooltip>
        </div>

        {/* Action Feedback Banner */}
        {actionFeedback ? (
          <div
            role="status"
            className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent"
          >
            <LuSparkles className="size-3.5 shrink-0" />
            <span>
              Módulo <strong>{actionFeedback}</strong> em desenvolvimento.
            </span>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="pt-0.5">
          <p className="mb-1.5 px-0.5 text-[11px] font-semibold text-muted uppercase tracking-wider">
            Ações
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              className="flex items-center justify-center gap-1.5 font-medium shadow-xs hover:bg-default"
              onPress={() => handleButtonPlaceholder('Ver Cadastro')}
              aria-label="Abrir cadastro do cliente"
            >
              <LuExternalLink className="size-3.5 text-emerald-500 dark:text-emerald-400" />
              <span>Ver Cadastro</span>
            </Button>

            <Button
              size="sm"
              variant="secondary"
              className="flex items-center justify-center gap-1.5 font-medium shadow-xs hover:bg-default"
              onPress={() => handleButtonPlaceholder('Ordens de Serviço')}
              aria-label="Ver ordens de serviço do cliente"
            >
              <LuWrench className="size-3.5 text-amber-500 dark:text-amber-400" />
              <span>Ordens</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
