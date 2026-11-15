import { beforeEach, describe, expect, it } from 'vitest';
import { balancedGroupLines, duplicateLabels, groupLines, parseEntries } from '../entries';
import {
  findHistory,
  loadHosted,
  mergeDraws,
  removeHosted,
  saveHistory,
  saveHosted,
} from '../localStore';
import {
  adminLink,
  backendFromServer,
  CLOUD_BACKEND,
  isPublicServerUrl,
  isWorkerHost,
  potPath,
} from '../api';
import { storage } from '../../../../lib/storage';
import type { DrawRecord } from '../api';

const rec = (at: number, entryId = '0', label = 'A'): DrawRecord => ({
  at,
  entryId,
  label,
  participantId: 'p',
});

describe('parseEntries', () => {
  it('splits lines, trims and expands counts', () => {
    expect(parseEntries(' Anna \n\nTeam Rot *3\nBen x2\n*2')).toEqual([
      'Anna',
      'Team Rot',
      'Team Rot',
      'Team Rot',
      'Ben',
      'Ben',
    ]);
  });

  it('caps the copies of one line', () => {
    expect(parseEntries('A *999')).toHaveLength(100);
  });
});

describe('group helpers', () => {
  it('builds fixed-size groups', () => {
    expect(groupLines('Gruppe', 2, 3)).toBe('Gruppe 1 *3\nGruppe 2 *3');
  });

  it('balances people over groups', () => {
    expect(parseEntries(balancedGroupLines('Team', 10, 4))).toHaveLength(10);
    expect(balancedGroupLines('Team', 10, 4)).toBe('Team 1 *4\nTeam 2 *3\nTeam 3 *3');
  });

  it('finds duplicates case-insensitively', () => {
    expect(duplicateLabels(['Anna', 'anna', 'Ben'])).toEqual(['anna']);
  });
});

describe('local store', () => {
  beforeEach(() => storage.clear());

  it('keeps hosted pots newest first without duplicates', () => {
    const pot = {
      id: 'a',
      adminKey: 'k',
      title: 'T',
      mode: 'pot' as const,
      createdAt: 1,
      expiresAt: 2,
    };
    saveHosted(pot);
    saveHosted({ ...pot, id: 'b' });
    saveHosted({ ...pot, title: 'T2' });
    expect(loadHosted().map((p) => [p.id, p.title])).toEqual([
      ['a', 'T2'],
      ['b', 'T'],
    ]);
    expect(removeHosted('a').map((p) => p.id)).toEqual(['b']);
  });

  it('merges draw history per pot', () => {
    saveHistory({ potId: 'x', title: 'T', mode: 'pot', draws: [rec(1)] });
    saveHistory({ potId: 'x', title: 'T', mode: 'pot', draws: [rec(1), rec(2, '1', 'B')] });
    expect(findHistory('x')?.draws.map((d) => d.label)).toEqual(['A', 'B']);
    expect(mergeDraws([rec(3)], [rec(1)]).map((d) => d.at)).toEqual([1, 3]);
  });
});

describe('links', () => {
  it('recognises worker hosts and keeps the admin key in the fragment', () => {
    expect(isWorkerHost('games.nexumia.de')).toBe(true);
    expect(isWorkerHost('localhost')).toBe(false);
    expect(adminLink('abc123', 'k/y', CLOUD_BACKEND)).toMatch(
      /\/games\/drawpot\/admin\/abc123#key=k%2Fy$/,
    );
  });

  it('carries a companion server in the link and accepts only http(s) servers', () => {
    const backend = backendFromServer('https://pots.example.org/');
    expect(backend).toEqual({ kind: 'companion', url: 'https://pots.example.org' });
    expect(adminLink('abc123', 'k', backend)).toMatch(
      /\/games\/drawpot\/admin\/abc123\?server=https%3A%2F%2Fpots\.example\.org#key=k$/,
    );
    expect(potPath('p', 'abc123')).toBe('/games/drawpot/p/abc123');
    expect(backendFromServer('javascript:alert(1)')).toEqual(CLOUD_BACKEND);
    expect(backendFromServer(null)).toEqual(CLOUD_BACKEND);
  });

  it('tells public https servers from local ones', () => {
    expect(isPublicServerUrl('https://abc.trycloudflare.com')).toBe(true);
    expect(isPublicServerUrl('http://example.org')).toBe(false);
    expect(isPublicServerUrl('https://192.168.1.5:3000')).toBe(false);
    expect(isPublicServerUrl('https://localhost:3000')).toBe(false);
  });
});
