import {
  DomainError,
  DomainErrorCodes,
  assertNonEmpty,
} from '@gigahub/shared/kernel';

export type OpticalSignalQuality =
  | 'EXCELLENT'
  | 'GOOD'
  | 'WARNING'
  | 'CRITICAL'
  | 'OFFLINE';

export interface OpticalSignalInfo {
  rxPowerDbm: number;
  txPowerDbm: number;
  quality: OpticalSignalQuality;
  isMock: true;
}

export interface CtoCustomerSnapshot {
  radUsuarioId: string;
  clienteId: string;
  contratoId?: string;
  login: string;
  mac?: string;
  portaFtth: number;
  razaoSocial: string;
  nomeFantasia?: string;
  cpfCnpj?: string;
  telefone?: string;
  endereco?: string;
  online: boolean;
  signal: OpticalSignalInfo;
}

export interface CreateCtoCustomerInput {
  radUsuarioId: string;
  clienteId: string;
  contratoId?: string;
  login: string;
  mac?: string;
  portaFtth: number;
  razaoSocial: string;
  nomeFantasia?: string;
  cpfCnpj?: string;
  telefone?: string;
  endereco?: string;
  online: boolean;
  signal?: OpticalSignalInfo;
}

/**
 * Generates a realistic mock optical signal (PON) based on deterministic user/port data.
 * Useful until real-time OLT telemetry is integrated.
 */
export function generateMockOpticalSignal(
  radUsuarioId: string,
  portaFtth: number,
  online: boolean,
): OpticalSignalInfo {
  if (!online) {
    return {
      rxPowerDbm: -40.0,
      txPowerDbm: 0.0,
      quality: 'OFFLINE',
      isMock: true,
    };
  }

  // Deterministic seed from ID and port
  const numId = parseInt(radUsuarioId.replace(/\D/g, ''), 10) || 12345;
  const hash = Math.abs((numId * 31 + portaFtth * 17) % 100);

  // Healthy range: -18.0 to -24.5 dBm
  // Hash maps 0..99 into a realistic distribution:
  // 0..60 -> Excellent (-18.0 to -21.9)
  // 61..85 -> Good (-22.0 to -24.5)
  // 86..95 -> Warning (-24.6 to -27.0)
  // 96..99 -> Critical (-27.1 to -30.0)
  let rxPower: number;
  let quality: OpticalSignalQuality;

  if (hash <= 60) {
    rxPower = -18.0 - (hash / 60) * 3.9;
    quality = 'EXCELLENT';
  } else if (hash <= 85) {
    rxPower = -22.0 - ((hash - 61) / 24) * 2.5;
    quality = 'GOOD';
  } else if (hash <= 95) {
    rxPower = -24.6 - ((hash - 86) / 9) * 2.4;
    quality = 'WARNING';
  } else {
    rxPower = -27.1 - ((hash - 96) / 3) * 2.9;
    quality = 'CRITICAL';
  }

  // TX power typical PON ONU: 1.5 to 3.0 dBm
  const txPower = 1.8 + ((hash % 10) / 10) * 1.2;

  return {
    rxPowerDbm: Math.round(rxPower * 100) / 100,
    txPowerDbm: Math.round(txPower * 100) / 100,
    quality,
    isMock: true,
  };
}

export class CtoCustomer {
  private constructor(private readonly props: CtoCustomerSnapshot) {}

  static create(input: CreateCtoCustomerInput): CtoCustomer {
    const radUsuarioId = assertNonEmpty(input.radUsuarioId, 'radUsuarioId');
    const clienteId = assertNonEmpty(input.clienteId, 'clienteId');
    const login = assertNonEmpty(input.login, 'login');
    const razaoSocial = assertNonEmpty(input.razaoSocial, 'razaoSocial');

    if (
      !Number.isInteger(input.portaFtth) ||
      input.portaFtth < 1 ||
      input.portaFtth > 128
    ) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        `Invalid FTTH port: ${input.portaFtth}. Must be between 1 and 128.`,
        { portaFtth: input.portaFtth },
      );
    }

    const signal =
      input.signal ??
      generateMockOpticalSignal(radUsuarioId, input.portaFtth, input.online);

    return new CtoCustomer({
      radUsuarioId,
      clienteId,
      contratoId: input.contratoId?.trim() || undefined,
      login,
      mac: input.mac?.trim() || undefined,
      portaFtth: input.portaFtth,
      razaoSocial,
      nomeFantasia: input.nomeFantasia?.trim() || undefined,
      cpfCnpj: input.cpfCnpj?.trim() || undefined,
      telefone: input.telefone?.trim() || undefined,
      endereco: input.endereco?.trim() || undefined,
      online: Boolean(input.online),
      signal,
    });
  }

  static fromSnapshot(snapshot: CtoCustomerSnapshot): CtoCustomer {
    return new CtoCustomer({ ...snapshot });
  }

  toSnapshot(): CtoCustomerSnapshot {
    return { ...this.props };
  }

  get radUsuarioId(): string {
    return this.props.radUsuarioId;
  }

  get clienteId(): string {
    return this.props.clienteId;
  }

  get contratoId(): string | undefined {
    return this.props.contratoId;
  }

  get login(): string {
    return this.props.login;
  }

  get mac(): string | undefined {
    return this.props.mac;
  }

  get portaFtth(): number {
    return this.props.portaFtth;
  }

  get razaoSocial(): string {
    return this.props.razaoSocial;
  }

  get nomeFantasia(): string | undefined {
    return this.props.nomeFantasia;
  }

  get cpfCnpj(): string | undefined {
    return this.props.cpfCnpj;
  }

  get telefone(): string | undefined {
    return this.props.telefone;
  }

  get endereco(): string | undefined {
    return this.props.endereco;
  }

  get online(): boolean {
    return this.props.online;
  }

  get signal(): OpticalSignalInfo {
    return this.props.signal;
  }
}

