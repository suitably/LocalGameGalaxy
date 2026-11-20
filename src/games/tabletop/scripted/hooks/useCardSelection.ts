/**
 * Selection state of the card table; cleared with every accepted move [ID: HOOK-TABLETOP-SCRIPT-SELECTION]
 */
import { useState } from 'react';
import type { CardId } from '../logic/cardDeck';
import type { ScriptMove, ScriptView } from '../logic/scriptTypes';
import { NO_SELECTION, moveOf, normalize, toggleCard, type Selection } from '../logic/selection';

export function useCardSelection(
  view: ScriptView,
  /** Changes with every move on the table. */
  step: number,
  allowed: (move: ScriptMove) => boolean,
  onMove: (move: ScriptMove) => void,
) {
  const [raw, setRaw] = useState<{ step: number; sel: Selection }>({ step, sel: NO_SELECTION });
  const sel = normalize(raw.step === step ? raw.sel : NO_SELECTION, view);
  const set = (next: Selection) => setRaw({ step, sel: next });
  const tryPlay = (next: Selection): boolean => {
    if (next.cards.length === 0 || !allowed(moveOf(next))) return false;
    onMove(moveOf(next));
    setRaw({ step, sel: NO_SELECTION });
    return true;
  };

  return {
    sel,
    canPlay: sel.cards.length > 0 && allowed(moveOf(sel)),
    play: () => void tryPlay(sel),
    /** A second tap on the picked card plays it. */
    tapCard: (card: CardId) => {
      if (view.select === 'one' && sel.cards[0] === card && tryPlay(sel)) return;
      set(toggleCard(sel, card, view));
    },
    /** A tap on a table card with a card in hand picked plays at once. */
    tapTarget: (card: CardId) => {
      const next = { ...sel, target: card };
      if (!tryPlay(next)) set(next);
    },
  };
}
