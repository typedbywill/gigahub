/** Brazil geographic center — fallback when geolocation is unavailable. */
export const FALLBACK_MAP_CENTER = {
  latitude: -14.235,
  longitude: -51.9253,
  zoom: 4,
} as const;

export const DEFAULT_NEARBY_RADIUS_METERS = 5_000;
export const MAX_NEARBY_RADIUS_METERS = 50_000;
export const MIN_NEARBY_RADIUS_METERS = 1_000;

const EARTH_RADIUS_M = 6_371_000;

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/** Estimate query radius from map bounds; clamp to API limits. */
export function radiusFromBoundsMeters(bounds: {
  getNorthEast: () => { lat: number; lng: number };
  getSouthWest: () => { lat: number; lng: number };
  getCenter: () => { lat: number; lng: number };
}): number {
  const center = bounds.getCenter();
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const corners = [
    { lat: ne.lat, lng: ne.lng },
    { lat: sw.lat, lng: sw.lng },
    { lat: ne.lat, lng: sw.lng },
    { lat: sw.lat, lng: ne.lng },
  ];
  const farthest = Math.max(
    ...corners.map((c) =>
      haversineMeters(center.lat, center.lng, c.lat, c.lng),
    ),
  );
  return Math.min(
    MAX_NEARBY_RADIUS_METERS,
    Math.max(farthest, DEFAULT_NEARBY_RADIUS_METERS, MIN_NEARBY_RADIUS_METERS),
  );
}
