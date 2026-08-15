import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Spinner,
  Tooltip,
} from '@heroui/react';
import {
  LuCheck,
  LuCopy,
  LuGitFork,
  LuInfo,
  LuLayers,
  LuList,
  LuMaximize2,
  LuMove,
  LuNetwork,
  LuRefreshCw,
  LuX,
  LuZoomIn,
  LuZoomOut,
} from 'react-icons/lu';
import type {
  CtoSplittingDiagramResponseDto,
} from '@gigahub/shared/contracts';
import { getCtoSplittingDiagramRequest } from '../../shared/api/projeto.api';
import { useMediaQuery } from '../../shared/hooks/use-media-query';
import { useAuthStore } from '../../shared/stores/auth.store';

interface CtoSplittingModalProps {
  fatId: string | null;
  onClose: () => void;
}

interface NodeLayoutPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  inPortsCoords: Array<{ portNumber: number; x: number; y: number; colorHex?: string }>;
  outPortsCoords: Array<{ portNumber: number; x: number; y: number; colorHex?: string }>;
}

type ViewTab = 'diagram' | 'fusions';

const FIBER_COLOR_SEQUENCE = [
  '#00aa00', // 1 - Verde
  '#ffff00', // 2 - Amarelo
  '#ffffff', // 3 - Branco
  '#0055ff', // 4 - Azul
  '#ff0000', // 5 - Vermelho
  '#990099', // 6 - Violeta / Roxo
  '#884400', // 7 - Marrom
  '#ff88cc', // 8 - Rosa
  '#000000', // 9 - Preto
  '#888888', // 10 - Cinza
  '#ff8800', // 11 - Laranja
  '#00ffff', // 12 - Aqua / Ciano
];

function getFiberColor(portNumber: number): string {
  if (portNumber <= 0) return '#00aa00';
  const index = (portNumber - 1) % FIBER_COLOR_SEQUENCE.length;
  return FIBER_COLOR_SEQUENCE[index];
}

