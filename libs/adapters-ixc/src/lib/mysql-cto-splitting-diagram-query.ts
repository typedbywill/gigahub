import type {
  CtoDiagramConnectionReadModel,
  CtoDiagramNodeReadModel,
  CtoDiagramPortReadModel,
  CtoSplittingDiagramQuery,
  CtoSplittingDiagramReadModel,
} from '@gigahub/application-network';
import type { Pool, RowDataPacket } from 'mysql2/promise';

interface FatRow extends RowDataPacket {
  id: number;
  descricao: string;
}

interface FusaoRow extends RowDataPacket {
  id: number;
  porta_elemento_origem: number;
  interface_elemento_origem: number;
  id_elemento_origem: number;
  id_conexao_elemento_origem: number;
  io_elemento_origem: string;
  tabela_elemento_origem: string;
  porta_elemento_destino: number;
  interface_elemento_destino: number;
  id_elemento_destino: number;
  id_conexao_elemento_destino: number;
  io_elemento_destino: string;
  tabela_elemento_destino: string;
  id_tipo_conexao: number;
  id_elemento_principal: number;
  tabela_elemento_principal: string;
  tipo_elemento_origem: string;
  tipo_elemento_destino: string;
  id_tipo_fusao: number;
  bandeja: number;

  orig_elem_id: number | null;
  orig_elem_nome: string | null;
  orig_elem_tipo: string | null;
  orig_tipo_nome: string | null;
  orig_prop: string | null;
  orig_split_tipo: string | null;
  orig_split_in: number | null;
  orig_split_out: number | null;
  orig_cor: string | null;
  orig_cabo_fibras: number | null;

  dest_elem_id: number | null;
  dest_elem_nome: string | null;
  dest_elem_tipo: string | null;
  dest_tipo_nome: string | null;
  dest_prop: string | null;
  dest_split_tipo: string | null;
  dest_split_in: number | null;
  dest_split_out: number | null;
  dest_cor: string | null;
  dest_cabo_fibras: number | null;
}

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

export function getFiberColor(portNumber: number): string {
  if (portNumber <= 0) return '#00aa00';
  const index = (portNumber - 1) % FIBER_COLOR_SEQUENCE.length;
  return FIBER_COLOR_SEQUENCE[index];
}

function resolveRatio(name: string | null, prop: string | null): string | undefined {
  if (prop && prop.trim().length > 0) return prop.trim();
  if (!name) return undefined;
  const match = name.match(/(\d+\/\d+|\d+x\d+)/i);
  return match ? match[1] : undefined;
}

export class MysqlCtoSplittingDiagramQuery implements CtoSplittingDiagramQuery {
  constructor(private readonly pool: Pool) {}

