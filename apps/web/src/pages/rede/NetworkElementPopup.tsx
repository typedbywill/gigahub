import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LuActivity,

  LuArrowLeft,
  LuCable,
  LuCheck,
  LuCircleDot,
  LuCopy,
  LuExternalLink,
  LuFolder,
  LuGitFork,
  LuGitMerge,
  LuInfo,
  LuNavigation,
  LuRadioTower,
  LuSparkles,
  LuUser,
  LuWrench,
  LuX,
} from 'react-icons/lu';
import type {
  NearbyFiberAccessTerminalDto,
  NearbyFiberCableDto,
  NearbyFiberSpliceEnclosureDto,
} from '@gigahub/shared/contracts';
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
};

export const NetworkElementPopup: React.FC<NetworkElementPopupProps> = ({
  element,
  onClose,
  onOpenSplitting,
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
      setFeedback(actionName);
      setTimeout(() => setFeedback(null), 2500);
    },
    [element, onOpenSplitting],
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

  // Specific bottom action configuration based on kind
  const bottomAction =
    element.kind === 'fat'
      ? {
          label: 'Splitagem',
          icon: <LuGitFork className="size-6 text-white" />,
          gradient: 'from-amber-400 to-orange-500 shadow-amber-500/25',
          onClick: () => handleAction('Splitagem'),
        }
      : element.kind === 'ceo'
        ? {
            label: 'Fusões',
            icon: <LuGitMerge className="size-6 text-white" />,
            gradient: 'from-purple-500 to-indigo-600 shadow-purple-500/25',
            onClick: () => handleAction('Fusões'),
          }
        : element.kind === 'cable'
          ? {
              label: 'Fusões',
              icon: <LuGitMerge className="size-6 text-white" />,
              gradient: 'from-purple-400 to-indigo-500 shadow-purple-500/25',
              onClick: () => handleAction('Fusões'),
            }
          : {
              label: 'Ordens',
              icon: <LuWrench className="size-6 text-white" />,
              gradient: 'from-emerald-400 to-teal-500 shadow-emerald-500/25',
              onClick: () => handleAction('Ordens de Serviço'),
            };


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

  return (
    <div
      className="pointer-events-none relative flex items-center justify-center select-none"
      role="dialog"
      aria-label={`Opções de ${getTitle()}`}
    >
      {/* Dynamic Animated Canvas surrounding Center Pin */}
      <div className="pointer-events-none relative h-[360px] w-[360px] sm:h-[400px] sm:w-[440px]">
        {/* Optical Connecting Filaments / SVG Ray Lines */}
        <svg
          className="pointer-events-none absolute inset-0 size-full overflow-visible"
          viewBox="0 0 360 360"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="rayGradV" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--color-accent, #3b82f6)" stopOpacity="0.7" />
              <stop offset="50%" stopColor="var(--color-accent, #3b82f6)" stopOpacity="0.1" />
              <stop offset="100%" stopColor="var(--color-accent, #3b82f6)" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="rayGradH" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-accent, #3b82f6)" stopOpacity="0.7" />
              <stop offset="50%" stopColor="var(--color-accent, #3b82f6)" stopOpacity="0.1" />
              <stop offset="100%" stopColor="var(--color-accent, #3b82f6)" stopOpacity="0.7" />
            </linearGradient>
          </defs>

          {/* Glowing Orbital Ring */}
          <circle
            cx="180"
            cy="180"
            r={viewMode === 'info' ? '110' : '88'}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="text-accent/30 dark:text-accent/25 transition-all duration-300 animate-spin-slow"
          />

          {/* Connective Ray Filaments */}
          <line
            x1="180"
            y1="40"
            x2="180"
            y2="320"
            stroke="url(#rayGradV)"
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />
          <line
            x1="30"
            y1="180"
            x2="330"
            y2="180"
            stroke="url(#rayGradH)"
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />
        </svg>

        {/* Center Target Indicator (Centered on the map element pin) */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <div className="relative flex items-center justify-center">
            <span className="absolute size-10 rounded-full bg-accent/25 animate-ping opacity-75" />
            <span className="absolute size-7 rounded-full bg-accent/30" />
            <div className="relative flex size-5.5 items-center justify-center rounded-full border-2 border-white bg-accent shadow-lg ring-2 ring-accent/40 dark:border-slate-900">
              <div className="size-1.5 rounded-full bg-white" />
            </div>
          </div>
        </motion.div>

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
              {/* Top Node: Card do Elemento (CTO XXX) */}
              <motion.div
                initial={{ y: -20, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-auto absolute top-2 left-1/2 -translate-x-1/2 z-20"
              >
                <div className="flex min-w-[170px] max-w-[250px] items-center justify-between gap-2.5 rounded-2xl border border-white/20 bg-surface/95 dark:bg-surface/90 px-3.5 py-2 shadow-2xl backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 transition-transform hover:scale-[1.02]">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="flex size-2 rounded-full animate-pulse"
                        style={{
                          backgroundColor:
                            element.kind === 'fat'
                              ? element.data.mapColorHex || '#f59e0b'
                              : element.kind === 'ceo'
                                ? element.data.mapColorHex || '#8b5cf6'
                                : element.kind === 'cable'
                                  ? element.data.strokeColorHex || '#0284c7'
                                  : '#10b981',
                        }}
                        aria-hidden
                      />
                      <span className="text-[10px] font-bold tracking-wider uppercase text-accent">
                        {getKindLabel()}
                      </span>
                      <span className="truncate text-[10px] font-medium text-muted">
                        {element.kind === 'fat' ||
                        element.kind === 'cable' ||
                        element.kind === 'ceo'
                          ? `#${element.data.idErp}`
                          : (element.data.document ?? `#${element.data.id}`)}
                      </span>
                    </div>
                    <h3
                      className="font-display mt-0.5 truncate text-xs font-bold text-foreground leading-tight"
                      title={getTitle()}
                    >
                      {getTitle()}
                    </h3>
                  </div>

                  <button
                    type="button"
                    aria-label="Fechar"
                    onClick={onClose}
                    className="flex size-6.5 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-default hover:text-foreground active:scale-95"
                  >
                    <LuX className="size-3.5" />
                  </button>
                </div>
              </motion.div>


              {/* Left Node: Informações */}
              <motion.div
                initial={{ x: 20, opacity: 0, scale: 0.75 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1], delay: 0.03 }}
                className="pointer-events-auto absolute left-2 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
              >
                <motion.button
                  type="button"
                  aria-label="Ver informações detalhadas"
                  whileHover={{ scale: 1.1, rotate: -2 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setViewMode('info')}
                  className="group relative flex size-15 items-center justify-center rounded-full border-2 border-white/40 bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-xl shadow-sky-500/25 transition-shadow hover:shadow-sky-500/40 focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <LuInfo className="size-6.5 transition-transform group-hover:scale-110 drop-shadow-sm" />
                  <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-transparent to-white/20" />
                </motion.button>
                <button
                  type="button"
                  onClick={() => setViewMode('info')}
                  className="mt-1.5 rounded-full border border-border/80 bg-surface/95 px-3 py-0.5 text-[11px] font-semibold text-foreground shadow-md backdrop-blur-md transition-colors hover:bg-default active:scale-95"
                >
                  Informações
                </button>
              </motion.div>

              {/* Right Node: Arquivos */}
              <motion.div
                initial={{ x: -20, opacity: 0, scale: 0.75 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1], delay: 0.03 }}
                className="pointer-events-auto absolute right-2 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
              >
                <motion.button
                  type="button"
                  aria-label="Ver arquivos"
                  whileHover={{ scale: 1.1, rotate: 2 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleAction('Arquivos')}
                  className="group relative flex size-15 items-center justify-center rounded-full border-2 border-white/40 bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-xl shadow-emerald-500/25 transition-shadow hover:shadow-emerald-500/40 focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <LuFolder className="size-6.5 transition-transform group-hover:scale-110 drop-shadow-sm" />
                  <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-transparent to-white/20" />
                </motion.button>
                <button
                  type="button"
                  onClick={() => handleAction('Arquivos')}
                  className="mt-1.5 rounded-full border border-border/80 bg-surface/95 px-3 py-0.5 text-[11px] font-semibold text-foreground shadow-md backdrop-blur-md transition-colors hover:bg-default active:scale-95"
                >
                  Arquivos
                </button>
              </motion.div>

              {/* Bottom Node: Splitagem */}
              <motion.div
                initial={{ y: -20, opacity: 0, scale: 0.75 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1], delay: 0.06 }}
                className="pointer-events-auto absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center"
              >
                <motion.button
                  type="button"
                  aria-label={bottomAction.label}
                  whileHover={{ scale: 1.1, rotate: 2 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={bottomAction.onClick}
                  className={`group relative flex size-15 items-center justify-center rounded-full border-2 border-white/40 bg-gradient-to-br ${bottomAction.gradient} text-white shadow-xl transition-shadow focus-visible:outline-2 focus-visible:outline-accent`}
                >
                  <div className="transition-transform group-hover:scale-110 drop-shadow-sm">
                    {bottomAction.icon}
                  </div>
                  <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-transparent to-white/20" />
                </motion.button>
                <button
                  type="button"
                  onClick={bottomAction.onClick}
                  className="mt-1.5 rounded-full border border-border/80 bg-surface/95 px-3.5 py-0.5 text-[11px] font-semibold text-foreground shadow-md backdrop-blur-md transition-colors hover:bg-default active:scale-95"
                >
                  {bottomAction.label}
                </button>
              </motion.div>
            </motion.div>
          ) : (
            /* ---------------------------------------------------- */
            /* VIEW 2: FLOATING ORBITAL INFO HUD MODE ('info')      */
            /* ---------------------------------------------------- */
            <motion.div
              key="view-info"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-none absolute inset-0 size-full"
            >
              {/* Top Card: Title + Back to Actions */}
              <motion.div
                initial={{ y: -15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="pointer-events-auto absolute top-1 left-1/2 -translate-x-1/2 z-20"
              >
                <div className="flex min-w-[220px] max-w-[320px] items-center justify-between gap-2 rounded-2xl border border-white/20 bg-surface/95 dark:bg-surface/90 px-3 py-1.5 shadow-2xl backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
                  <button
                    type="button"
                    aria-label="Voltar para ações"
                    onClick={() => setViewMode('actions')}
                    className="flex items-center gap-1 rounded-xl bg-default/60 hover:bg-default px-2 py-1 text-xs font-semibold text-foreground transition-all active:scale-95"
                  >
                    <LuArrowLeft className="size-3.5" />
                    <span>Ações</span>
                  </button>

                  <div className="min-w-0 flex-1 px-1 text-center">
                    <span className="block truncate text-xs font-bold text-foreground">
                      {getTitle()}
                    </span>
                    <span className="block text-[10px] text-muted">
                      #{element.kind === 'fat' || element.kind === 'cable' || element.kind === 'ceo' ? element.data.idErp : (element.data.document ?? element.data.id)}
                    </span>
                  </div>

                  <button
                    type="button"
                    aria-label="Fechar"
                    onClick={onClose}
                    className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted hover:bg-default hover:text-foreground transition-colors"
                  >
                    <LuX className="size-3.5" />
                  </button>
                </div>
              </motion.div>

              {/* Left Orbital Card: Capacidade & Ocupação */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.28, delay: 0.04 }}
                className="pointer-events-auto absolute left-0 top-1/2 -translate-y-1/2 z-20 w-[155px] sm:w-[170px]"
              >
                <div className="rounded-2xl border border-white/20 bg-surface/95 dark:bg-surface/90 p-2.5 shadow-2xl backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-foreground">
                    <div className="flex items-center gap-1 text-sky-500">
                      <LuActivity className="size-3.5" />
                      <span>Capacidade</span>
                    </div>
                    {fatPortDetails ? (
                      <span className="font-mono text-[10px] text-accent">
                        {fatPortDetails.percent}%
                      </span>
                    ) : null}
                  </div>

                  {fatPortDetails ? (
                    <>
                      {/* Mini meter */}
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-default/60">
                        <div
                          className={`h-full rounded-full ${
                            fatPortDetails.percent >= 90
                              ? 'bg-rose-500'
                              : fatPortDetails.percent >= 70
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                          }`}
                          style={{ width: `${fatPortDetails.percent}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1 pt-0.5 text-center text-[10px]">
                        <div className="rounded-lg bg-default/40 p-1">
                          <span className="block text-[9px] text-muted">Livres</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {fatPortDetails.available}
                          </span>
                        </div>
                        <div className="rounded-lg bg-default/40 p-1">
                          <span className="block text-[9px] text-muted">Clientes</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            {fatPortDetails.occupied}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : element.kind === 'ceo' ? (
                    <div className="space-y-1 text-[11px] text-muted pt-0.5">
                      <div className="flex items-center justify-between">
                        <span>Bandejas:</span>
                        <span className="font-bold text-foreground font-mono">
                          {element.data.traysCount ?? 1}
                        </span>
                      </div>
                      {element.data.projectIdErp ? (
                        <div className="flex items-center justify-between">
                          <span>Projeto:</span>
                          <span className="font-semibold text-foreground">
                            #{element.data.projectIdErp}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : element.kind === 'cable' ? (
                    <div className="text-[11px] text-muted">
                      <span className="block font-semibold text-foreground">
                        {element.data.cableTypeName ?? 'Fibra'}
                      </span>
                      <span>{element.data.lengthMeters ? `${element.data.lengthMeters}m` : '—'}</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted">
                      <span className="block font-semibold text-foreground">
                        {element.kind === 'customer'
                          ? (element.data.document ?? 'Cliente')
                          : 'Elemento'}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>


              {/* Right Orbital Card: Localização & Rota GPS */}
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.28, delay: 0.04 }}
                className="pointer-events-auto absolute right-0 top-1/2 -translate-y-1/2 z-20 w-[155px] sm:w-[170px]"
              >
                <div className="rounded-2xl border border-white/20 bg-surface/95 dark:bg-surface/90 p-2.5 shadow-2xl backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-foreground">
                    <div className="flex items-center gap-1 text-emerald-500">
                      <LuNavigation className="size-3.5" />
                      <span>Localização</span>
                    </div>
                    {loc ? (
                      <button
                        type="button"
                        aria-label="Copiar coordenadas"
                        title={copied ? 'Copiado!' : 'Copiar'}
                        onClick={() => handleCopyCoordinates(loc.latitude, loc.longitude)}
                        className="text-muted hover:text-foreground transition-colors"
                      >
                        {copied ? (
                          <LuCheck className="size-3 text-emerald-500" />
                        ) : (
                          <LuCopy className="size-3" />
                        )}
                      </button>
                    ) : null}
                  </div>


                  {loc ? (
                    <div className="truncate font-mono text-[10px] text-muted">
                      {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleOpenNavigation}
                    className="flex w-full items-center justify-center gap-1 rounded-xl bg-accent/15 hover:bg-accent/25 px-2 py-1.5 text-[11px] font-semibold text-accent transition-all active:scale-95"
                  >
                    <span>Traçar Rota</span>
                    <LuExternalLink className="size-3" />
                  </button>
                </div>
              </motion.div>

              {/* Bottom Orbital Card: Matriz Visual de Portas / Ação Rápida */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.08 }}
                className="pointer-events-auto absolute bottom-1 left-1/2 -translate-x-1/2 z-20 w-[240px] sm:w-[280px]"
              >
                {element.kind === 'fat' && fatPortDetails ? (
                  <div className="rounded-2xl border border-white/20 bg-surface/95 dark:bg-surface/90 p-2.5 shadow-2xl backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-foreground">
                        Matriz de Portas ({fatPortDetails.total})
                      </span>
                      {selectedPort ? (
                        <span className="font-bold text-accent">
                          Porta {selectedPort}: {selectedPort <= fatPortDetails.occupied ? 'Ocupada' : 'Livre'}
                        </span>
                      ) : (
                        <span className="text-muted">Toque p/ ver</span>
                      )}
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
                            className={`flex flex-col items-center justify-center rounded-lg py-0.5 transition-all active:scale-90 ${
                              isSelected ? 'ring-2 ring-accent scale-105' : ''
                            } ${
                              p.isOccupied
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                            }`}
                          >
                            <span className="text-[9px] font-bold font-mono">{p.number}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={bottomAction.onClick}
                      className={`flex items-center gap-1.5 rounded-2xl border border-white/30 bg-gradient-to-r ${bottomAction.gradient} px-4 py-2 text-xs font-semibold text-white shadow-xl transition-all hover:scale-105 active:scale-95`}
                    >
                      <div className="size-4">{bottomAction.icon}</div>
                      <span>{bottomAction.label}</span>
                    </button>
                  </div>
                )}
              </motion.div>
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
