import { distanceMeters, geoPoint, isWithinRadius } from './geo-point';
import { DomainError, DomainErrorCodes } from './domain-error';

describe('geoPoint', () => {
  it('rejects invalid coordinates', () => {
    expect(() => geoPoint(91, 0)).toThrow(DomainError);
    expect(() => geoPoint(0, 181)).toThrow(DomainError);
    try {
      geoPoint(100, 0);
    } catch (error) {
      expect(error).toMatchObject({ code: DomainErrorCodes.InvalidGeoPoint });
    }
  });

  it('computes distance within the 300 m geofence', () => {
    const os = geoPoint(-23.55052, -46.633308);
    const nearby = geoPoint(-23.5512, -46.633308);
    expect(distanceMeters(os, nearby)).toBeLessThan(300);
    expect(isWithinRadius(os, nearby, 300)).toBe(true);
  });

  it('detects points outside the geofence', () => {
    const os = geoPoint(-23.55052, -46.633308);
    const far = geoPoint(-23.56, -46.633308);
    expect(distanceMeters(os, far)).toBeGreaterThan(300);
    expect(isWithinRadius(os, far, 300)).toBe(false);
  });
});
