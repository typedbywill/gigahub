import {
  type FiberSpliceEnclosureId,
  type GeoPoint,
  DomainError,
  DomainErrorCodes,
  assertNonEmpty,
  fiberSpliceEnclosureId,
} from '@gigahub/shared/kernel';

export const MIN_TRAY_COUNT = 0;

export interface FiberSpliceEnclosureSnapshot {
  id: FiberSpliceEnclosureId;
  idErp: string;
  name: string;
  projectIdErp?: string;
  traysCount: number;
  location?: GeoPoint;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateFiberSpliceEnclosureInput = Omit<
  FiberSpliceEnclosureSnapshot,
  'id' | 'createdAt' | 'updatedAt'
> & {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export class FiberSpliceEnclosure {
  private constructor(private props: FiberSpliceEnclosureSnapshot) {}

  static create(input: CreateFiberSpliceEnclosureInput): FiberSpliceEnclosure {
    const now = input.createdAt ?? new Date();
    return FiberSpliceEnclosure.fromSnapshot({
      id: fiberSpliceEnclosureId(input.id),
      idErp: assertNonEmpty(input.idErp, 'idErp'),
      name: assertNonEmpty(input.name, 'name'),
      projectIdErp: input.projectIdErp?.trim() || undefined,
      traysCount: input.traysCount ?? 1,
      location: input.location,
      createdAt: now,
      updatedAt: input.updatedAt ?? now,
    });
  }

  static fromSnapshot(
    snapshot: FiberSpliceEnclosureSnapshot,
  ): FiberSpliceEnclosure {
    FiberSpliceEnclosure.assertValidTraysCount(snapshot.traysCount);
    return new FiberSpliceEnclosure({
      ...snapshot,
    });
  }

  get id(): FiberSpliceEnclosureId {
    return this.props.id;
  }

  get idErp(): string {
    return this.props.idErp;
  }

  get name(): string {
    return this.props.name;
  }

  get projectIdErp(): string | undefined {
    return this.props.projectIdErp;
  }

  get traysCount(): number {
    return this.props.traysCount;
  }

  get location(): GeoPoint | undefined {
    return this.props.location;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toSnapshot(): FiberSpliceEnclosureSnapshot {
    return {
      ...this.props,
    };
  }

  private static assertValidTraysCount(traysCount: number): void {
    if (!Number.isInteger(traysCount) || traysCount < MIN_TRAY_COUNT) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        `Trays count must be an integer greater than or equal to ${MIN_TRAY_COUNT}`,
        { traysCount },
      );
    }
  }
}
