/**
 * Dynamic Controller State Extractor [ID: HOOK-TABLETOP-CONTROLLER-STATE]
 */
import { useMemo } from 'react';
import type {
  TabletopGameDefinition,
  CardWidget,
  DeckWidget,
  HolderWidget,
  DieWidget,
  CounterWidget,
} from '../logic/types';

export interface DynamicControllerState {
  myHandCards: CardWidget[];
  myHolders: HolderWidget[];
  publicDecks: DeckWidget[];
  dropTargets: HolderWidget[];
  publicDice: DieWidget[];
  myCounters: CounterWidget[];
  topDiscardCard: CardWidget | null;
}

export function useDynamicControllerState(
  game: TabletopGameDefinition,
  mySeat: number | null,
): DynamicControllerState {
  return useMemo(() => {
    const myHolders: HolderWidget[] = [];
    const publicDecks: DeckWidget[] = [];
    const dropTargets: HolderWidget[] = [];
    const publicDice: DieWidget[] = [];
    const myCounters: CounterWidget[] = [];

    const widgets = game.widgets || {};

    for (const w of Object.values(widgets)) {
      if (w.type === 'holder') {
        const h = w as HolderWidget;
        if (h.isHand && (h.ownerSeat === mySeat || mySeat === null)) {
          myHolders.push(h);
        } else if (h.dropTarget) {
          dropTargets.push(h);
        }
      } else if (w.type === 'deck') {
        publicDecks.push(w as DeckWidget);
      } else if (w.type === 'die') {
        publicDice.push(w as DieWidget);
      } else if (w.type === 'counter') {
        const c = w as CounterWidget;
        if (c.ownerSeat === undefined || c.ownerSeat === mySeat) {
          myCounters.push(c);
        }
      }
    }

    // Collect all cards in my holders
    const myCardIds = new Set<string>();
    for (const h of myHolders) {
      for (const cId of h.childIds || []) {
        myCardIds.add(cId);
      }
    }

    const myHandCards: CardWidget[] = [];
    for (const id of myCardIds) {
      const card = widgets[id];
      if (card && card.type === 'card') {
        myHandCards.push(card as CardWidget);
      }
    }

    // Find top card on main discard pile
    let topDiscardCard: CardWidget | null = null;
    const mainDropTarget = dropTargets[0];
    if (mainDropTarget && mainDropTarget.childIds?.length > 0) {
      const topId = mainDropTarget.childIds[mainDropTarget.childIds.length - 1];
      const card = widgets[topId];
      if (card && card.type === 'card') {
        topDiscardCard = card as CardWidget;
      }
    }

    return {
      myHandCards,
      myHolders,
      publicDecks,
      dropTargets,
      publicDice,
      myCounters,
      topDiscardCard,
    };
  }, [game, mySeat]);
}