  async findByFatId(fatId: string): Promise<CtoSplittingDiagramReadModel | null> {
    const numericId = Number(fatId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return null;
    }

    const [boxRows] = await this.pool.query<FatRow[]>(
      `SELECT id, descricao FROM rad_caixa_ftth WHERE id = ? LIMIT 1`,
      [numericId],
    );

    if (boxRows.length === 0) {
      return null;
    }

    const box = boxRows[0];
    const fatName = (box.descricao ?? '').trim() || `CTO ${fatId}`;

    const [fusions] = await this.pool.query<FusaoRow[]>(
      `SELECT f.*,
              eo.id as orig_elem_id, eo.descricao as orig_elem_nome, eo.tipo as orig_elem_tipo,
              t_orig.nome_tipo as orig_tipo_nome, t_orig.splitter_proporcao as orig_prop,
              t_orig.splitter_tipo as orig_split_tipo, t_orig.splitter_numero_entradas as orig_split_in,
              t_orig.splitter_numero_saidas as orig_split_out, t_orig.cor_ativa as orig_cor,
              t_orig.cabo_numero_fibras as orig_cabo_fibras,
              ed.id as dest_elem_id, ed.descricao as dest_elem_nome, ed.tipo as dest_elem_tipo,
              t_dest.nome_tipo as dest_tipo_nome, t_dest.splitter_proporcao as dest_prop,
              t_dest.splitter_tipo as dest_split_tipo, t_dest.splitter_numero_entradas as dest_split_in,
              t_dest.splitter_numero_saidas as dest_split_out, t_dest.cor_ativa as dest_cor,
              t_dest.cabo_numero_fibras as dest_cabo_fibras
       FROM df_fusao f
       LEFT JOIN df_elemento eo ON eo.id = f.id_elemento_origem
       LEFT JOIN df_tipo_elemento t_orig ON t_orig.id = eo.id_tipo_elemento
       LEFT JOIN df_elemento ed ON ed.id = f.id_elemento_destino
       LEFT JOIN df_tipo_elemento t_dest ON t_dest.id = ed.id_tipo_elemento
       WHERE f.id_elemento_principal = ? AND f.tabela_elemento_principal = 'rad_caixa_ftth'
       ORDER BY f.id ASC`,
      [numericId],
    );

    const nodeMap = new Map<string, CtoDiagramNodeReadModel>();
    const connections: CtoDiagramConnectionReadModel[] = [];

    // Track used ports on cables to compute pass-through fibers
    const usedCableInPorts = new Map<number, Set<number>>();
    const usedCableOutPorts = new Map<number, Set<number>>();
    const cableFiberCounts = new Map<number, number>();

    for (const f of fusions) {
      // 1. Process Source Node
      const isSourceCable = f.tipo_elemento_origem === 'cabo';
      const isSourceIn = f.io_elemento_origem === 'IN';
      const isSourceOut = f.io_elemento_origem === 'OUT';

      let sourceNodeId: string;
      if (isSourceCable) {
        sourceNodeId = isSourceOut
          ? `cable_out_${f.id_elemento_origem}`
          : `cable_in_${f.id_elemento_origem}`;

        if (isSourceIn) {
          if (!usedCableInPorts.has(f.id_elemento_origem)) {
            usedCableInPorts.set(f.id_elemento_origem, new Set());
          }
          usedCableInPorts.get(f.id_elemento_origem)!.add(f.porta_elemento_origem || 1);
        } else if (isSourceOut) {
          if (!usedCableOutPorts.has(f.id_elemento_origem)) {
            usedCableOutPorts.set(f.id_elemento_origem, new Set());
          }
          usedCableOutPorts.get(f.id_elemento_origem)!.add(f.porta_elemento_origem || 1);
        }

        if (f.orig_cabo_fibras) {
          cableFiberCounts.set(f.id_elemento_origem, f.orig_cabo_fibras);
        }
      } else {
        sourceNodeId = `splitter_${f.id_elemento_origem}`;
      }

      if (!nodeMap.has(sourceNodeId)) {
        const rawName = f.orig_elem_nome || f.orig_tipo_nome || `Elemento ${f.id_elemento_origem}`;
        if (isSourceCable) {
          const kind = isSourceOut ? 'cable_out' : 'cable_in';
          const name = isSourceOut
            ? `Saída - ${rawName}`
            : isSourceIn
            ? `Entrada - ${rawName}`
            : rawName;

          const count = f.orig_cabo_fibras && f.orig_cabo_fibras > 0 ? f.orig_cabo_fibras : Math.max(1, f.porta_elemento_origem || 1);
          const ports: CtoDiagramPortReadModel[] = Array.from({ length: count }, (_, i) => ({
            portNumber: i + 1,
            label: String(i + 1),
            colorHex: getFiberColor(i + 1),
          }));

          nodeMap.set(sourceNodeId, {
            id: sourceNodeId,
            elementId: String(f.id_elemento_origem),
            name,
            kind,
            portsIn: isSourceOut ? ports : [],
            portsOut: isSourceIn || !isSourceOut ? ports : [],
          });
        } else {
          const isUnbalanced = f.orig_split_tipo === 'DS' || /9\d|8\d|7\d|6\d|5\d/.test(rawName);
          const kind = isUnbalanced ? 'splitter_unbalanced' : 'splitter_balanced';
          const inCount = f.orig_split_in || 1;
          const outCount = f.orig_split_out || (isUnbalanced ? 2 : 8);

          const portsIn: CtoDiagramPortReadModel[] = Array.from({ length: inCount }, (_, i) => ({
            portNumber: i + 1,
            label: String(i + 1),
            colorHex: getFiberColor(i + 1),
          }));

          const portsOut: CtoDiagramPortReadModel[] = Array.from({ length: outCount }, (_, i) => ({
            portNumber: i + 1,
            label: String(i + 1),
            colorHex: isUnbalanced && i === 1 ? '#ffffff' : getFiberColor(i + 1),
          }));

          nodeMap.set(sourceNodeId, {
            id: sourceNodeId,
            elementId: String(f.id_elemento_origem),
            name: rawName,
            kind,
            portsIn,
            portsOut,
            ratio: resolveRatio(rawName, f.orig_prop),
          });
        }
      }

      // 2. Process Destination Node
      const isDestCable = f.tipo_elemento_destino === 'cabo';
      const isDestIn = f.io_elemento_destino === 'IN';
      const isDestOut = f.io_elemento_destino === 'OUT';

      let destNodeId: string;
      if (isDestCable) {
        destNodeId = isDestOut
          ? `cable_out_${f.id_elemento_destino}`
          : `cable_in_${f.id_elemento_destino}`;

        if (isDestIn) {
          if (!usedCableInPorts.has(f.id_elemento_destino)) {
            usedCableInPorts.set(f.id_elemento_destino, new Set());
          }
          usedCableInPorts.get(f.id_elemento_destino)!.add(f.porta_elemento_destino || 1);
        } else if (isDestOut) {
          if (!usedCableOutPorts.has(f.id_elemento_destino)) {
            usedCableOutPorts.set(f.id_elemento_destino, new Set());
          }
          usedCableOutPorts.get(f.id_elemento_destino)!.add(f.porta_elemento_destino || 1);
        }

        if (f.dest_cabo_fibras) {
          cableFiberCounts.set(f.id_elemento_destino, f.dest_cabo_fibras);
        }
      } else {
        destNodeId = `splitter_${f.id_elemento_destino}`;
      }

      if (!nodeMap.has(destNodeId)) {
        const rawName = f.dest_elem_nome || f.dest_tipo_nome || `Elemento ${f.id_elemento_destino}`;
        if (isDestCable) {
          const kind = isDestOut ? 'cable_out' : 'cable_in';
          const name = isDestOut
            ? `Saída - ${rawName}`
            : isDestIn
            ? `Entrada - ${rawName}`
            : rawName;

          const count = f.dest_cabo_fibras && f.dest_cabo_fibras > 0 ? f.dest_cabo_fibras : Math.max(1, f.porta_elemento_destino || 1);
          const ports: CtoDiagramPortReadModel[] = Array.from({ length: count }, (_, i) => ({
            portNumber: i + 1,
            label: String(i + 1),
            colorHex: getFiberColor(i + 1),
          }));

          nodeMap.set(destNodeId, {
            id: destNodeId,
            elementId: String(f.id_elemento_destino),
            name,
            kind,
            portsIn: isDestOut ? ports : [],
            portsOut: isDestIn || !isDestOut ? ports : [],
          });
        } else {
          const isUnbalanced = f.dest_split_tipo === 'DS' || /9\d|8\d|7\d|6\d|5\d/.test(rawName);
          const kind = isUnbalanced ? 'splitter_unbalanced' : 'splitter_balanced';
          const inCount = f.dest_split_in || 1;
          const outCount = f.dest_split_out || (isUnbalanced ? 2 : 8);

          const portsIn: CtoDiagramPortReadModel[] = Array.from({ length: inCount }, (_, i) => ({
            portNumber: i + 1,
            label: String(i + 1),
            colorHex: getFiberColor(i + 1),
          }));

          const portsOut: CtoDiagramPortReadModel[] = Array.from({ length: outCount }, (_, i) => ({
            portNumber: i + 1,
            label: String(i + 1),
            colorHex: isUnbalanced && i === 1 ? '#ffffff' : getFiberColor(i + 1),
          }));

          nodeMap.set(destNodeId, {
            id: destNodeId,
            elementId: String(f.id_elemento_destino),
            name: rawName,
            kind,
            portsIn,
            portsOut,
            ratio: resolveRatio(rawName, f.dest_prop),
          });
        }
      }

      // 3. Determine Connection Line Color
      let fiberColorHex = getFiberColor(f.porta_elemento_origem || 1);
      if (f.tipo_elemento_origem === 'splitter' && f.porta_elemento_origem === 2) {
        fiberColorHex = '#ffff00';
      }

      connections.push({
        id: String(f.id),
        sourceNodeId,
        sourcePortNumber: f.porta_elemento_origem || 1,
        targetNodeId: destNodeId,
        targetPortNumber: f.porta_elemento_destino || 1,
        fiberColorHex,
        trayNumber: f.bandeja || 1,
      });
    }

    // 4. Generate Pass-through Fibers for Cables that enter and leave the box
    for (const [cableId, fiberCount] of cableFiberCounts.entries()) {
      const inNodeId = `cable_in_${cableId}`;
      const outNodeId = `cable_out_${cableId}`;

      if (nodeMap.has(inNodeId) && nodeMap.has(outNodeId)) {
        const inUsed = usedCableInPorts.get(cableId) || new Set();
        const outUsed = usedCableOutPorts.get(cableId) || new Set();

        for (let p = 1; p <= fiberCount; p++) {
          if (!inUsed.has(p) && !outUsed.has(p)) {
            connections.push({
              id: `passthrough_${cableId}_${p}`,
              sourceNodeId: inNodeId,
              sourcePortNumber: p,
              targetNodeId: outNodeId,
              targetPortNumber: p,
              fiberColorHex: getFiberColor(p),
              trayNumber: 1,
              isPassThrough: true,
            });
          }
        }
      }
    }

    return {
      fatId: String(box.id),
      fatName,
      nodes: Array.from(nodeMap.values()),
      connections,
    };
  }
}
