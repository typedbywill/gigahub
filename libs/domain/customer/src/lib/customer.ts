import {
  type ContractId,
  type CustomerId,
  type GeoPoint,
  DomainError,
  DomainErrorCodes,
  assertNonEmpty,
  contractId,
  customerId,
} from '@gigahub/shared/kernel';

export const CUSTOMER_STATUSES = [
  'active',
  'inactive',
  'cancelled',
  'blocked',
] as const;

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export interface CustomerAddress {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  location?: GeoPoint;
}

export interface CustomerSnapshot {
  id: CustomerId;
  idErp: string;
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  status: CustomerStatus;
  address?: CustomerAddress;
  contractIds: ContractId[];
  createdAt: Date;
  updatedAt: Date;
}

export type CreateCustomerInput = Omit<
  CustomerSnapshot,
  'id' | 'contractIds' | 'createdAt' | 'updatedAt'
> & {
  id: string;
  contractIds?: string[];
  createdAt?: Date;
  updatedAt?: Date;
};

const OPERABLE_STATUSES: ReadonlySet<CustomerStatus> = new Set(['active']);

export class Customer {
  private constructor(private props: CustomerSnapshot) {}

  static create(input: CreateCustomerInput): Customer {
    const now = input.createdAt ?? new Date();
    return Customer.fromSnapshot({
      id: customerId(input.id),
      idErp: assertNonEmpty(input.idErp, 'idErp'),
      name: assertNonEmpty(input.name, 'name'),
      document: input.document?.trim() || undefined,
      email: input.email?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      status: input.status,
      address: input.address,
      contractIds: (input.contractIds ?? []).map(contractId),
      createdAt: now,
      updatedAt: input.updatedAt ?? now,
    });
  }

  static fromSnapshot(snapshot: CustomerSnapshot): Customer {
    if (!CUSTOMER_STATUSES.includes(snapshot.status)) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        `Unknown customer status: ${String(snapshot.status)}`,
      );
    }
    return new Customer({
      ...snapshot,
      contractIds: [...snapshot.contractIds],
    });
  }

  get id(): CustomerId {
    return this.props.id;
  }

  get idErp(): string {
    return this.props.idErp;
  }

  get name(): string {
    return this.props.name;
  }

  get status(): CustomerStatus {
    return this.props.status;
  }

  get address(): CustomerAddress | undefined {
    return this.props.address;
  }

  get contractIds(): readonly ContractId[] {
    return this.props.contractIds;
  }

  isOperable(): boolean {
    return OPERABLE_STATUSES.has(this.props.status);
  }

  assertCanOpenSupport(): void {
    if (!this.isOperable()) {
      throw new DomainError(
        DomainErrorCodes.CustomerNotOperable,
        'Customer is not active for support or field work',
        { customerId: this.props.id, status: this.props.status },
      );
    }
  }

  rename(name: string): void {
    this.props.name = assertNonEmpty(name, 'name');
    this.touch();
  }

  changeStatus(status: CustomerStatus): void {
    this.props.status = status;
    this.touch();
  }

  toSnapshot(): CustomerSnapshot {
    return {
      ...this.props,
      contractIds: [...this.props.contractIds],
      address: this.props.address ? { ...this.props.address } : undefined,
    };
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}
