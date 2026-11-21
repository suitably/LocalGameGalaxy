import { describe, expect, it } from 'vitest';
import { isNativeGameFile, parseNativeGameFile } from '../../../logic/nativeGameFile';
import { validateAndSanitizeGame } from '../../../logic/gameValidator';
import type { CardWidget, DeckWidget } from '../../../logic/types';
import { getScript, SCRIPTED_GAME_IDS } from '../scriptRegistry';
import { RULE_SCRIPT_DECK_ID, ruleScriptOf, scriptedGameDefinition } from '../scriptExport';

const texts = { name: 'Mau-Mau', description: 'desc', ruleText: '<p>rules</p>' };

describe('scripted game export', () => {
  it('writes every scripted game as a native game file that imports with its rule script', () => {
    for (const id of SCRIPTED_GAME_IDS) {
      const script = getScript(id)!;
      const file: unknown = JSON.parse(JSON.stringify(scriptedGameDefinition(script, texts)));
      expect(isNativeGameFile(file)).toBe(true);
      const game = parseNativeGameFile(file);
      expect(ruleScriptOf(game)).toBe(id);
      expect(game).toMatchObject({
        minPlayers: script.minPlayers,
        maxPlayers: script.maxPlayers,
        ruleText: texts.ruleText,
      });
      const deck = game.widgets[RULE_SCRIPT_DECK_ID] as DeckWidget;
      expect(deck.cardIds).toHaveLength(script.ranks.length * 4);
      const hands = Object.values(game.widgets).filter((w) => w.type === 'holder' && w.isHand);
      expect(hands).toHaveLength(script.maxPlayers);
    }
  });

  it('labels the Mau-Mau deck with 32 distinct cards', () => {
    const game = scriptedGameDefinition(getScript('maumau')!, texts);
    const faces = Object.values(game.widgets)
      .filter((w): w is CardWidget => w.type === 'card')
      .map((c) => `${c.labelParams?.suit}:${c.labelParams?.rank}`);
    expect(new Set(faces).size).toBe(32);
  });

  it('ignores unknown or malformed rule scripts', () => {
    expect(ruleScriptOf({ ruleScript: 'poker' })).toBeNull();
    expect(ruleScriptOf({})).toBeNull();
    expect(
      validateAndSanitizeGame({ name: 'x', ruleScript: '../evil' }).ruleScript,
    ).toBeUndefined();
    expect(validateAndSanitizeGame({ name: 'x', ruleScript: 'skat' }).ruleScript).toBe('skat');
  });
});
