import React, { useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from '@heroui/react';

export type RadialMenuColorScheme =
  | 'sky'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'blue'
  | 'teal'
  | 'slate'
  | 'default';

export interface RadialMenuItem {
  /** Identificador único do item */
  id: string;
  /** Rótulo textual exibido como tooltip no hover */
  label: string;
  /** Ícone a ser renderizado */
  icon: React.ReactNode;
  /** Callback executado ao clicar/acionar o item */
  onClick: () => void;
  /**
   * Ângulo customizado em graus (opcional).
   * Se omitido, os itens são distribuídos uniformemente em 360°.
   */
  angle?: number;
  /** Esquema de cores sólidas predefinido */
  colorScheme?: RadialMenuColorScheme;
  /** Cor de fundo sólida customizada Tailwind (ex: 'bg-emerald-600') */
  bgColor?: string;
  /** Texto de acessibilidade */
  ariaLabel?: string;
  /** Badge / contador numérico */
  badge?: React.ReactNode;
  /** Desabilitar o item */
  disabled?: boolean;
}

export interface RadialMenuProps {
  /** Lista de itens de ação do menu radial */
  items: RadialMenuItem[];
  /** Diâmetro total do canvas/container do menu em pixels (padrão: 360) */
  size?: number;
  /** Raio do anel orbital onde os centros dos botões ficam ancorados (padrão: 110) */
  radius?: number;
  /** Ângulo inicial em graus para a distribuição uniforme automática (padrão: 0) */
  startAngle?: number;
  /** Elemento a ser renderizado no centro da órbita */
  centerNode?: React.ReactNode;
  /** Header opcional (ex: Chip da CTO na cor do elemento) */
  header?: React.ReactNode;
  /** Exibir anel circular orbital pontilhado (padrão: true) */
  showOrbitalRing?: boolean;
  /** Exibir linhas conectoras saindo do centro até cada botão (padrão: true) */
  showSpokes?: boolean;
  /** Exibir efeito de radar pulsante no centro se nenhum centerNode for fornecido (padrão: true) */
  pulseCenter?: boolean;
  /** Callback executado ao pressionar Escape ou fechar */
  onClose?: () => void;
  /** Classes CSS adicionais para o container */
  className?: string;
}

const colorSchemeMap: Record<RadialMenuColorScheme, string> = {
  sky: 'bg-sky-600 hover:bg-sky-500 active:bg-sky-700',
  emerald: 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700',
  amber: 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700',
  blue: 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700',
  teal: 'bg-teal-600 hover:bg-teal-500 active:bg-teal-700',
  rose: 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700',
  slate: 'bg-slate-700 hover:bg-slate-600 active:bg-slate-800',
  default: 'bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900',
};

/**
 * Calcula as posições polares de cada item do menu radial com distribuição uniforme em 360°.
 */
export function calculateRadialPositions(
  items: RadialMenuItem[],
  radius: number,
  cx: number,
  cy: number,
  startAngle = 0,
) {
  const n = items.length;
  const autoStep = n > 0 ? 360 / n : 0;

  return items.map((item, index) => {
    let angleDeg: number;
    if (typeof item.angle === 'number') {
      angleDeg = item.angle;
    } else {
      angleDeg = startAngle + index * autoStep;
    }

    // Converte para radianos
    const rad = (angleDeg * Math.PI) / 180;
    const x = cx + radius * Math.cos(rad);
    const y = cy + radius * Math.sin(rad);

    return {
      item,
      angleDeg,
      x,
      y,
    };
  });
}

/**
 * Menu Radial com distribuição uniforme, alinhamento polar exato,
 * cores sólidas sem gradientes e labels apenas em hover via tooltip.
 */
export const RadialMenu: React.FC<RadialMenuProps> = ({
  items,
  size = 360,
  radius = 110,
  startAngle = 0,
  centerNode,
  header,
  showOrbitalRing = true,
  showSpokes = true,
  pulseCenter = true,
  onClose,
  className = '',
}) => {
  const menuContainerRef = useRef<HTMLDivElement>(null);

  const cx = size / 2;
  const cy = size / 2;

  const positionedItems = useMemo(() => {
    return calculateRadialPositions(items, radius, cx, cy, startAngle);
  }, [items, radius, cx, cy, startAngle]);

  // Navegação por teclado acessível
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
        return;
      }

      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        const buttons = menuContainerRef.current?.querySelectorAll<HTMLButtonElement>(
          'button[data-radial-btn="true"]:not([disabled])',
        );
        if (!buttons || buttons.length === 0) return;

        const activeElement = document.activeElement as HTMLButtonElement | null;
        const currentIndex = Array.from(buttons).indexOf(activeElement as HTMLButtonElement);

        let nextIndex = 0;
        if (currentIndex !== -1) {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            nextIndex = (currentIndex + 1) % buttons.length;
          } else {
            nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
          }
        }
        buttons[nextIndex]?.focus();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={menuContainerRef}
      role="region"
      aria-label="Menu de ações rápidas radial"
      className={`pointer-events-none relative select-none ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {/* SVG Canvas com Anel Orbital e Raios Conectores perfeitamente alinhados */}
      <svg
        className="pointer-events-none absolute inset-0 size-full overflow-visible"
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        {/* Círculo Orbital Principal */}
        {showOrbitalRing && (
          <>
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              className="text-accent/30 dark:text-accent/25 animate-spin-slow transition-all duration-300"
            />
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-accent/15 dark:text-accent/10"
            />
          </>
        )}

        {/* Raios conectando o centro a cada botão */}
        {showSpokes &&
          positionedItems.map(({ item, x, y }) => (
            <line
              key={`spoke-${item.id}`}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="2 2"
              className="text-accent/30 dark:text-accent/20"
            />
          ))}
      </svg>

      {/* Nó Central (Target indicator ou nó customizado) */}
      <div
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${cx}px`, top: `${cy}px` }}
      >
        {centerNode ? (
          centerNode
        ) : pulseCenter ? (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative flex items-center justify-center"
          >
            <span className="absolute size-10 rounded-full bg-accent/20 animate-ping opacity-60" />
            <span className="absolute size-7 rounded-full bg-accent/25" />
            <div className="relative flex size-5 items-center justify-center rounded-full border-2 border-white bg-accent shadow-md ring-2 ring-accent/30 dark:border-slate-900">
              <div className="size-1.5 rounded-full bg-white" />
            </div>
          </motion.div>
        ) : null}
      </div>

      {/* Header Superior (Ex: Chip da CTO na cor do elemento) */}
      {header && (
        <motion.div
          initial={{ y: -16, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -16, opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-auto absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center"
        >
          {header}
        </motion.div>
      )}

      {/* Botões de Ação Radiais com Distribuição Uniforme e Tooltips no Hover */}
      <AnimatePresence>
        {positionedItems.map(({ item, x, y }, index) => {
          const bgClass = item.bgColor
            ? item.bgColor
            : item.colorScheme
              ? colorSchemeMap[item.colorScheme]
              : colorSchemeMap.default;

          return (
            <motion.div
              key={item.id}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{
                duration: 0.25,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.02 * index,
              }}
              style={{
                left: `${x}px`,
                top: `${y}px`,
              }}
              className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
            >
              <Tooltip
                content={item.label}
                placement="top"
                offset={10}
                delay={0}
                closeDelay={0}
                classNames={{
                  content:
                    'px-3 py-1 text-xs font-semibold text-foreground bg-surface/98 dark:bg-surface/95 border border-border shadow-lg rounded-xl backdrop-blur-md select-none',
                }}
              >
                <div className="relative">
                  <motion.button
                    type="button"
                    data-radial-btn="true"
                    aria-label={item.ariaLabel ?? item.label}
                    disabled={item.disabled}
                    whileHover={{ scale: 1.12 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={item.onClick}
                    className={`group relative flex size-13 sm:size-14 items-center justify-center rounded-full border border-white/25 ${bgClass} text-white shadow-lg transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none`}
                  >
                    <div className="size-6 transition-transform group-hover:scale-105 flex items-center justify-center">
                      {item.icon}
                    </div>
                  </motion.button>

                  {/* Badge opcional */}
                  {item.badge !== undefined && (
                    <span className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-md pointer-events-none">
                      {item.badge}
                    </span>
                  )}
                </div>
              </Tooltip>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