export const CtoSplittingModal: React.FC<CtoSplittingModalProps> = ({
  fatId,
  onClose,
}) => {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [data, setData] = useState<CtoSplittingDiagramResponseDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>('diagram');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const diagramCanvasRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 500 });

  // Zoom & Pan State
  const [zoom, setZoom] = useState(1);
  const [baseTransform, setBaseTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const [copied, setCopied] = useState(false);
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);

  // ResizeObserver to track container dimensions accurately
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setContainerSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute Layout Positions for each Node dynamically
  const { nodePositions, bounds } = useMemo(() => {
    if (!data || data.nodes.length === 0) {
      return {
        nodePositions: new Map<string, NodeLayoutPosition>(),
        bounds: { minX: 0, minY: 0, maxX: 700, maxY: 400, width: 700, height: 400, centerX: 350, centerY: 200 },
      };
    }

    const positions = new Map<string, NodeLayoutPosition>();

    const cableInNodes = data.nodes.filter((n) => n.kind === 'cable_in');
    const cableOutNodes = data.nodes.filter((n) => n.kind === 'cable_out');
    const unbalSplitters = data.nodes.filter((n) => n.kind === 'splitter_unbalanced');
    const balSplitters = data.nodes.filter((n) => n.kind === 'splitter_balanced' || n.kind === 'splitter');

    const leftColumnX = 40;
    const rightColumnX = 640;

    let currLeftY = 40;
    let currRightY = 40;

    // 1. Position Input Cables
    cableInNodes.forEach((node) => {
      const portCount = Math.max(1, node.portsOut.length);
      const height = Math.max(34, portCount * 18 + 10);
      const width = 95;
      const x = leftColumnX;
      const y = currLeftY;

      const outPortsCoords = Array.from({ length: portCount }, (_, idx) => {
        const pNum = idx + 1;
        const portY = y + 7 + idx * 18 + 8;
        return {
          portNumber: pNum,
          x: x + width,
          y: portY,
          colorHex: getFiberColor(pNum),
        };
      });

      positions.set(node.id, {
        x,
        y,
        width,
        height,
        inPortsCoords: [],
        outPortsCoords,
      });

      currLeftY += height + 40;
    });

    // 2. Position Unbalanced Splitters in Left Column
    unbalSplitters.forEach((node) => {
      const x = leftColumnX + 40;
      const y = currLeftY;
      const width = 85;
      const height = 65;

      positions.set(node.id, {
        x,
        y,
        width,
        height,
        inPortsCoords: [{ portNumber: 1, x: x + 55, y: y + 14, colorHex: '#00aa00' }],
        outPortsCoords: [
          { portNumber: 1, x: x + 55, y: y + 14, colorHex: '#00aa00' },
          { portNumber: 2, x: x + 48, y: y + 41, colorHex: '#ffff00' },
        ],
      });

      currLeftY += height + 35;
    });

    // 3. Position Output Cables in Right Column
    cableOutNodes.forEach((node) => {
      const portCount = Math.max(1, node.portsIn.length);
      const height = Math.max(34, portCount * 18 + 10);
      const width = 95;
      const x = rightColumnX;
      const y = currRightY;

      const inPortsCoords = Array.from({ length: portCount }, (_, idx) => {
        const pNum = idx + 1;
        const portY = y + 7 + idx * 18 + 8;
        return {
          portNumber: pNum,
          x,
          y: portY,
          colorHex: getFiberColor(pNum),
        };
      });

      positions.set(node.id, {
        x,
        y,
        width,
        height,
        inPortsCoords,
        outPortsCoords: [],
      });

      currRightY += height + 40;
    });

    // 4. Position Balanced Splitters in Right Column
    balSplitters.forEach((node) => {
      const outCount = Math.max(8, node.portsOut?.length || 8);
      const x = rightColumnX;
      const y = currRightY;
      const width = 95;
      const height = 65;

      positions.set(node.id, {
        x,
        y,
        width,
        height,
        inPortsCoords: [{ portNumber: 1, x, y: y + 14, colorHex: '#00aa00' }],
        outPortsCoords: Array.from({ length: outCount }, (_, pIdx) => ({
          portNumber: pIdx + 1,
          x: x + width,
          y: y + 2 + pIdx * (58 / outCount) + (58 / outCount) / 2,
          colorHex: getFiberColor(pIdx + 1),
        })),
      });

      currRightY += height + 35;
    });

    // 5. Fallback for any other unexpected nodes
    data.nodes.forEach((node, i) => {
      if (!positions.has(node.id)) {
        const x = 320 + (i % 2) * 140;
        const y = 90 + Math.floor(i / 2) * 90;
        positions.set(node.id, {
          x,
          y,
          width: 90,
          height: 40,
          inPortsCoords: [{ portNumber: 1, x, y: y + 20 }],
          outPortsCoords: [{ portNumber: 1, x: x + 90, y: y + 20 }],
        });
      }
    });

    // Calculate Real Bounding Box of all existing nodes
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    positions.forEach((pos) => {
      minX = Math.min(minX, pos.x - 30);
      maxX = Math.max(maxX, pos.x + pos.width + 30);
      minY = Math.min(minY, pos.y - 30);
      maxY = Math.max(maxY, pos.y + pos.height + 25);
    });

    if (minX === Infinity) {
      minX = 0;
      maxX = 700;
      minY = 0;
      maxY = 400;
    }

    const bWidth = maxX - minX;
    const bHeight = maxY - minY;

    return {
      nodePositions: positions,
      bounds: {
        minX,
        minY,
        maxX,
        maxY,
        width: bWidth,
        height: bHeight,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
      },
    };
  }, [data]);

  // Center & Auto-fit calculation
  const applyAutoFit = useCallback(() => {
    if (containerSize.width <= 0 || containerSize.height <= 0 || bounds.width <= 0) return;

    const padX = isMobile ? 32 : 56;
    const padY = isMobile ? 40 : 64;

    const availW = Math.max(100, containerSize.width - padX);
    const availH = Math.max(100, containerSize.height - padY);

    const scaleX = availW / bounds.width;
    const scaleY = availH / bounds.height;
    const fitScale = Math.min(scaleX, scaleY, isMobile ? 1.15 : 1.35);
    const safeScale = Math.max(0.35, Number(fitScale.toFixed(3)));

    const tx = containerSize.width / 2 - bounds.centerX * safeScale;
    const ty = containerSize.height / 2 - bounds.centerY * safeScale;

    setBaseTransform({ x: tx, y: ty, scale: safeScale });
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, [bounds, containerSize, isMobile]);

  useEffect(() => {
    if (data && activeTab === 'diagram') {
      applyAutoFit();
    }
  }, [applyAutoFit, data, activeTab]);

  useEffect(() => {
    if (!fatId || !accessToken) {
      setData(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    setLoading(true);
    setError(null);
    setPanOffset({ x: 0, y: 0 });

    getCtoSplittingDiagramRequest(accessToken, fatId, controller.signal)
      .then((res) => {
        if (!cancelled) {
          setData(res);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          if (err instanceof Error) {
            setError(err.message || 'Falha ao carregar diagrama de splitagem');
          } else {
            setError('Falha ao carregar diagrama de splitagem');
          }
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken, fatId]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  // Handle Mouse Wheel Zoom centered on cursor position
  useEffect(() => {
    const el = diagramCanvasRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;

      setZoom((prevZoom) => {
        const currentScale = baseTransform.scale * prevZoom;
        const newZoom = Math.min(4.0, Math.max(0.25, Number((prevZoom * zoomFactor).toFixed(3))));
        const newScale = baseTransform.scale * newZoom;

        // Calculate world coordinates under cursor
        const worldX = (pointerX - (baseTransform.x + panOffset.x)) / currentScale;
        const worldY = (pointerY - (baseTransform.y + panOffset.y)) / currentScale;

        // Adjust panOffset so point under cursor remains stationary
        const newPanX = pointerX - baseTransform.x - worldX * newScale;
        const newPanY = pointerY - baseTransform.y - worldY * newScale;

        setPanOffset({ x: newPanX, y: newPanY });
        return newZoom;
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [baseTransform, panOffset]);

  // Drag / Pan Handlers for Touch & Mouse
  const handlePointerDown = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartRef.current = { x: clientX - panOffset.x, y: clientY - panOffset.y };
  }, [panOffset]);

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || !dragStartRef.current) return;
    setPanOffset({
      x: clientX - dragStartRef.current.x,
      y: clientY - dragStartRef.current.y,
    });
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  const handleCopyJson = () => {
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nodeMap = useMemo(() => {
    if (!data) return new Map();
    return new Map(data.nodes.map((n) => [n.id, n]));
  }, [data]);

  if (!fatId) return null;

  const currentScale = baseTransform.scale * zoom;
  const currentTranslateX = baseTransform.x + panOffset.x;
  const currentTranslateY = baseTransform.y + panOffset.y;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cto-splitting-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-xs transition-opacity animate-in fade-in"
    >
      <div className="flex flex-col w-full h-[95dvh] sm:h-[88vh] sm:max-w-5xl bg-surface rounded-t-3xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden">
        {/* Mobile Drag Indicator Bar */}
        <div className="flex sm:hidden justify-center pt-2.5 pb-1 bg-default/10">
          <div className="w-12 h-1.5 rounded-full bg-default/50" />
        </div>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-border/80 bg-default/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
              <LuGitFork className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2
                  id="cto-splitting-title"
                  className="text-sm sm:text-base font-bold text-foreground truncate"
                >
                  Splitagem CTO {data?.fatName || fatId}
                </h2>
                <span className="px-1.5 py-0.5 text-[10px] sm:text-[11px] font-semibold rounded-md bg-accent/15 text-accent shrink-0">
                  ID #{fatId}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-muted truncate">
                Fusões ópticas e splitters internos da caixa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* View Switcher Tabs */}
            <div className="flex items-center bg-default/40 p-0.5 rounded-lg border border-border/50 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('diagram')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                  activeTab === 'diagram'
                    ? 'bg-surface text-foreground shadow-xs font-semibold'
                    : 'text-muted hover:text-foreground'
                }`}
                aria-label="Ver Diagrama Gráfico"
              >
                <LuNetwork className="size-3.5" />
                <span className="hidden xs:inline sm:inline">Diagrama</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('fusions')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                  activeTab === 'fusions'
                    ? 'bg-surface text-foreground shadow-xs font-semibold'
                    : 'text-muted hover:text-foreground'
                }`}
                aria-label="Ver Lista de Fusões"
              >
                <LuList className="size-3.5" />
                <span className="hidden xs:inline sm:inline">Fusões ({data?.connections.length || 0})</span>
              </button>
            </div>

            <Tooltip content={copied ? 'Copiado!' : 'Copiar JSON'}>
              <Button
                size="sm"
                variant="ghost"
                isIconOnly
                aria-label="Copiar dados"
                onPress={handleCopyJson}
                className="hidden sm:flex size-8 text-muted hover:text-foreground"
              >
                {copied ? (
                  <LuCheck className="size-4 text-success" />
                ) : (
                  <LuCopy className="size-4" />
                )}
              </Button>
            </Tooltip>

            <Button
              size="sm"
              variant="ghost"
              isIconOnly
              aria-label="Fechar janela"
              onPress={onClose}
              className="size-8 sm:size-8 rounded-lg text-muted hover:text-foreground ml-0.5"
            >
              <LuX className="size-5" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div
          ref={containerRef}
          className="relative flex-1 w-full h-full overflow-hidden bg-[#24262b] dark:bg-[#111215] flex flex-col select-none"
        >
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted p-6">
              <Spinner size="lg" color="primary" />
              <span className="text-sm">Carregando diagrama de splitagem...</span>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="max-w-md p-6 text-center space-y-3 bg-surface/80 rounded-2xl border border-border/80 shadow-lg">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-danger/15 text-danger">
                  <LuInfo className="size-6" />
                </div>
                <h3 className="font-semibold text-foreground">
                  Não foi possível carregar o diagrama
                </h3>
                <p className="text-sm text-muted">{error}</p>
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => {
                    if (fatId && accessToken) {
                      setLoading(true);
                      setError(null);
                      getCtoSplittingDiagramRequest(accessToken, fatId)
                        .then(setData)
                        .catch((e) => setError(e.message))
                        .finally(() => setLoading(false));
                    }
                  }}
                >
                  <LuRefreshCw className="size-4 mr-1.5" />
                  Tentar novamente
                </Button>
              </div>
            </div>
          ) : data && data.nodes.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center space-y-2 text-muted">
              <div>
                <LuGitFork className="size-12 mx-auto stroke-1 opacity-50 mb-2" />
                <p className="text-sm font-medium text-foreground">
                  Nenhuma splitagem ou fusão cadastrada para esta CTO.
                </p>
                <p className="text-xs max-w-sm mx-auto text-muted mt-1">
                  As conexões de fibras podem ser desenhadas no módulo de projetos ópticos do ERP.
                </p>
              </div>
            </div>
          ) : data && activeTab === 'diagram' ? (
            <div
              ref={diagramCanvasRef}
              className="relative flex-1 w-full h-full overflow-hidden cursor-grab active:cursor-grabbing touch-none"
              onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
              onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={(e) => {
                const touch = e.touches[0];
                if (touch) handlePointerDown(touch.clientX, touch.clientY);
              }}
              onTouchMove={(e) => {
                const touch = e.touches[0];
                if (touch) handlePointerMove(touch.clientX, touch.clientY);
              }}
              onTouchEnd={handlePointerUp}
            >
              {/* Help hint badge */}
              <div className="absolute top-2.5 left-3 z-10 pointer-events-none flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] text-white/90 border border-white/15 shadow-md">
                <LuMove className="size-3.5 text-sky-400" />
                <span>Arraste para mover • Scroll do mouse para zoom • ESC para fechar</span>
              </div>

              {/* Full-width interactive SVG Canvas */}
              <svg
                width="100%"
                height="100%"
                className="w-full h-full block"
              >
                <defs>
                  {/* Technical Engineering Grid Pattern */}
                  <pattern
                    id="gridPattern"
                    width="16"
                    height="16"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 16 0 L 0 0 0 16"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.07)"
                      strokeWidth="0.8"
                    />
                  </pattern>

                  {/* Cable Cylinder Gradient */}
                  <linearGradient id="cableGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#2c2d30" />
                    <stop offset="25%" stopColor="#111214" />
                    <stop offset="70%" stopColor="#1a1b1e" />
                    <stop offset="100%" stopColor="#050506" />
                  </linearGradient>

                  {/* Splitter Metallic Gradient */}
                  <linearGradient id="splitterMetallicGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="60%" stopColor="#e4e4e7" />
                    <stop offset="100%" stopColor="#a1a1aa" />
                  </linearGradient>

                  {/* Glow filter for active/hovered fiber */}
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Background Grid covering 100% of modal */}
                <rect width="100%" height="100%" fill="url(#gridPattern)" />

                {/* Transformed Group containing all diagram elements */}
                <g
                  transform={`translate(${currentTranslateX}, ${currentTranslateY}) scale(${currentScale})`}
                  style={{ transformOrigin: '0 0' }}
                >
                  {/* 1. Connections (Optical Fibers) */}
                  {data.connections.map((conn) => {
                    const sourcePos = nodePositions.get(conn.sourceNodeId);
                    const targetPos = nodePositions.get(conn.targetNodeId);
                    if (!sourcePos || !targetPos) return null;

                    const sPort =
                      sourcePos.outPortsCoords.find(
                        (p) => p.portNumber === conn.sourcePortNumber,
                      ) || sourcePos.outPortsCoords[0] || { x: sourcePos.x + sourcePos.width, y: sourcePos.y + 15 };

                    const tPort =
                      targetPos.inPortsCoords.find(
                        (p) => p.portNumber === conn.targetPortNumber,
                      ) || targetPos.inPortsCoords[0] || { x: targetPos.x, y: targetPos.y + 15 };

                    const isHovered = hoveredConnection === conn.id;
                    const isPassThrough = Boolean(conn.isPassThrough);

                    let pathD = '';

                    if (isPassThrough) {
                      // Straight pass-through horizontal line
                      pathD = `M ${sPort.x} ${sPort.y} L ${tPort.x} ${tPort.y}`;
                    } else if (
                      (conn.sourceNodeId.startsWith('cable_in') || conn.sourceNodeId.startsWith('splitter_')) &&
                      conn.targetNodeId.startsWith('splitter_') &&
                      sourcePos.x < 300 &&
                      targetPos.x < 300
                    ) {
                      // Connections between elements on the left column (looping around on the right side)
                      const controlX = Math.max(sPort.x, tPort.x) + 45;
                      pathD = `M ${sPort.x} ${sPort.y} C ${controlX} ${sPort.y}, ${controlX} ${tPort.y}, ${tPort.x} ${tPort.y}`;
                    } else if (
                      sourcePos.x > 500 &&
                      targetPos.x > 500
                    ) {
                      // Connections between elements on the right column (looping around on the left side)
                      const controlX = Math.min(sPort.x, tPort.x) - 45;
                      pathD = `M ${sPort.x} ${sPort.y} C ${controlX} ${sPort.y}, ${controlX} ${tPort.y}, ${tPort.x} ${tPort.y}`;
                    } else if (tPort.x > sPort.x + 50) {
                      // Left-to-right connections (flowing from left column elements to right column elements)
                      const dx = tPort.x - sPort.x;
                      const c1x = sPort.x + dx * 0.45;
                      const c1y = sPort.y;
                      const c2x = tPort.x - dx * 0.45;
                      const c2y = tPort.y;
                      pathD = `M ${sPort.x} ${sPort.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tPort.x} ${tPort.y}`;
                    } else if (sPort.x > tPort.x + 50) {
                      // Right-to-left connections
                      const dx = sPort.x - tPort.x;
                      const c1x = sPort.x - dx * 0.45;
                      const c1y = sPort.y;
                      const c2x = tPort.x + dx * 0.45;
                      const c2y = tPort.y;
                      pathD = `M ${sPort.x} ${sPort.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tPort.x} ${tPort.y}`;
                    } else {
                      const dx = Math.abs(tPort.x - sPort.x);
                      const sign = tPort.x >= sPort.x ? 1 : -1;
                      const c1x = sPort.x + sign * Math.max(35, dx * 0.45);
                      const c2x = tPort.x - sign * Math.max(35, dx * 0.45);
                      pathD = `M ${sPort.x} ${sPort.y} C ${c1x} ${sPort.y}, ${c2x} ${tPort.y}, ${tPort.x} ${tPort.y}`;
                    }

                    return (
                      <g
                        key={conn.id}
                        onMouseEnter={() => setHoveredConnection(conn.id)}
                        onMouseLeave={() => setHoveredConnection(null)}
                        className="cursor-pointer"
                      >
                        {/* Hit area */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke="transparent"
                          strokeWidth="20"
                        />

                        {isPassThrough ? (
                          /* Solid continuous pass-through fiber */
                          <path
                            d={pathD}
                            fill="none"
                            stroke={conn.fiberColorHex || '#00aa00'}
                            strokeWidth={isHovered ? '4' : '2.5'}
                            strokeLinecap="round"
                            filter={isHovered ? 'url(#glow)' : undefined}
                          />
                        ) : (
                          /* Dashed fused fiber */
                          <>
                            <path
                              d={pathD}
                              fill="none"
                              stroke="#000000"
                              strokeWidth={isHovered ? '4.5' : '3'}
                              strokeLinecap="round"
                            />
                            <path
                              d={pathD}
                              fill="none"
                              stroke={conn.fiberColorHex || '#00aa00'}
                              strokeWidth={isHovered ? '3.5' : '2'}
                              strokeDasharray="5,5"
                              strokeLinecap="round"
                              filter={isHovered ? 'url(#glow)' : undefined}
                            />
                          </>
                        )}
                      </g>
                    );
                  })}

                  {/* 2. Nodes (Cables and Splitters) */}
                  {data.nodes.map((node) => {
                    const pos = nodePositions.get(node.id);
                    if (!pos) return null;

                    if (node.kind === 'cable_in') {
                      return (
                        <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
                          {/* Label Above */}
                          <text
                            x="0"
                            y="-12"
                            fill="#f4f4f5"
                            fontSize="12"
                            fontWeight="600"
                            fontFamily="sans-serif"
                          >
                            {node.name}
                          </text>

                          {/* Black Cable Body on Left */}
                          <rect
                            x="0"
                            y="0"
                            width="65"
                            height={pos.height}
                            rx="5"
                            fill="url(#cableGradient)"
                            stroke="#52525b"
                            strokeWidth="1"
                          />

                          {/* Ports on Right */}
                          {pos.outPortsCoords.map((port, pIdx) => {
                            const portY = 7 + pIdx * 18;
                            return (
                              <g key={port.portNumber}>
                                <rect
                                  x="65"
                                  y={portY}
                                  width="30"
                                  height="16"
                                  rx="3"
                                  fill={port.colorHex || '#00aa00'}
                                  stroke="rgba(0,0,0,0.5)"
                                  strokeWidth="1"
                                />
                                <text
                                  x="80"
                                  y={portY + 12}
                                  fill={port.colorHex === '#ffffff' || port.colorHex === '#ffff00' ? '#000000' : '#ffffff'}
                                  fontSize="11"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                  fontFamily="sans-serif"
                                >
                                  {port.portNumber}
                                </text>
                              </g>
                            );
                          })}
                        </g>
                      );
                    }

                    if (node.kind === 'cable_out') {
                      return (
                        <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
                          {/* Label Above */}
                          <text
                            x="0"
                            y="-12"
                            fill="#f4f4f5"
                            fontSize="12"
                            fontWeight="600"
                            fontFamily="sans-serif"
                          >
                            {node.name}
                          </text>

                          {/* Ports on Left */}
                          {pos.inPortsCoords.map((port, pIdx) => {
                            const portY = 7 + pIdx * 18;
                            return (
                              <g key={port.portNumber}>
                                <rect
                                  x="0"
                                  y={portY}
                                  width="30"
                                  height="16"
                                  rx="3"
                                  fill={port.colorHex || '#00aa00'}
                                  stroke="rgba(0,0,0,0.5)"
                                  strokeWidth="1"
                                />
                                <text
                                  x="15"
                                  y={portY + 12}
                                  fill={port.colorHex === '#ffffff' || port.colorHex === '#ffff00' ? '#000000' : '#ffffff'}
                                  fontSize="11"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                  fontFamily="sans-serif"
                                >
                                  {port.portNumber}
                                </text>
                              </g>
                            );
                          })}

                          {/* Black Cable Body on Right */}
                          <rect
                            x="30"
                            y="0"
                            width="65"
                            height={pos.height}
                            rx="5"
                            fill="url(#cableGradient)"
                            stroke="#52525b"
                            strokeWidth="1"
                          />
                        </g>
                      );
                    }

                    if (node.kind === 'splitter_unbalanced') {
                      return (
                        <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
                          <text
                            x="-40"
                            y="-12"
                            fill="#f4f4f5"
                            fontSize="12"
                            fontWeight="600"
                            fontFamily="sans-serif"
                          >
                            {node.name}
                          </text>

                          {/* White Loop Wire */}
                          <path
                            d="M 25 15 L -22 15 L -22 42 L 10 42"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                          />

                          {/* Input Green Connector */}
                          <rect
                            x="25"
                            y="2"
                            width="30"
                            height="24"
                            rx="4"
                            fill="#00aa00"
                            stroke="#15803d"
                            strokeWidth="1"
                          />
                          <text
                            x="40"
                            y="18"
                            fill="#ffffff"
                            fontSize="12"
                            fontWeight="bold"
                            textAnchor="middle"
                            fontFamily="sans-serif"
                          >
                            1
                          </text>

                          {/* Splitter Metallic Body */}
                          <path
                            d="M 10 40 L 0 40 L -22 47 L 0 54 L 48 54 L 48 28 L 10 28 Z"
                            fill="url(#splitterMetallicGradient)"
                            stroke="#71717a"
                            strokeWidth="1"
                          />

                          <text
                            x="40"
                            y="46"
                            fill="#71717a"
                            fontSize="11"
                            fontWeight="bold"
                            textAnchor="middle"
                            fontFamily="sans-serif"
                          >
                            2
                          </text>
                        </g>
                      );
                    }

                    // Balanced Splitter (1/8, 1/16)
                    const outCount = Math.max(8, node.portsOut?.length || 8);
                    const portHeight = 58 / outCount;

                    return (
                      <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
                        <text
                          x="0"
                          y="-12"
                          fill="#f4f4f5"
                          fontSize="12"
                          fontWeight="600"
                          fontFamily="sans-serif"
                        >
                          {node.name}
                        </text>

                        {/* Input Green Connector on Left */}
                        <rect
                          x="0"
                          y="2"
                          width="30"
                          height="24"
                          rx="4"
                          fill="#00aa00"
                          stroke="#15803d"
                          strokeWidth="1"
                        />
                        <text
                          x="15"
                          y="18"
                          fill="#ffffff"
                          fontSize="12"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="sans-serif"
                        >
                          1
                        </text>

                        {/* Metallic PLC Splitter Body */}
                        <path
                          d="M 30 6 L 66 2 L 66 60 L 30 56 Z"
                          fill="url(#splitterMetallicGradient)"
                          stroke="#71717a"
                          strokeWidth="1"
                        />
                        <text
                          x="48"
                          y="25"
                          fill="#3f3f46"
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="sans-serif"
                        >
                          PLC
                        </text>
                        <text
                          x="48"
                          y="39"
                          fill="#18181b"
                          fontSize="11"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="sans-serif"
                        >
                          {node.ratio || `1/${outCount}`}
                        </text>

                        {/* Output Ports on Right */}
                        {Array.from({ length: outCount }, (_, pIdx) => {
                          const pY = 2 + pIdx * portHeight;
                          const pNum = pIdx + 1;
                          const color = getFiberColor(pNum);
                          const isLight = color === '#ffff00' || color === '#ffffff' || color === '#ff88cc';

                          return (
                            <g key={pNum}>
                              <rect
                                x="68"
                                y={pY}
                                width="27"
                                height={Math.max(4.5, portHeight - 1)}
                                rx="2"
                                fill={color}
                                stroke="rgba(0,0,0,0.5)"
                                strokeWidth="0.8"
                              />
                              <text
                                x="81.5"
                                y={pY + portHeight / 2 + 3}
                                fill={isLight ? '#000000' : '#ffffff'}
                                fontSize={outCount > 8 ? '7' : '8'}
                                fontWeight="bold"
                                textAnchor="middle"
                                fontFamily="sans-serif"
                              >
                                {pNum}
                              </text>
                            </g>
                          );
                        })}
                      </g>
                    );
                  })}
                </g>
              </svg>

              {/* Floating Controls */}
              <div className="absolute right-3 bottom-3 z-20 flex flex-col gap-1.5 bg-surface/90 backdrop-blur-md p-1.5 rounded-2xl border border-border shadow-xl">
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  aria-label="Aumentar zoom"
                  onPress={() => setZoom((z) => Math.min(3.0, z * 1.2))}
                  className="size-9 rounded-xl text-foreground hover:bg-default"
                >
                  <LuZoomIn className="size-4.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  aria-label="Diminuir zoom"
                  onPress={() => setZoom((z) => Math.max(0.3, z / 1.2))}
                  className="size-9 rounded-xl text-foreground hover:bg-default"
                >
                  <LuZoomOut className="size-4.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  aria-label="Ajustar visualização à tela"
                  onPress={applyAutoFit}
                  className="size-9 rounded-xl text-foreground hover:bg-default"
                >
                  <LuMaximize2 className="size-4.5" />
                </Button>
              </div>
            </div>
          ) : data && activeTab === 'fusions' ? (
            /* Mobile Friendly Fusions List View */
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-surface/50">
              <div className="text-xs font-semibold text-muted uppercase tracking-wider px-1">
                Conexões de Fusão ({data.connections.length})
              </div>

              {data.connections.map((conn) => {
                const sourceNode = nodeMap.get(conn.sourceNodeId);
                const targetNode = nodeMap.get(conn.targetNodeId);

                return (
                  <div
                    key={conn.id}
                    className="p-3 bg-surface rounded-xl border border-border/80 shadow-xs hover:border-accent/40 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px] text-muted">
                      <span className="font-semibold text-foreground">
                        {conn.isPassThrough ? `Passagem Direta #${conn.sourcePortNumber}` : `Fusão #${conn.id}`}
                      </span>
                      <span className="inline-flex items-center gap-1 bg-default/40 px-2 py-0.5 rounded-md font-medium">
                        <LuLayers className="size-3 text-sky-500" />
                        {conn.isPassThrough ? 'Tubo Passante' : `Bandeja ${conn.trayNumber || 1}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pt-1">
                      {/* Source */}
                      <div className="p-2 rounded-lg bg-default/30 border border-border/40">
                        <span className="block text-[10px] text-muted uppercase tracking-wider font-semibold">
                          Origem
                        </span>
                        <div className="font-bold text-xs text-foreground truncate mt-0.5">
                          {sourceNode?.name || conn.sourceNodeId}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-[11px] text-muted font-medium">
                          <span>Porta:</span>
                          <span
                            className="px-1.5 py-0.2 rounded font-bold text-white text-[10px]"
                            style={{ backgroundColor: conn.fiberColorHex || '#00aa00' }}
                          >
                            {conn.sourcePortNumber}
                          </span>
                        </div>
                      </div>

                      {/* Arrow with Color Line */}
                      <div className="flex flex-col items-center justify-center px-1">
                        <div
                          className="w-8 h-1 rounded-full"
                          style={{ backgroundColor: conn.fiberColorHex || '#00aa00' }}
                        />
                        <span className="text-[10px] font-bold text-muted mt-0.5">➔</span>
                      </div>

                      {/* Target */}
                      <div className="p-2 rounded-lg bg-default/30 border border-border/40">
                        <span className="block text-[10px] text-muted uppercase tracking-wider font-semibold">
                          Destino
                        </span>
                        <div className="font-bold text-xs text-foreground truncate mt-0.5">
                          {targetNode?.name || conn.targetNodeId}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-[11px] text-muted font-medium">
                          <span>Porta:</span>
                          <span className="px-1.5 py-0.2 rounded font-bold bg-neutral-700 text-white text-[10px]">
                            {conn.targetPortNumber}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Footer info banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-2.5 border-t border-border/80 bg-default/20 text-[11px] sm:text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-success shrink-0" />
            <span>Padrão ABNT / EIA598</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Fusões: <strong>{data?.connections.length || 0}</strong></span>
            <span>Elementos: <strong>{data?.nodes.length || 0}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
