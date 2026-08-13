import {
  type GeoPoint,
  distanceMeters,
  isWithinRadius,
} from '@gigahub/shared/kernel';

export function parseIxcCoordinate(
  latitude: string | null | undefined,
  longitude: string | null | undefined,
): GeoPoint | null {
  if (latitude == null || longitude == null) {
    return null;
  }
  const lat = Number.parseFloat(String(latitude).replace(',', '.'));
  const lng = Number.parseFloat(String(longitude).replace(',', '.'));
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }
  return { latitude: lat, longitude: lng };
}

/** Rough degree delta for a bounding-box prefilter (~111 km per degree). */
export function boundingBoxDegrees(radiusMeters: number): number {
  return Math.max(radiusMeters / 111_000, 0.0001) * 1.2;
}

export function minDistanceToPath(
  center: GeoPoint,
  path: ReadonlyArray<GeoPoint>,
): number {
  let min = Number.POSITIVE_INFINITY;
  for (const point of path) {
    const distance = distanceMeters(center, point);
    if (distance < min) {
      min = distance;
    }
  }
  return min;
}

export function isPointWithinRadiusOrNull(
  center: GeoPoint,
  point: GeoPoint | null,
  radiusMeters: number,
): point is GeoPoint {
  return point !== null && isWithinRadius(center, point, radiusMeters);
}
