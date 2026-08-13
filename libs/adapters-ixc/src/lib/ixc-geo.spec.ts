import {
  boundingBoxDegrees,
  minDistanceToPath,
  parseIxcCoordinate,
} from './ixc-geo';

describe('ixc-geo helpers', () => {
  it('parses valid coordinate strings', () => {
    expect(parseIxcCoordinate('-29,46', '-50.82')).toEqual({
      latitude: -29.46,
      longitude: -50.82,
    });
  });

  it('rejects invalid coordinates', () => {
    expect(parseIxcCoordinate(null, '-50')).toBeNull();
    expect(parseIxcCoordinate('abc', '-50')).toBeNull();
    expect(parseIxcCoordinate('91', '0')).toBeNull();
  });

  it('computes min distance to path vertices', () => {
    const center = { latitude: -29.46, longitude: -50.82 };
    const path = [
      { latitude: -29.47, longitude: -50.83 },
      { latitude: -29.4601, longitude: -50.8201 },
    ];
    const distance = minDistanceToPath(center, path);
    expect(distance).toBeLessThan(50);
  });

  it('returns a positive bounding box delta', () => {
    expect(boundingBoxDegrees(5_000)).toBeGreaterThan(0.04);
  });
});
