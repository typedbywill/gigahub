import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LuActivity,
  LuArrowLeft,
  LuCheck,
  LuCopy,
  LuExternalLink,
  LuFolder,
  LuGitFork,
  LuGitMerge,
  LuInfo,
  LuNavigation,
  LuSparkles,
  LuUsers,
  LuWrench,
  LuX,
} from 'react-icons/lu';
import type {
  NearbyFiberAccessTerminalDto,
  NearbyFiberCableDto,
  NearbyFiberSpliceEnclosureDto,
} from '@gigahub/shared/contracts';
import { RadialMenu, type RadialMenuItem } from '../../shared/components/RadialMenu';
import { getContrastTextColor } from '../../shared/lib/color-contrast';
import type { CustomerMapPin } from './ProjectMap';

export type SelectedElementData =
  | { kind: 'fat'; data: NearbyFiberAccessTerminalDto }
  | { kind: 'cable'; data: NearbyFiberCableDto }
  | { kind: 'ceo'; data: NearbyFiberSpliceEnclosureDto }
  | {
      kind: 'customer';
      data: CustomerMapPin & { subtitle?: string; document?: string };
    };

export type NetworkElementPopupProps = {
  element: SelectedElementData;
  onClose: () => void;
  onOpenSplitting?: (fatId: string) => void;
  onOpenCustomers?: (fatId: string) => void;
};

