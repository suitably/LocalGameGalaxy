import { describe, expect, it } from 'vitest';
import {
  buildPublishPrPayload,
  isThirdPartyImport,
  validateGameForPublishing,
} from '../publishValidator';
import type { ImportReport } from '../importTypes';
import type { TabletopGameDefinition } from '../types';

const game = (extra: Partial<TabletopGameDefinition> = {}): TabletopGameDefinition =>
  ({
    id: 'own-game',
    name: 'Own Game',
    description: 'A game made in the editor.',
    version: '1.0.0',
    minPlayers: 1,
    maxPlayers: 4,
    supportedModes: ['party'],
    table: { width: 1600, height: 1000 },
    widgets: { c1: { id: 'c1', type: 'card', x: 0, y: 0, width: 50, height: 70 } },
    ...extra,
  }) as TabletopGameDefinition;

const ttsReport = { source: 'tts' } as ImportReport;

describe('validateGameForPublishing', () => {
  it('accepts an own game', () => {
    expect(validateGameForPublishing(game())).toEqual({ valid: true, errors: [] });
  });

  it.each([
    ['format tts-workshop', { format: 'tts-workshop' as const }],
    ['a TTS import report (imports before format existed)', { importReport: ttsReport }],
    ['a private companion copy', { companionPrivate: true }],
  ])('rejects a game with %s (D4)', (_, extra) => {
    const imported = game(extra);
    expect(isThirdPartyImport(imported)).toBe(true);
    expect(validateGameForPublishing(imported)).toEqual({
      valid: false,
      errors: [],
      blocked: 'third_party_import',
    });
    expect(() => buildPublishPrPayload(imported, 'me')).toThrow();
  });

  it('builds a PR payload for an own game', () => {
    expect(buildPublishPrPayload(game(), 'me').filePath).toBe(
      'public/games/tabletop/own-game.json',
    );
  });
});
