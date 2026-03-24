import { isEmoji } from './icon';

describe('isEmoji', () => {
  it('returns false for Material icon names', () => {
    expect(isEmoji('coffee')).toBe(false);
    expect(isEmoji('silverware-fork-knife')).toBe(false);
    expect(isEmoji('map-marker')).toBe(false);
  });

  it('returns true for single emoji', () => {
    expect(isEmoji('🍕')).toBe(true);
    expect(isEmoji('☕')).toBe(true);
  });

  it('returns true for compound emoji', () => {
    expect(isEmoji('🏳️‍🌈')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(isEmoji('')).toBe(false);
  });
});
