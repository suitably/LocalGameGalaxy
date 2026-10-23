import { describe, expect, it } from 'vitest';
import { AREAS, areaOfCategory, areasFor } from './areas';

describe('areas', () => {
  it('maps drawing and social deduction into the party area', () => {
    expect(areaOfCategory('drawing').id).toBe('party');
    expect(areaOfCategory('social_deduction').id).toBe('party');
    expect(areaOfCategory('puzzle').color).toBe('purple');
  });

  it('lists only areas that have games, in a stable order', () => {
    expect(areasFor(['puzzle', 'music', 'drawing', 'party']).map((a) => a.id)).toEqual([
      'party',
      'music',
      'puzzle',
    ]);
    expect(areasFor([])).toEqual([]);
  });

  it('gives every area its own piece colour', () => {
    expect(new Set(AREAS.map((a) => a.color)).size).toBe(AREAS.length);
  });
});
