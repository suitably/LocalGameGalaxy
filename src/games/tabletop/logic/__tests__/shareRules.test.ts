import { describe, expect, it } from 'vitest';
import {
  assertShareable,
  isThirdPartyImport,
  isThirdPartySummary,
  ShareBlockedError,
} from '../shareRules';
import { buildPcioArchive, serializeGameJson } from '../tabletopExporter';
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

describe('share rules (TTS plan D4)', () => {
  it('lets an own game be shared', () => {
    expect(isThirdPartyImport(game())).toBe(false);
    expect(() => assertShareable(game())).not.toThrow();
    expect(isThirdPartySummary({ format: undefined })).toBe(false);
  });

  it.each([
    ['format tts-workshop', { format: 'tts-workshop' as const }],
    ['a TTS import report (imports before format existed)', { importReport: ttsReport }],
    ['a private companion copy', { companionPrivate: true }],
  ])('refuses a game with %s', (_, extra) => {
    const imported = game(extra);
    expect(isThirdPartyImport(imported)).toBe(true);
    expect(() => assertShareable(imported)).toThrow(ShareBlockedError);
    expect(() => serializeGameJson(imported)).toThrow(ShareBlockedError);
    expect(() => buildPcioArchive(imported)).toThrow(ShareBlockedError);
  });

  it('marks a listed tts-workshop game as not shareable', () => {
    expect(isThirdPartySummary({ format: 'tts-workshop' })).toBe(true);
  });
});
