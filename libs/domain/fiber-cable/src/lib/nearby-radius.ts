import { DomainError, DomainErrorCodes } from '@gigahub/shared/kernel';

/** Default search radius for project nearby queries (FAT, cables, …). */
export const DEFAULT_NEARBY_RADIUS_METERS = 5_000;

/** Hard ceiling for nearby radius to avoid unbounded scans. */
export const MAX_NEARBY_RADIUS_METERS = 50_000;

export function assertNearbyRadiusMeters(radiusMeters: number): number {
  if (
    !Number.isFinite(radiusMeters) ||
    radiusMeters <= 0 ||
    radiusMeters > MAX_NEARBY_RADIUS_METERS
  ) {
    throw new DomainError(
      DomainErrorCodes.InvariantViolation,
      `Nearby radius must be a finite number between 0 (exclusive) and ${MAX_NEARBY_RADIUS_METERS}`,
      { radiusMeters, maxMeters: MAX_NEARBY_RADIUS_METERS },
    );
  }
  return radiusMeters;
}
