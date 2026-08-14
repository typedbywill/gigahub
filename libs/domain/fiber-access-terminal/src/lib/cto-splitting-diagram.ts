import {
  type FiberAccessTerminalId,
  DomainError,
  DomainErrorCodes,
  assertNonEmpty,
  fiberAccessTerminalId,
} from '@gigahub/shared/kernel';

export type CtoNodeType =
  | 'cable_in'
  | 'cable_out'
  | 'splitter_balanced'
  | 'splitter_unbalanced'
  | 'splitter';

export interface CtoDiagramPort {
  portNumber: number;
  label?: string;
  colorHex?: string;
}

export interface CtoDiagramNode {
  id: string;
  elementId?: string;
  name: string;
  kind: CtoNodeType;
  portsIn: ReadonlyArray<CtoDiagramPort>;
  portsOut: ReadonlyArray<CtoDiagramPort>;
  ratio?: string;
}

export interface CtoDiagramConnection {
  id: string;
  sourceNodeId: string;
  sourcePortNumber: number;
  targetNodeId: string;
  targetPortNumber: number;
  fiberColorHex: string;
  trayNumber: number;
}

export interface CtoSplittingDiagramSnapshot {
  fatId: FiberAccessTerminalId;
  fatName: string;
  nodes: ReadonlyArray<CtoDiagramNode>;
  connections: ReadonlyArray<CtoDiagramConnection>;
}

export interface CreateCtoSplittingDiagramInput {
  fatId: string;
  fatName: string;
  nodes: ReadonlyArray<CtoDiagramNode>;
  connections: ReadonlyArray<CtoDiagramConnection>;
}

export class CtoSplittingDiagram {
  private constructor(private readonly props: CtoSplittingDiagramSnapshot) {}

  static create(input: CreateCtoSplittingDiagramInput): CtoSplittingDiagram {
    const brandedId = fiberAccessTerminalId(input.fatId);
    const validatedName = assertNonEmpty(input.fatName, 'fatName');

    CtoSplittingDiagram.assertValidNodes(input.nodes);
    CtoSplittingDiagram.assertValidConnections(input.nodes, input.connections);

    return new CtoSplittingDiagram({
      fatId: brandedId,
      fatName: validatedName,
      nodes: input.nodes.map((n) => ({
        ...n,
        portsIn: [...n.portsIn],
        portsOut: [...n.portsOut],
      })),
      connections: input.connections.map((c) => ({ ...c })),
    });
  }

  static fromSnapshot(
    snapshot: CtoSplittingDiagramSnapshot,
  ): CtoSplittingDiagram {
    CtoSplittingDiagram.assertValidNodes(snapshot.nodes);
    CtoSplittingDiagram.assertValidConnections(
      snapshot.nodes,
      snapshot.connections,
    );
    return new CtoSplittingDiagram({
      ...snapshot,
      nodes: snapshot.nodes.map((n) => ({
        ...n,
        portsIn: [...n.portsIn],
        portsOut: [...n.portsOut],
      })),
      connections: snapshot.connections.map((c) => ({ ...c })),
    });
  }

  get fatId(): FiberAccessTerminalId {
    return this.props.fatId;
  }

  get fatName(): string {
    return this.props.fatName;
  }

  get nodes(): ReadonlyArray<CtoDiagramNode> {
    return this.props.nodes;
  }

  get connections(): ReadonlyArray<CtoDiagramConnection> {
    return this.props.connections;
  }

  toSnapshot(): CtoSplittingDiagramSnapshot {
    return {
      fatId: this.props.fatId,
      fatName: this.props.fatName,
      nodes: this.props.nodes.map((n) => ({
        ...n,
        portsIn: [...n.portsIn],
        portsOut: [...n.portsOut],
      })),
      connections: this.props.connections.map((c) => ({ ...c })),
    };
  }

  private static assertValidNodes(nodes: ReadonlyArray<CtoDiagramNode>): void {
    const seenNodeIds = new Set<string>();
    for (const node of nodes) {
      if (!node.id || node.id.trim().length === 0) {
        throw new DomainError(
          DomainErrorCodes.InvariantViolation,
          'Node id cannot be empty',
        );
      }
      if (seenNodeIds.has(node.id)) {
        throw new DomainError(
          DomainErrorCodes.InvariantViolation,
          `Duplicate node id: ${node.id}`,
          { nodeId: node.id },
        );
      }
      seenNodeIds.add(node.id);
    }
  }

  private static assertValidConnections(
    nodes: ReadonlyArray<CtoDiagramNode>,
    connections: ReadonlyArray<CtoDiagramConnection>,
  ): void {
    const nodeMap = new Map<string, CtoDiagramNode>(nodes.map((n) => [n.id, n]));

    for (const conn of connections) {
      const sourceNode = nodeMap.get(conn.sourceNodeId);
      if (!sourceNode) {
        throw new DomainError(
          DomainErrorCodes.InvariantViolation,
          `Connection source node not found: ${conn.sourceNodeId}`,
          { connectionId: conn.id, sourceNodeId: conn.sourceNodeId },
        );
      }

      const targetNode = nodeMap.get(conn.targetNodeId);
      if (!targetNode) {
        throw new DomainError(
          DomainErrorCodes.InvariantViolation,
          `Connection target node not found: ${conn.targetNodeId}`,
          { connectionId: conn.id, targetNodeId: conn.targetNodeId },
        );
      }

      if (conn.sourceNodeId === conn.targetNodeId) {
        throw new DomainError(
          DomainErrorCodes.InvariantViolation,
          `Connection cannot connect node to itself: ${conn.sourceNodeId}`,
          { connectionId: conn.id, nodeId: conn.sourceNodeId },
        );
      }
    }
  }
}
