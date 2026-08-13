import { DomainError, DomainErrorCodes } from './domain-error';

const EARTH_RADIUS_M = 6_371_000;

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export function geoPoint(latitude: number, longitude: number): GeoPoint {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new DomainError(
      DomainErrorCodes.InvalidGeoPoint,
      'Latitude must be between -90 and 90',
      { latitude },
    );
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new DomainError(
      DomainErrorCodes.InvalidGeoPoint,
      'Longitude must be between -180 and 180',
      { longitude },
    );
  }
  return { latitude, longitude };
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function distanceMeters(from: GeoPoint, to: GeoPoint): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

export function isWithinRadius(
  from: GeoPoint,
  to: GeoPoint,
  radiusMeters: number,
): boolean {
  return distanceMeters(from, to) <= radiusMeters;
}
