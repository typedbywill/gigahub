import React, { useEffect, useMemo, useState } from 'react';
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
  LuMaximize2,
  LuRefreshCw,
  LuX,
  LuZoomIn,
  LuZoomOut,
} from 'react-icons/lu';
import type {
  CtoSplittingDiagramResponseDto,
} from '@gigahub/shared/contracts';
import { getCtoSplittingDiagramRequest } from '../../shared/api/projeto.api';

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
  inPortsCoords: Array<{ portNumber: number; x: number; y: number }>;
  outPortsCoords: Array<{ portNumber: number; x: number; y: number }>;
}

export const CtoSplittingModal: React.FC<CtoSplittingModalProps> = ({
  fatId,
  onClose,
}) => {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [data, setData] = useState<CtoSplittingDiagramResponseDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);

  useEffect(() => {
    if (!fatId || !accessToken) {
      setData(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    setLoading(true);
    setError(null);

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
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Compute Layout Positions for SVG
  const { nodePositions, svgWidth, svgHeight } = useMemo(() => {
    if (!data || data.nodes.length === 0) {
      return { nodePositions: new Map<string, NodeLayoutPosition>(), svgWidth: 950, svgHeight: 450 };
    }

    const positions = new Map<string, NodeLayoutPosition>();

    const cableInNodes = data.nodes.filter((n) => n.kind === 'cable_in');
    const cableOutNodes = data.nodes.filter((n) => n.kind === 'cable_out');
    const unbalSplitters = data.nodes.filter((n) => n.kind === 'splitter_unbalanced');
    const balSplitters = data.nodes.filter((n) => n.kind === 'splitter_balanced' || n.kind === 'splitter');

    // Left Column X = 50, Right Column X = 720
    const leftX = 50;
    const rightX = 720;

    // 1. Position Input Cables (Top Left)
    cableInNodes.forEach((node, idx) => {
      const x = leftX;
      const y = 60 + idx * 100;
      const width = 110;
      const height = 30;
      positions.set(node.id, {
        x,
        y,
        width,
        height,
        inPortsCoords: [],
        outPortsCoords: [{ portNumber: 1, x: x + width, y: y + height / 2 }],
      });
    });

    // 2. Position Unbalanced Splitters (Bottom Left)
    unbalSplitters.forEach((node, idx) => {
      const x = leftX + 40;
      const y = 190 + idx * 130;
      const width = 80;
      const height = 65;
      positions.set(node.id, {
        x,
        y,
        width,
        height,
        inPortsCoords: [{ portNumber: 1, x: x + 25, y: y + 16 }],
        outPortsCoords: [
          { portNumber: 1, x: x + 40, y: y + 20 },
          { portNumber: 2, x: x + width - 5, y: y + height - 15 },
        ],
      });
    });

    // 3. Position Output Cables (Top Right)
    cableOutNodes.forEach((node, idx) => {
      const x = rightX;
      const y = 60 + idx * 100;
      const width = 110;
      const height = 30;
      positions.set(node.id, {
        x,
        y,
        width,
        height,
        inPortsCoords: [{ portNumber: 1, x, y: y + height / 2 }],
        outPortsCoords: [],
      });
    });

    // 4. Position Balanced Splitters (Bottom Right)
    balSplitters.forEach((node, idx) => {
      const x = rightX;
      const y = 190 + idx * 130;
      const width = 90;
      const height = 65;
      positions.set(node.id, {
        x,
        y,
        width,
        height,
        inPortsCoords: [{ portNumber: 1, x, y: y + 20 }],
        outPortsCoords: Array.from({ length: 8 }, (_, pIdx) => ({
          portNumber: pIdx + 1,
          x: x + width,
          y: y + 10 + pIdx * 6,
        })),
      });
    });

    // Handle any fallback nodes that didn't match the strict layout
    data.nodes.forEach((node, i) => {
      if (!positions.has(node.id)) {
        const x = 380 + (i % 2) * 160;
        const y = 100 + Math.floor(i / 2) * 100;
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

    return { nodePositions: positions, svgWidth: 920, svgHeight: 400 };
  }, [data]);

  const handleCopyJson = () => {
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!fatId) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cto-splitting-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
    >
      <div className="flex flex-col w-full max-w-5xl max-h-[92vh] bg-surface rounded-2xl border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/80 bg-default/10">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
              <LuGitFork className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="cto-splitting-title"
                  className="text-base font-bold text-foreground"
                >
                  Splitagem da CTO {data?.fatName || fatId}
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-accent/15 text-accent">
                  ID #{fatId}
                </span>
              </div>
              <p className="text-xs text-muted">
                Diagrama esquemático de fusões ópticas e splitters internos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip content={copied ? 'Copiado!' : 'Copiar dados JSON'}>
              <Button
                size="sm"
                variant="ghost"
                isIconOnly
                aria-label="Copiar dados"
                onPress={handleCopyJson}
                className="text-muted hover:text-foreground"
              >
                {copied ? (
                  <LuCheck className="size-4 text-success" />
                ) : (
                  <LuCopy className="size-4" />
                )}
              </Button>
            </Tooltip>

            <Tooltip content="Aumentar zoom">
              <Button
                size="sm"
                variant="ghost"
                isIconOnly
                aria-label="Aumentar zoom"
                onPress={() => setZoom((z) => Math.min(1.6, z + 0.15))}
                className="text-muted hover:text-foreground"
              >
                <LuZoomIn className="size-4" />
              </Button>
            </Tooltip>

            <Tooltip content="Diminuir zoom">
              <Button
                size="sm"
                variant="ghost"
                isIconOnly
                aria-label="Diminuir zoom"
                onPress={() => setZoom((z) => Math.max(0.6, z - 0.15))}
                className="text-muted hover:text-foreground"
              >
                <LuZoomOut className="size-4" />
              </Button>
            </Tooltip>

            <Tooltip content="Resetar zoom">
              <Button
                size="sm"
                variant="ghost"
                isIconOnly
                aria-label="Resetar zoom"
                onPress={() => setZoom(1)}
                className="text-muted hover:text-foreground"
              >
                <LuMaximize2 className="size-4" />
              </Button>
            </Tooltip>

            <Button
              size="sm"
              variant="ghost"
              isIconOnly
              aria-label="Fechar janela"
              onPress={onClose}
              className="rounded-lg text-muted hover:text-foreground ml-1"
            >
              <LuX className="size-5" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative flex-1 overflow-auto bg-neutral-800 dark:bg-neutral-950 p-4 min-h-[380px] flex items-center justify-center select-none">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-muted">
              <Spinner size="lg" color="primary" />
              <span className="text-sm">Carregando diagrama de splitagem...</span>
            </div>
          ) : error ? (
            <div className="max-w-md p-6 text-center space-y-3">
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
          ) : data && data.nodes.length === 0 ? (
            <div className="text-center p-8 space-y-2 text-muted">
              <LuGitFork className="size-10 mx-auto stroke-1 opacity-50" />
              <p className="text-sm font-medium text-foreground">
                Nenhuma splitagem ou fusão cadastrada para esta CTO.
              </p>
              <p className="text-xs">
                As conexões de fibras podem ser cadastradas no módulo de desenho de rede do ERP.
              </p>
            </div>
          ) : data ? (
            <div
              className="transition-transform duration-200 ease-out origin-center shadow-inner rounded-xl overflow-hidden border border-neutral-700/60"
              style={{ transform: `scale(${zoom})` }}
            >
              <svg
                width={svgWidth}
                height={svgHeight}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="bg-[#6b7280]/20"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, rgba(255, 255, 255, 0.07) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255, 255, 255, 0.07) 1px, transparent 1px)
                  `,
                  backgroundSize: '16px 16px',
                }}
              >
                <defs>
                  {/* Cable Cylinder Gradient */}
                  <linearGradient id="cableGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#27272a" />
                    <stop offset="35%" stopColor="#09090b" />
                    <stop offset="70%" stopColor="#18181b" />
                    <stop offset="100%" stopColor="#000000" />
                  </linearGradient>

                  {/* Green Connector Gradient */}
                  <linearGradient id="greenConnectorGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="50%" stopColor="#15803d" />
                    <stop offset="100%" stopColor="#166534" />
                  </linearGradient>

                  {/* Splitter Metallic Gradient */}
                  <linearGradient id="splitterMetallicGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f4f4f5" />
                    <stop offset="60%" stopColor="#e4e4e7" />
                    <stop offset="100%" stopColor="#71717a" />
                  </linearGradient>

                  {/* Glow filter for active/hovered fiber */}
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* 1. Render Connections (Optical Fibers) */}
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

                  // Determine Bézier curve shape
                  const isHovered = hoveredConnection === conn.id;
                  let pathD = '';

                  if (
                    conn.sourceNodeId.startsWith('cable_in') &&
                    conn.targetNodeId.startsWith('splitter_')
                  ) {
                    // Loop curve from cable down to splitter input
                    const controlX = sPort.x + 40;
                    pathD = `M ${sPort.x} ${sPort.y} C ${controlX} ${sPort.y}, ${controlX} ${tPort.y}, ${tPort.x} ${tPort.y}`;
                  } else if (
                    conn.sourceNodeId.startsWith('splitter_') &&
                    conn.targetNodeId.startsWith('cable_out')
                  ) {
                    // Diagonal curve from splitter up to cable out
                    const dx = tPort.x - sPort.x;
                    const c1x = sPort.x + dx * 0.4;
                    const c1y = sPort.y;
                    const c2x = sPort.x + dx * 0.6;
                    const c2y = tPort.y;
                    pathD = `M ${sPort.x} ${sPort.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tPort.x} ${tPort.y}`;
                  } else {
                    // General smooth curve
                    const dx = Math.abs(tPort.x - sPort.x);
                    const c1x = sPort.x + Math.max(30, dx * 0.4);
                    const c2x = tPort.x - Math.max(30, dx * 0.4);
                    pathD = `M ${sPort.x} ${sPort.y} C ${c1x} ${sPort.y}, ${c2x} ${tPort.y}, ${tPort.x} ${tPort.y}`;
                  }

                  return (
                    <g
                      key={conn.id}
                      onMouseEnter={() => setHoveredConnection(conn.id)}
                      onMouseLeave={() => setHoveredConnection(null)}
                      className="cursor-pointer"
                    >
                      {/* Wider invisible stroke for easier hover */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="transparent"
                        strokeWidth="14"
                      />

                      {/* Black outline track */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#000000"
                        strokeWidth={isHovered ? '4' : '3'}
                        strokeLinecap="round"
                      />

                      {/* Dashed Color Fiber line */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={conn.fiberColorHex || '#00aa00'}
                        strokeWidth={isHovered ? '3' : '2'}
                        strokeDasharray="5,5"
                        strokeLinecap="round"
                        filter={isHovered ? 'url(#glow)' : undefined}
                      />
                    </g>
                  );
                })}

                {/* 2. Render Nodes (Cables and Splitters) */}
                {data.nodes.map((node) => {
                  const pos = nodePositions.get(node.id);
                  if (!pos) return null;

                  if (node.kind === 'cable_in') {
                    // Cable Input: Black cylinder with green tip on right
                    return (
                      <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
                        {/* Text Label Above */}
                        <text
                          x="0"
                          y="-20"
                          fill="#e4e4e7"
                          fontSize="11"
                          fontWeight="600"
                          fontFamily="sans-serif"
                        >
                          {node.name.split(' - ')[0] || 'Entrada'} -{' '}
                          {node.name.split(' - ')[1]?.split(' ')[0] || ''}
                        </text>
                        <text
                          x="0"
                          y="-7"
                          fill="#a1a1aa"
                          fontSize="10"
                          fontWeight="500"
                          fontFamily="sans-serif"
                        >
                          {node.name.split(' ').pop() || ''}
                        </text>

                        {/* Black Cable Body */}
                        <rect
                          x="0"
                          y="0"
                          width="70"
                          height="24"
                          rx="4"
                          fill="url(#cableGradient)"
                          stroke="#3f3f46"
                          strokeWidth="1"
                        />

                        {/* Green Connector Tip */}
                        <rect
                          x="70"
                          y="2"
                          width="30"
                          height="20"
                          rx="3"
                          fill="url(#greenConnectorGradient)"
                          stroke="#16a34a"
                          strokeWidth="1"
                        />
                        <text
                          x="85"
                          y="16"
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="sans-serif"
                        >
                          1
                        </text>
                      </g>
                    );
                  }

                  if (node.kind === 'cable_out') {
                    // Cable Output: Green tip on left, black cylinder on right
                    return (
                      <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
                        {/* Text Label Above */}
                        <text
                          x="0"
                          y="-20"
                          fill="#e4e4e7"
                          fontSize="11"
                          fontWeight="600"
                          fontFamily="sans-serif"
                        >
                          {node.name.split(' - ')[0] || 'Saída'} -{' '}
                          {node.name.split(' - ')[1]?.split(' ')[0] || ''}
                        </text>
                        <text
                          x="0"
                          y="-7"
                          fill="#a1a1aa"
                          fontSize="10"
                          fontWeight="500"
                          fontFamily="sans-serif"
                        >
                          {node.name.split(' ').pop() || ''}
                        </text>

                        {/* Green Connector Tip */}
                        <rect
                          x="0"
                          y="2"
                          width="30"
                          height="20"
                          rx="3"
                          fill="url(#greenConnectorGradient)"
                          stroke="#16a34a"
                          strokeWidth="1"
                        />
                        <text
                          x="15"
                          y="16"
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="sans-serif"
                        >
                          1
                        </text>

                        {/* Black Cable Body */}
                        <rect
                          x="30"
                          y="0"
                          width="70"
                          height="24"
                          rx="4"
                          fill="url(#cableGradient)"
                          stroke="#3f3f46"
                          strokeWidth="1"
                        />
                      </g>
                    );
                  }

                  if (node.kind === 'splitter_unbalanced') {
                    // Unbalanced Splitter (90/10)
                    return (
                      <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
                        {/* Splitter Label */}
                        <text
                          x="-40"
                          y="-10"
                          fill="#e4e4e7"
                          fontSize="11"
                          fontWeight="600"
                          fontFamily="sans-serif"
                        >
                          {node.name}
                        </text>

                        {/* White Wire Frame connecting input and output body */}
                        <path
                          d="M 25 15 L -20 15 L -20 40 L 10 40"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="2.5"
                        />

                        {/* Input Green Connector */}
                        <rect
                          x="25"
                          y="3"
                          width="30"
                          height="24"
                          rx="3"
                          fill="url(#greenConnectorGradient)"
                          stroke="#16a34a"
                          strokeWidth="1"
                        />
                        <text
                          x="40"
                          y="19"
                          fill="#ffffff"
                          fontSize="12"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="sans-serif"
                        >
                          1
                        </text>

                        {/* Splitter Body Metallic Wedge/Cone */}
                        <path
                          d="M 10 40 L 0 40 L -20 46 L 0 52 L 45 52 L 45 28 L 10 28 Z"
                          fill="url(#splitterMetallicGradient)"
                          stroke="#71717a"
                          strokeWidth="1"
                        />

                        {/* Output 2 Label/Port */}
                        <text
                          x="38"
                          y="45"
                          fill="#71717a"
                          fontSize="10"
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
                  return (
                    <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
                      {/* Splitter Label */}
                      <text
                        x="0"
                        y="-10"
                        fill="#e4e4e7"
                        fontSize="11"
                        fontWeight="600"
                        fontFamily="sans-serif"
                      >
                        {node.name}
                      </text>

                      {/* White Loop Wire on Right */}
                      <path
                        d="M 30 15 L 65 15 L 65 42 L 30 42"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                      />

                      {/* Input Green Connector */}
                      <rect
                        x="0"
                        y="3"
                        width="30"
                        height="24"
                        rx="3"
                        fill="url(#greenConnectorGradient)"
                        stroke="#16a34a"
                        strokeWidth="1"
                      />
                      <text
                        x="15"
                        y="19"
                        fill="#ffffff"
                        fontSize="12"
                        fontWeight="bold"
                        textAnchor="middle"
                        fontFamily="sans-serif"
                      >
                        1
                      </text>

                      {/* Splitter Body Metallic Wedge/Cone */}
                      <path
                        d="M 0 30 L 30 30 L 30 54 L 0 54 L -15 48 Z"
                        fill="url(#splitterMetallicGradient)"
                        stroke="#71717a"
                        strokeWidth="1"
                      />

                      {/* Output 2/Ports Label */}
                      <text
                        x="15"
                        y="47"
                        fill="#71717a"
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                        fontFamily="sans-serif"
                      >
                        2
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : null}
        </div>

        {/* Footer info banner */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-border/80 bg-default/20 text-xs text-muted">
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-success" />
            <span>Padrão de Cores de Fusão: <strong>ABNT / EIA598</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <span>Fusões Ativas: <strong>{data?.connections.length || 0}</strong></span>
            <span>Elementos: <strong>{data?.nodes.length || 0}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