export const NetworkElementPopup: React.FC<NetworkElementPopupProps> = ({
  element,
  onClose,
  onOpenSplitting,
  onOpenCustomers,
}) => {
  const [viewMode, setViewMode] = useState<'actions' | 'info'>('actions');
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedPort, setSelectedPort] = useState<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewMode === 'info') {
          setViewMode('actions');
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, viewMode]);

  const handleCopyCoordinates = useCallback(
    (latitude: number, longitude: number) => {
      const text = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      void navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    },
    [],
  );

  const handleAction = useCallback(
    (actionName: string) => {
      if (actionName === 'Splitagem') {
        if (element.kind === 'fat' && onOpenSplitting) {
          onOpenSplitting(element.data.idErp || element.data.id);
          return;
        }
      }
      if (actionName === 'Clientes') {
        if (element.kind === 'fat' && onOpenCustomers) {
          onOpenCustomers(element.data.idErp || element.data.id);
          return;
        }
      }
      setFeedback(actionName);
      setTimeout(() => setFeedback(null), 2500);
    },
    [element, onOpenSplitting, onOpenCustomers],
  );

  const getTitle = () => {
    if (element.kind === 'fat') return element.data.name;
    if (element.kind === 'cable') return element.data.name;
    if (element.kind === 'ceo') return element.data.name;
    return element.data.name;
  };

  const getKindLabel = () => {
    if (element.kind === 'fat') return 'CTO';
    if (element.kind === 'cable') return 'Cabo Óptico';
    if (element.kind === 'ceo') return 'CEO (Emenda)';
    return 'Cliente';
  };

  const getLocation = () => {
    if (element.kind === 'fat') return element.data.location;
    if (element.kind === 'ceo') return element.data.location;
    if (element.kind === 'cable') {
      const mid = Math.floor(element.data.path.length / 2);
      return element.data.path[mid] ?? element.data.path[0];
    }
    return {
      latitude: element.data.latitude,
      longitude: element.data.longitude,
    };
  };

  const loc = getLocation();

  const handleOpenNavigation = () => {
    if (!loc) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Specific bottom action configuration based on kind (NO GRADIENTS, NO INDIGO/PURPLE)
  const bottomAction = useMemo(() => {
    if (element.kind === 'fat') {
      return {
        label: 'Splitagem',
        icon: <LuGitFork className="size-6 text-white" />,
        bgColor: 'bg-amber-600 hover:bg-amber-500',
        onClick: () => handleAction('Splitagem'),
      };
    }
    if (element.kind === 'ceo' || element.kind === 'cable') {
      return {
        label: 'Fusões',
        icon: <LuGitMerge className="size-6 text-white" />,
        bgColor: 'bg-teal-700 hover:bg-teal-600',
        onClick: () => handleAction('Fusões'),
      };
    }
    return {
      label: 'Ordens',
      icon: <LuWrench className="size-6 text-white" />,
      bgColor: 'bg-emerald-600 hover:bg-emerald-500',
      onClick: () => handleAction('Ordens de Serviço'),
    };
  }, [element.kind, handleAction]);


  // Ports details calculation for FAT
  const fatPortDetails = useMemo(() => {
    if (element.kind !== 'fat') return null;
    const total = element.data.portCount ?? 16;
    const occupied = element.data.occupiedPortCount ?? 0;
    const available =
      element.data.availablePortCount ?? Math.max(0, total - occupied);
    const percent =
      total > 0 ? Math.min(100, Math.round((occupied / total) * 100)) : 0;

    const portsList = Array.from({ length: total }, (_, i) => {
      const portNumber = i + 1;
      const isOccupied = portNumber <= occupied;
      return {
        number: portNumber,
        isOccupied,
        label: `Porta ${portNumber.toString().padStart(2, '0')}`,
        status: isOccupied ? 'Cliente Ativo' : 'Porta Livre',
      };
    });

    return { total, occupied, available, percent, portsList };
  }, [element]);

  // Itens configurados para o Menu Radial (Distribuição uniforme, cores sólidas, tooltips no hover)
  const radialItems: RadialMenuItem[] = useMemo(() => {
    const commonItems: RadialMenuItem[] = [
      {
        id: 'info',
        label: 'Informações',
        icon: <LuInfo className="size-6" />,
        onClick: () => setViewMode('info'),
        colorScheme: 'sky',
        ariaLabel: 'Ver informações detalhadas',
      },
      {
        id: 'files',
        label: 'Arquivos',
        icon: <LuFolder className="size-6" />,
        onClick: () => handleAction('Arquivos'),
        colorScheme: 'emerald',
        ariaLabel: 'Ver arquivos do elemento',
      },
    ];

    if (element.kind === 'fat') {
      return [
        {
          id: 'splitting',
          label: 'Splitagem',
          icon: <LuGitFork className="size-6" />,
          onClick: () => handleAction('Splitagem'),
          colorScheme: 'amber',
          ariaLabel: 'Ver splitagem da CTO',
        },
        {
          id: 'customers',
          label: 'Clientes',
          icon: <LuUsers className="size-6" />,
          onClick: () => handleAction('Clientes'),
          colorScheme: 'slate',
          ariaLabel: 'Ver clientes da CTO',
          badge: fatPortDetails ? fatPortDetails.occupied : undefined,
        },
        ...commonItems,
      ];
    }

    return [
      ...commonItems,
      {
        id: 'bottom-action',
        label: bottomAction.label,
        icon: bottomAction.icon,
        onClick: bottomAction.onClick,
        bgColor: bottomAction.bgColor,
        ariaLabel: bottomAction.label,
      },
    ];
  }, [element, bottomAction, handleAction, fatPortDetails]);

  const elementIdFormatted =
    element.kind === 'fat' || element.kind === 'cable' || element.kind === 'ceo'
      ? `#${element.data.idErp || element.data.id}`
      : (element.data.document ?? `#${element.data.id}`);

  const elementThemeColor =
    element.kind === 'fat'
      ? element.data.mapColorHex || '#f59e0b'
      : element.kind === 'ceo'
        ? element.data.mapColorHex || '#0284c7'
        : element.kind === 'cable'
          ? element.data.strokeColorHex || '#0284c7'
          : '#10b981';

  const elementTextColor = getContrastTextColor(elementThemeColor);

  return (
    <div
      className="pointer-events-none relative flex items-center justify-center select-none"
      role="dialog"
      aria-label={`Opções de ${getTitle()}`}
    >
      {/* Container responsivo: 360x360 em modo radial action, expansível em modo info HUD */}
      <div
        className={`pointer-events-none relative h-[360px] transition-[width] duration-300 ${
          viewMode === 'actions' ? 'w-[360px]' : 'w-[360px] sm:w-[440px]'
        }`}
      >
        {/* ---------------------------------------------------- */}
        {/* VIEW 1: RADIAL ACTION BUTTONS MODE ('actions')        */}
        {/* ---------------------------------------------------- */}
        <AnimatePresence mode="wait">
          {viewMode === 'actions' ? (
            <motion.div
              key="view-actions"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none absolute inset-0 size-full"
            >
              <RadialMenu
                size={360}
                radius={105}
                startAngle={element.kind === 'fat' ? 45 : 90}
                onClose={onClose}
                header={
                  /* Apenas o Chip na cor da CTO com o ID centralizado e contraste dinâmico de texto */
                  <div
                    className="flex items-center justify-center px-4 py-1 rounded-full text-xs font-mono font-bold shadow-md border select-none cursor-default tracking-wide transition-colors"
                    style={{
                      backgroundColor: elementThemeColor,
                      color: elementTextColor,
                      borderColor: elementTextColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                    }}
                  >
                    {elementIdFormatted}
                  </div>
                }
                items={radialItems}
              />
            </motion.div>
          ) : (
            /* ---------------------------------------------------- */
            /* VIEW 2: MINIMALIST & SOPHISTICATED INFO HUD          */
            /* ---------------------------------------------------- */
            <motion.div
              key="view-info"
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto absolute inset-0 size-full flex items-center justify-center p-2"
            >
              <div className="w-[320px] max-w-full rounded-2xl border border-border/80 bg-surface/98 dark:bg-surface/95 p-4 shadow-2xl backdrop-blur-2xl space-y-3">
                {/* HUD Header */}
                <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                  <button
                    type="button"
                    aria-label="Voltar para ações"
                    onClick={() => setViewMode('actions')}
                    className="flex items-center gap-1 rounded-lg bg-default/60 hover:bg-default px-2 py-1 text-xs font-semibold text-foreground transition-all active:scale-95"
                  >
                    <LuArrowLeft className="size-3.5" />
                    <span>Voltar</span>
                  </button>

                  {/* Chip da CTO com contraste dinâmico */}
                  <div
                    className="px-3 py-0.5 rounded-full text-xs font-mono font-bold shadow-sm border transition-colors"
                    style={{
                      backgroundColor: elementThemeColor,
                      color: elementTextColor,
                      borderColor: elementTextColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                    }}
                  >
                    {elementIdFormatted}
                  </div>

                  <button
                    type="button"
                    aria-label="Fechar"
                    onClick={onClose}
                    className="flex size-6.5 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-default hover:text-foreground transition-colors"
                  >
                    <LuX className="size-4" />
                  </button>
                </div>

                {/* Element Title & Kind */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-muted mb-0.5">
                    <span className="font-semibold uppercase tracking-wider text-accent">
                      {getKindLabel()}
                    </span>
                    {loc ? (
                      <div className="flex items-center gap-1 font-mono text-[10px]">
                        <span>{loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}</span>
                        <button
                          type="button"
                          aria-label="Copiar coordenadas"
                          title={copied ? 'Copiado!' : 'Copiar coordenadas'}
                          onClick={() => handleCopyCoordinates(loc.latitude, loc.longitude)}
                          className="text-muted hover:text-foreground transition-colors"
                        >
                          {copied ? (
                            <LuCheck className="size-3 text-emerald-500" />
                          ) : (
                            <LuCopy className="size-3" />
                          )}
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <h3 className="text-sm font-bold text-foreground truncate" title={getTitle()}>
                    {getTitle()}
                  </h3>
                </div>

                {/* Specific Element Content */}
                {element.kind === 'fat' && fatPortDetails ? (
                  <div className="space-y-2.5">
                    {/* Capacidade & Mini Meter */}
                    <div className="rounded-xl bg-default/40 p-2.5 border border-border/50 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-foreground font-semibold">
                          <LuActivity className="size-3.5 text-accent" />
                          <span>Ocupação das Portas</span>
                        </div>
                        <span className="font-mono font-bold text-accent">
                          {fatPortDetails.occupied}/{fatPortDetails.total} ({fatPortDetails.percent}%)
                        </span>
                      </div>

                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-default/80">
                        <div
                          className={`h-full rounded-full transition-all ${
                            fatPortDetails.percent >= 90
                              ? 'bg-rose-500'
                              : fatPortDetails.percent >= 70
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                          }`}
                          style={{ width: `${fatPortDetails.percent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-muted pt-0.5">
                        <span>Disponíveis: <strong className="text-emerald-600 dark:text-emerald-400">{fatPortDetails.available}</strong></span>
                        <span>Clientes Ativos: <strong className="text-amber-600 dark:text-amber-400">{fatPortDetails.occupied}</strong></span>
                      </div>
                    </div>

                    {/* Matriz Compacta de Portas */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-muted">
                        <span>Matriz de Portas</span>
                        {selectedPort ? (
                          <span className="font-semibold text-accent">
                            P{selectedPort.toString().padStart(2, '0')}: {selectedPort <= fatPortDetails.occupied ? 'Ocupada' : 'Livre'}
                          </span>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-8 gap-1">
                        {fatPortDetails.portsList.map((p) => {
                          const isSelected = selectedPort === p.number;
                          return (
                            <button
                              key={p.number}
                              type="button"
                              onClick={() => setSelectedPort(isSelected ? null : p.number)}
                              title={`${p.label}: ${p.status}`}
                              className={`flex items-center justify-center rounded-md py-1 font-mono text-[10px] font-bold transition-all active:scale-90 ${
                                isSelected ? 'ring-2 ring-accent scale-105' : ''
                              } ${
                                p.isOccupied
                                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                              }`}
                            >
                              {p.number}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : element.kind === 'ceo' ? (
                  <div className="rounded-xl bg-default/40 p-2.5 border border-border/50 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Bandejas de Emenda:</span>
                      <span className="font-bold text-foreground font-mono">
                        {element.data.traysCount ?? 1}
                      </span>
                    </div>
                    {element.data.projectIdErp ? (
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Projeto ERP:</span>
                        <span className="font-semibold text-foreground">
                          #{element.data.projectIdErp}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : element.kind === 'cable' ? (
                  <div className="rounded-xl bg-default/40 p-2.5 border border-border/50 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Tipo do Cabo:</span>
                      <span className="font-semibold text-foreground">
                        {element.data.cableTypeName ?? 'Fibra'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Extensão:</span>
                      <span className="font-bold text-foreground font-mono">
                        {element.data.lengthMeters ? `${element.data.lengthMeters}m` : '—'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-default/40 p-2.5 border border-border/50 space-y-1 text-xs">
                    <span className="text-muted">Documento:</span>
                    <p className="font-mono font-bold text-foreground">
                      {element.data.document ?? '—'}
                    </p>
                  </div>
                )}

                {/* Bottom Actions Bar */}
                <div className="flex items-center gap-2 pt-1 border-t border-border/60">
                  {loc ? (
                    <button
                      type="button"
                      onClick={handleOpenNavigation}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-default/60 hover:bg-default py-2 text-xs font-semibold text-foreground transition-all active:scale-95"
                    >
                      <LuNavigation className="size-3.5 text-accent" />
                      <span>Traçar Rota</span>
                    </button>
                  ) : null}

                  {element.kind === 'fat' ? (
                    <button
                      type="button"
                      onClick={() => handleAction('Clientes')}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 py-2 text-xs font-semibold text-white shadow-sm transition-all active:scale-95"
                    >
                      <LuUsers className="size-3.5" />
                      <span>Ver Clientes</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={bottomAction.onClick}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl ${bottomAction.bgColor} py-2 text-xs font-semibold text-white shadow-sm transition-all active:scale-95`}
                    >
                      <div className="size-3.5">{bottomAction.icon}</div>
                      <span>{bottomAction.label}</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Feedback Banner */}
      <AnimatePresence>
        {feedback ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.92 }}
            transition={{ duration: 0.15 }}
            role="status"
            className="pointer-events-auto absolute -bottom-10 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 whitespace-nowrap rounded-2xl border border-accent/30 bg-surface/95 px-3.5 py-1.5 text-xs font-medium text-accent shadow-2xl backdrop-blur-xl"
          >
            <LuSparkles className="size-4 shrink-0 animate-pulse text-amber-500" />
            <span>
              Módulo <strong>{feedback}</strong> em desenvolvimento.
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
