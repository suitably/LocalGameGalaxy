/**
 * Card stacks: a card dropped on a card builds a pile deck, and a stack's display [ID: LOGIC-TABLETOP-STACK-REDUCER]
 */
import type { DeckWidget, TabletopWidget } from '../types';
import { isLooseCard } from '../boardFilter';
import { removeFromHolderAndUpdateHand } from './holderMembership';
import { placeCardInDeck } from './deckReducer';
import type { TabletopAction, TabletopGameState } from '../tabletopReducer';

/** How a stack is shown: a neat pile with a count, or fanned out. */
export type StackDisplay = 'pile' | 'fan';

/** A pile deck that records how it is shown (`types.ts` is at its line limit). */
export interface StackDeck extends DeckWidget {
  stackDisplay?: StackDisplay;
}

export type StackAction = Extract<TabletopAction, { type: 'STACK_CARDS' | 'SET_STACK_DISPLAY' }>;

/** Free id for the stack that `targetId` starts (the same on every device). */
function stackId(widgets: Record<string, TabletopWidget>, targetId: string): string {
  let id = `stack_${targetId}`;
  for (let n = 2; widgets[id]; n++) id = `stack_${targetId}_${n}`;
  return id;
}

export function stackReducer(state: TabletopGameState, action: StackAction): TabletopGameState {
  const { widgets: current } = state.game;
  switch (action.type) {
    case 'STACK_CARDS': {
      const { cardId, targetId } = action.payload;
      const card = current[cardId];
      const target = current[targetId];
      if (cardId === targetId || !isLooseCard(card) || !isLooseCard(target)) return state;

      const widgets = { ...current };
      removeFromHolderAndUpdateHand(widgets, cardId);
      removeFromHolderAndUpdateHand(widgets, targetId);

      const id = stackId(widgets, targetId);
      const top = Math.max(card.zIndex, target.zIndex);
      const deck: StackDeck = {
        id,
        type: 'deck',
        x: target.x,
        y: target.y,
        width: target.width,
        height: target.height,
        zIndex: top,
        rotation: target.rotation,
        cardIds: [],
        cardCount: 0,
        isPile: true,
        faceUp: target.faceUp,
        activeFace: target.activeFace,
        frontContent: target.frontContent,
        backContent: target.backContent,
        stackDisplay: 'pile',
      };
      widgets[id] = deck;
      placeCardInDeck(widgets, deck, target, targetId);
      // The dropped card ends on top; its face becomes the pile's face.
      placeCardInDeck(widgets, widgets[id] as DeckWidget, card, cardId);
      return { ...state, game: { ...state.game, widgets } };
    }

    case 'SET_STACK_DISPLAY': {
      const deck = current[action.payload.deckId];
      if (deck?.type !== 'deck' || !(deck as DeckWidget).isPile) return state;
      const next: StackDeck = { ...(deck as DeckWidget), stackDisplay: action.payload.display };
      return {
        ...state,
        game: { ...state.game, widgets: { ...current, [deck.id]: next } },
      };
    }
  }
}
