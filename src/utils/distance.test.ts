import { haversineDistance, formatDistance } from './distance';

describe('haversineDistance', () => {
  it('returns 0 for the same point', () => {
    expect(haversineDistance(48.8566, 2.3522, 48.8566, 2.3522)).toBe(0);
  });

  it('calculates Paris to London (~343km)', () => {
    const distance = haversineDistance(48.8566, 2.3522, 51.5074, -0.1278);
    expect(distance).toBeGreaterThan(340_000);
    expect(distance).toBeLessThan(346_000);
  });

  it('calculates antipodal points (0,0) to (0,180)', () => {
    const distance = haversineDistance(0, 0, 0, 180);
    // Half the Earth's circumference ≈ 20,015km
    expect(distance).toBeGreaterThan(20_000_000);
    expect(distance).toBeLessThan(20_100_000);
  });

  it('calculates North Pole to South Pole', () => {
    const distance = haversineDistance(90, 0, -90, 0);
    // Also half the circumference
    expect(distance).toBeGreaterThan(20_000_000);
    expect(distance).toBeLessThan(20_100_000);
  });

  it('calculates a small distance (~100m)', () => {
    // Two points ~100m apart in Paris
    const distance = haversineDistance(48.8566, 2.3522, 48.8575, 2.3522);
    expect(distance).toBeGreaterThan(90);
    expect(distance).toBeLessThan(110);
  });

  it('works with negative coordinates (Sydney)', () => {
    // Sydney to Melbourne
    const distance = haversineDistance(-33.8688, 151.2093, -37.8136, 144.9631);
    expect(distance).toBeGreaterThan(710_000);
    expect(distance).toBeLessThan(720_000);
  });

  it('longitude distance varies with latitude', () => {
    // 1 degree longitude at equator vs at 60°N
    const atEquator = haversineDistance(0, 0, 0, 1);
    const at60N = haversineDistance(60, 0, 60, 1);
    // At 60°N, longitude distance should be about half
    expect(at60N).toBeLessThan(atEquator * 0.6);
    expect(at60N).toBeGreaterThan(atEquator * 0.4);
  });
});

describe('formatDistance', () => {
  it('formats 150m', () => {
    expect(formatDistance(150)).toBe('150m');
  });

  it('formats 999m', () => {
    expect(formatDistance(999)).toBe('999m');
  });

  it('formats 1000m as 1.0km', () => {
    expect(formatDistance(1000)).toBe('1.0km');
  });

  it('formats 2345m as 2.3km', () => {
    expect(formatDistance(2345)).toBe('2.3km');
  });

  it('formats 0m', () => {
    expect(formatDistance(0)).toBe('0m');
  });

  it('formats 10500m as 10.5km', () => {
    expect(formatDistance(10500)).toBe('10.5km');
  });
});
