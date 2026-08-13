import {
  type FiberCableId,
  type GeoPoint,
  DomainError,
  DomainErrorCodes,
  assertNonEmpty,
  fiberCableId,
  geoPoint,
} from '@gigahub/shared/kernel';

export const MIN_CABLE_PATH_POINTS = 2;

export interface FiberCableSnapshot {
  id: FiberCableId;
  idErp: string;
  name: string;
  projectIdErp: string;
  lengthMeters?: number;
  active: boolean;
  path: ReadonlyArray<GeoPoint>;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateFiberCableInput = Omit<
  FiberCableSnapshot,
  'id' | 'createdAt' | 'updatedAt' | 'path'
> & {
  id: string;
  path: ReadonlyArray<{ latitude: number; longitude: number }>;
  createdAt?: Date;
  updatedAt?: Date;
};

export class FiberCable {
  private constructor(private props: FiberCableSnapshot) {}

  static create(input: CreateFiberCableInput): FiberCable {
    const now = input.createdAt ?? new Date();
    return FiberCable.fromSnapshot({
      id: fiberCableId(input.id),
      idErp: assertNonEmpty(input.idErp, 'idErp'),
      name: assertNonEmpty(input.name, 'name'),
      projectIdErp: assertNonEmpty(input.projectIdErp, 'projectIdErp'),
      lengthMeters: input.lengthMeters,
      active: input.active,
      path: input.path.map((point) =>
        geoPoint(point.latitude, point.longitude),
      ),
      createdAt: now,
      updatedAt: input.updatedAt ?? now,
    });
  }

  static fromSnapshot(snapshot: FiberCableSnapshot): FiberCable {
    FiberCable.assertValidPath(snapshot.path);
    FiberCable.assertValidLength(snapshot.lengthMeters);
    return new FiberCable({
      ...snapshot,
      path: snapshot.path.map((point) => ({ ...point })),
    });
  }

  get id(): FiberCableId {
    return this.props.id;
  }

  get idErp(): string {
    return this.props.idErp;
  }

  get name(): string {
    return this.props.name;
  }

  get projectIdErp(): string {
    return this.props.projectIdErp;
  }

  get lengthMeters(): number | undefined {
    return this.props.lengthMeters;
  }

  get active(): boolean {
    return this.props.active;
  }

  get path(): ReadonlyArray<GeoPoint> {
    return this.props.path;
  }

  toSnapshot(): FiberCableSnapshot {
    return {
      ...this.props,
      path: this.props.path.map((point) => ({ ...point })),
    };
  }

  private static assertValidPath(path: ReadonlyArray<GeoPoint>): void {
    if (path.length < MIN_CABLE_PATH_POINTS) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        `Fiber cable path must have at least ${MIN_CABLE_PATH_POINTS} points`,
        { pathLength: path.length },
      );
    }
    for (const point of path) {
      geoPoint(point.latitude, point.longitude);
    }
  }

  private static assertValidLength(lengthMeters: number | undefined): void {
    if (lengthMeters === undefined) {
      return;
    }
    if (!Number.isFinite(lengthMeters) || lengthMeters < 0) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        'Fiber cable lengthMeters must be a finite number greater than or equal to 0',
        { lengthMeters },
      );
    }
  }
}
