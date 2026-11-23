import { describe, expect, it } from 'vitest';
import { AREAS, areaById, areasFor } from './areas';

describe('areas', () => {
  it('finds an area by id', () => {
    expect(areaById('puzzle').color).toBe('purple');
    expect(areaById('party').id).toBe('party');
  });

  it('lists only areas that have entries, in a stable order', () => {
    const entries = (['puzzle', 'music', 'party', 'party'] as const).map((area) => ({ area }));
    expect(areasFor(entries).map((a) => a.id)).toEqual(['party', 'music', 'puzzle']);
    expect(areasFor([])).toEqual([]);
  });

  it('gives every area its own piece colour', () => {
    expect(new Set(AREAS.map((a) => a.color)).size).toBe(AREAS.length);
  });
});
