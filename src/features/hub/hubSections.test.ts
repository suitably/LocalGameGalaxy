import { describe, expect, it } from 'vitest';
import type { CatalogEntry } from '../../lib/catalog/types';
import { hubSections } from './hubSections';

const entry = (id: string, area: CatalogEntry['area'], modes: CatalogEntry['modes']) =>
  ({
    id,
    area,
    modes,
    kind: 'game',
    titleKey: id,
    title: id,
    descKey: id,
    listing: 'hub',
    launch: { type: 'route', route: `/${id}` },
  }) satisfies CatalogEntry;

const games = [
  entry('wordle', 'puzzle', ['solo']),
  entry('gartic', 'party', ['party_room']),
  entry('kniffel', 'dice', ['pass_and_play', 'party_room']),
];
const tools = [entry('darts', 'party', ['pass_and_play'])];
const ids = (s: ReturnType<typeof hubSections>) =>
  s.map((x) => [x.key, x.entries.map((e) => e.id)]);

describe('hubSections', () => {
  it('groups games by area in area order and puts tools last', () => {
    expect(ids(hubSections(games, tools, 'all', false))).toEqual([
      ['party', ['gartic']],
      ['dice', ['kniffel']],
      ['puzzle', ['wordle']],
      ['tools', ['darts']],
    ]);
  });

  it('filters by area, tools included', () => {
    expect(ids(hubSections(games, tools, 'party', false))).toEqual([
      ['party', ['gartic']],
      ['tools', ['darts']],
    ]);
  });

  it('keeps only party-room games when own devices is on', () => {
    expect(ids(hubSections(games, tools, 'all', true))).toEqual([
      ['party', ['gartic']],
      ['dice', ['kniffel']],
    ]);
    expect(hubSections(games, tools, 'puzzle', true)).toEqual([]);
  });
});
