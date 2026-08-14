import {
  type CustomerId,
  type FiberAccessTerminalId,
  type GeoPoint,
  DomainError,
  DomainErrorCodes,
  assertNonEmpty,
  customerId,
  fiberAccessTerminalId,
} from '@gigahub/shared/kernel';

export const MIN_PORT_COUNT = 1;

export interface FiberAccessTerminalPort {
  port: number;
  customerId: CustomerId;
}

export interface FiberAccessTerminalSnapshot {
  id: FiberAccessTerminalId;
  idErp: string;
  name: string;
  portCount: number;
  ports: ReadonlyArray<FiberAccessTerminalPort>;
  location?: GeoPoint;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateFiberAccessTerminalInput = Omit<
  FiberAccessTerminalSnapshot,
  'id' | 'ports' | 'createdAt' | 'updatedAt'
> & {
  id: string;
  ports?: ReadonlyArray<{ port: number; customerId: string }>;
  createdAt?: Date;
  updatedAt?: Date;
};

export class FiberAccessTerminal {
  private constructor(private props: FiberAccessTerminalSnapshot) {}

  static create(input: CreateFiberAccessTerminalInput): FiberAccessTerminal {
    const now = input.createdAt ?? new Date();
    return FiberAccessTerminal.fromSnapshot({
      id: fiberAccessTerminalId(input.id),
      idErp: assertNonEmpty(input.idErp, 'idErp'),
      name: assertNonEmpty(input.name, 'name'),
      portCount: input.portCount,
      ports: (input.ports ?? []).map((entry) => ({
        port: entry.port,
        customerId: customerId(entry.customerId),
      })),
      location: input.location,
      createdAt: now,
      updatedAt: input.updatedAt ?? now,
    });
  }

  static fromSnapshot(
    snapshot: FiberAccessTerminalSnapshot,
  ): FiberAccessTerminal {
    FiberAccessTerminal.assertValidPortCount(snapshot.portCount);
    FiberAccessTerminal.assertValidPorts(snapshot.portCount, snapshot.ports);
    return new FiberAccessTerminal({
      ...snapshot,
      ports: snapshot.ports.map((entry) => ({ ...entry })),
    });
  }

  get id(): FiberAccessTerminalId {
    return this.props.id;
  }

  get idErp(): string {
    return this.props.idErp;
  }

  get name(): string {
    return this.props.name;
  }

  get portCount(): number {
    return this.props.portCount;
  }

  get occupiedPortCount(): number {
    return this.props.ports.length;
  }

  get availablePortCount(): number {
    return Math.max(0, this.props.portCount - this.props.ports.length);
  }

  get location(): GeoPoint | undefined {
    return this.props.location;
  }

  linkCustomer(customerIdValue: string, port: number): void {
    const linkedCustomerId = customerId(customerIdValue);
    FiberAccessTerminal.assertPortInRange(port, this.props.portCount);
    if (this.props.ports.some((entry) => entry.port === port)) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        `Port ${port} is already occupied`,
        { fiberAccessTerminalId: this.props.id, port },
      );
    }
    if (
      this.props.ports.some((entry) => entry.customerId === linkedCustomerId)
    ) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        'Customer is already linked to a port on this terminal',
        {
          fiberAccessTerminalId: this.props.id,
          customerId: linkedCustomerId,
        },
      );
    }
    this.props.ports = [
      ...this.props.ports,
      { port, customerId: linkedCustomerId },
    ];
    this.touch();
  }

  unlinkCustomer(customerIdValue: string): void {
    const linkedCustomerId = customerId(customerIdValue);
    const index = this.props.ports.findIndex(
      (entry) => entry.customerId === linkedCustomerId,
    );
    if (index === -1) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        'Customer is not linked to this terminal',
        {
          fiberAccessTerminalId: this.props.id,
          customerId: linkedCustomerId,
        },
      );
    }
    this.props.ports = this.props.ports.filter((_, i) => i !== index);
    this.touch();
  }

  toSnapshot(): FiberAccessTerminalSnapshot {
    return {
      ...this.props,
      ports: this.props.ports.map((entry) => ({ ...entry })),
    };
  }

  private static assertValidPortCount(portCount: number): void {
    if (!Number.isInteger(portCount) || portCount < MIN_PORT_COUNT) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        `Port count must be an integer greater than or equal to ${MIN_PORT_COUNT}`,
        { portCount },
      );
    }
  }

  private static assertValidPorts(
    portCount: number,
    ports: ReadonlyArray<FiberAccessTerminalPort>,
  ): void {
    const seenPorts = new Set<number>();
    const seenCustomers = new Set<CustomerId>();

    for (const entry of ports) {
      FiberAccessTerminal.assertPortInRange(entry.port, portCount);
      if (seenPorts.has(entry.port)) {
        throw new DomainError(
          DomainErrorCodes.InvariantViolation,
          `Duplicate port assignment: ${entry.port}`,
          { port: entry.port },
        );
      }
      if (seenCustomers.has(entry.customerId)) {
        throw new DomainError(
          DomainErrorCodes.InvariantViolation,
          'Customer cannot be linked to more than one port on the same terminal',
          { customerId: entry.customerId },
        );
      }
      seenPorts.add(entry.port);
      seenCustomers.add(entry.customerId);
    }
  }

  private static assertPortInRange(port: number, portCount: number): void {
    if (!Number.isInteger(port) || port < MIN_PORT_COUNT || port > portCount) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        `Port must be an integer between ${MIN_PORT_COUNT} and ${portCount}`,
        { port, portCount },
      );
    }
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}
