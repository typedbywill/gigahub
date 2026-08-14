import { DomainError, DomainErrorCodes } from '@gigahub/shared/kernel';
import {
  CtoSplittingDiagram,
  type CtoDiagramNode,
  type CtoDiagramConnection,
} from './cto-splitting-diagram';

describe('CtoSplittingDiagram', () => {
  const sampleNodes: CtoDiagramNode[] = [
    {
      id: 'cable_in_10159',
      name: 'Entrada - FLAT Verde-A 205',
      kind: 'cable_in',
      portsIn: [],
      portsOut: [{ portNumber: 1, label: '1', colorHex: '#00aa00' }],
    },
    {
      id: 'splitter_11838',
      name: 'spliter 90/10',
      kind: 'splitter_unbalanced',
      ratio: '90/10',
      portsIn: [{ portNumber: 1, label: '1', colorHex: '#00aa00' }],
      portsOut: [
        { portNumber: 1, label: '1', colorHex: '#00aa00' },
        { portNumber: 2, label: '2', colorHex: '#ffffff' },
      ],
    },
    {
      id: 'cable_out_10159',
      name: 'Saída - FLAT Verde-A 205',
      kind: 'cable_out',
      portsIn: [{ portNumber: 1, label: '1', colorHex: '#00aa00' }],
      portsOut: [],
    },
    {
      id: 'splitter_11839',
      name: 'spliter 1/8',
      kind: 'splitter_balanced',
      portsIn: [{ portNumber: 1, label: '1', colorHex: '#00aa00' }],
      portsOut: Array.from({ length: 8 }, (_, i) => ({
        portNumber: i + 1,
        label: String(i + 1),
        colorHex: '#00aa00',
      })),
    },
  ];

  const sampleConnections: CtoDiagramConnection[] = [
    {
      id: '12320',
      sourceNodeId: 'cable_in_10159',
      sourcePortNumber: 1,
      targetNodeId: 'splitter_11838',
      targetPortNumber: 1,
      fiberColorHex: '#00aa00',
      trayNumber: 1,
    },
    {
      id: '12321',
      sourceNodeId: 'splitter_11838',
      sourcePortNumber: 1,
      targetNodeId: 'cable_out_10159',
      targetPortNumber: 1,
      fiberColorHex: '#00aa00',
      trayNumber: 1,
    },
    {
      id: '12322',
      sourceNodeId: 'splitter_11838',
      sourcePortNumber: 2,
      targetNodeId: 'splitter_11839',
      targetPortNumber: 1,
      fiberColorHex: '#ffff00',
      trayNumber: 1,
    },
  ];

  it('creates a valid CTO splitting diagram', () => {
    const diagram = CtoSplittingDiagram.create({
      fatId: '10194',
      fatName: '10194',
      nodes: sampleNodes,
      connections: sampleConnections,
    });

    expect(diagram.fatId).toBe('10194');
    expect(diagram.fatName).toBe('10194');
    expect(diagram.nodes).toHaveLength(4);
    expect(diagram.connections).toHaveLength(3);

    const snapshot = diagram.toSnapshot();
    const restored = CtoSplittingDiagram.fromSnapshot(snapshot);
    expect(restored.nodes).toHaveLength(4);
    expect(restored.connections).toHaveLength(3);
  });

  it('rejects diagram creation with duplicate node IDs', () => {
    expect(() =>
      CtoSplittingDiagram.create({
        fatId: '10194',
        fatName: '10194',
        nodes: [
          sampleNodes[0],
          { ...sampleNodes[1], id: sampleNodes[0].id },
        ],
        connections: [],
      }),
    ).toThrow(DomainError);
  });

  it('rejects diagram creation with connection referencing missing source node', () => {
    expect(() =>
      CtoSplittingDiagram.create({
        fatId: '10194',
        fatName: '10194',
        nodes: [sampleNodes[0], sampleNodes[1]],
        connections: [
          {
            id: '999',
            sourceNodeId: 'non_existing_node',
            sourcePortNumber: 1,
            targetNodeId: sampleNodes[1].id,
            targetPortNumber: 1,
            fiberColorHex: '#00aa00',
            trayNumber: 1,
          },
        ],
      }),
    ).toThrow(
      expect.objectContaining({
        code: DomainErrorCodes.InvariantViolation,
      }),
    );
  });

  it('rejects connection where source node is the same as target node', () => {
    expect(() =>
      CtoSplittingDiagram.create({
        fatId: '10194',
        fatName: '10194',
        nodes: [sampleNodes[0]],
        connections: [
          {
            id: '999',
            sourceNodeId: sampleNodes[0].id,
            sourcePortNumber: 1,
            targetNodeId: sampleNodes[0].id,
            targetPortNumber: 1,
            fiberColorHex: '#00aa00',
            trayNumber: 1,
          },
        ],
      }),
    ).toThrow(
      expect.objectContaining({
        code: DomainErrorCodes.InvariantViolation,
      }),
    );
  });
});