export interface CtoCustomerListSnapshot {
  fatId: string;
  fatName: string;
  totalPorts: number;
  occupiedPorts: number;
  availablePorts: number;
  customers: ReadonlyArray<CtoCustomerSnapshot>;
}

export interface CreateCtoCustomerListInput {
  fatId: string;
  fatName: string;
  totalPorts?: number;
  customers: ReadonlyArray<CreateCtoCustomerInput | CtoCustomer>;
}

export class CtoCustomerList {
  private constructor(
    private readonly props: {
      fatId: string;
      fatName: string;
      totalPorts: number;
      customers: CtoCustomerSnapshot[];
    },
  ) {}

  static create(input: CreateCtoCustomerListInput): CtoCustomerList {
    const fatId = assertNonEmpty(input.fatId, 'fatId');
    const fatName = assertNonEmpty(input.fatName, 'fatName');
    const totalPorts = input.totalPorts ?? 16;

    if (!Number.isInteger(totalPorts) || totalPorts < 1) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        `Total ports must be an integer >= 1, received: ${totalPorts}`,
        { totalPorts },
      );
    }

    const customerSnapshots: CtoCustomerSnapshot[] = [];
    const seenPorts = new Set<number>();

    for (const raw of input.customers) {
      const customer =
        raw instanceof CtoCustomer ? raw : CtoCustomer.create(raw);
      const snapshot = customer.toSnapshot();

      if (seenPorts.has(snapshot.portaFtth)) {
        throw new DomainError(
          DomainErrorCodes.InvariantViolation,
          `Duplicate port assignment in CTO ${fatId}: port ${snapshot.portaFtth}`,
          { fatId, portaFtth: snapshot.portaFtth },
        );
      }

      seenPorts.add(snapshot.portaFtth);
      customerSnapshots.push(snapshot);
    }

    // Sort by port number ascending
    customerSnapshots.sort((a, b) => a.portaFtth - b.portaFtth);

    return new CtoCustomerList({
      fatId,
      fatName,
      totalPorts,
      customers: customerSnapshots,
    });
  }

  static fromSnapshot(snapshot: CtoCustomerListSnapshot): CtoCustomerList {
    return new CtoCustomerList({
      fatId: snapshot.fatId,
      fatName: snapshot.fatName,
      totalPorts: snapshot.totalPorts,
      customers: snapshot.customers.map((c) => ({ ...c })),
    });
  }

  toSnapshot(): CtoCustomerListSnapshot {
    return {
      fatId: this.props.fatId,
      fatName: this.props.fatName,
      totalPorts: this.props.totalPorts,
      occupiedPorts: this.occupiedPorts,
      availablePorts: this.availablePorts,
      customers: this.props.customers.map((c) => ({ ...c })),
    };
  }

  get fatId(): string {
    return this.props.fatId;
  }

  get fatName(): string {
    return this.props.fatName;
  }

  get totalPorts(): number {
    return this.props.totalPorts;
  }

  get customers(): ReadonlyArray<CtoCustomerSnapshot> {
    return this.props.customers;
  }

  get occupiedPorts(): number {
    return this.props.customers.length;
  }

  get availablePorts(): number {
    return Math.max(0, this.props.totalPorts - this.props.customers.length);
  }

  getCustomerByPort(port: number): CtoCustomerSnapshot | undefined {
    return this.props.customers.find((c) => c.portaFtth === port);
  }
}
