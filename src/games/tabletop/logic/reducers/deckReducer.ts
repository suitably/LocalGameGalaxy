/**
 * Deck actions: shuffle, draw, return to deck [ID: LOGIC-TABLETOP-DECK-REDUCER]
 */
import type { TabletopWidget, CardWidget, DeckWidget, HolderWidget } from '../types';
import { applyLayout, layoutHand } from '../holderLayout';
import { isHandHolderWidget } from '../handHolder';
import { removeFromHolderAndUpdateHand } from './holderMembership';
import type { TabletopAction, TabletopGameState } from '../tabletopReducer';

export type DeckAction = Extract<
  TabletopAction,
  { type: 'SHUFFLE_DECK' | 'DRAW_CARD' | 'RETURN_CARD_TO_DECK' }
>;

/** Adds `card` to `deck` and marks it as a pile member (mutates the widget map). */
export function placeCardInDeck(
  widgets: Record<string, TabletopWidget>,
  deck: DeckWidget,
  card: CardWidget,
  cardId: string,
) {
  const newCardIds = deck.cardIds.includes(cardId) ? deck.cardIds : [...deck.cardIds, cardId];

  widgets[deck.id] = {
    ...deck,
    cardIds: newCardIds,
    cardCount: newCardIds.length,
    ...(deck.isPile
      ? {
          frontContent: card.frontContent,
          backContent: card.backContent,
          faceObjects: card.faceObjects,
          backFaceObjects: card.backFaceObjects,
        }
      : {}),
  };

  widgets[cardId] = {
    ...card,
    inPile: true,
    pileId: deck.id,
    faceUp: deck.faceUp ?? false,
    activeFace: deck.activeFace ?? 0,
    x: deck.x,
    y: deck.y,
    zIndex: deck.zIndex,
  };
}

export function deckReducer(state: TabletopGameState, action: DeckAction): TabletopGameState {
  switch (action.type) {
    case 'SHUFFLE_DECK': {
      const widget = state.game.widgets[action.payload.deckId];
      if (!widget || widget.type !== 'deck') return state;
      const deck = widget as DeckWidget;

      const newIds = action.payload.newCardIds ? [...action.payload.newCardIds] : [...deck.cardIds];

      for (let i = newIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newIds[i], newIds[j]] = [newIds[j], newIds[i]];
      }

      return {
        ...state,
        game: {
          ...state.game,
          widgets: {
            ...state.game.widgets,
            [deck.id]: {
              ...deck,
              cardIds: newIds,
            },
          },
        },
      };
    }

    case 'DRAW_CARD': {
      const deckWidget = state.game.widgets[action.payload.deckId];
      if (!deckWidget || deckWidget.type !== 'deck') return state;
      const deck = deckWidget as DeckWidget;
      if (deck.cardIds.length === 0) return state;

      const drawnCardId = action.payload.cardId || deck.cardIds[deck.cardIds.length - 1];
      const remainingDeckIds = deck.cardIds.filter((id) => id !== drawnCardId);

      const widgets: Record<string, TabletopWidget> = { ...state.game.widgets };

      // Update remaining deck / pile state
      let updatedTopFront = deck.frontContent;
      let updatedTopBack = deck.backContent;
      let updatedFaceObjects = deck.faceObjects;
      let updatedBackFaceObjects = deck.backFaceObjects;

      if (deck.isPile) {
        if (remainingDeckIds.length > 0) {
          const nextTopId = remainingDeckIds[remainingDeckIds.length - 1];
          const nextTopCard = widgets[nextTopId] as CardWidget | undefined;
          if (nextTopCard) {
            updatedTopFront = nextTopCard.frontContent;
            updatedTopBack = nextTopCard.backContent;
            updatedFaceObjects = nextTopCard.faceObjects;
            updatedBackFaceObjects = nextTopCard.backFaceObjects;
          }
        } else {
          updatedTopFront = undefined;
          updatedFaceObjects = undefined;
        }
      }

      widgets[deck.id] = {
        ...deck,
        cardIds: remainingDeckIds,
        cardCount: remainingDeckIds.length,
        frontContent: updatedTopFront,
        backContent: updatedTopBack,
        faceObjects: updatedFaceObjects,
        backFaceObjects: updatedBackFaceObjects,
      };

      const card = widgets[drawnCardId] as CardWidget | undefined;
      const cardWidth = card?.width || 80;
      const cardHeight = card?.height || 120;

      let nextX = deck.x + deck.width + 16;
      let nextY = deck.y;

      if (action.payload.position) {
        nextX = action.payload.position.x;
        nextY = action.payload.position.y;
      } else if (action.payload.targetHolderId && widgets[action.payload.targetHolderId]) {
        const holder = widgets[action.payload.targetHolderId] as HolderWidget;
        const childIndex = holder.childIds.length;
        widgets[holder.id] = {
          ...holder,
          childIds: [...holder.childIds, drawnCardId],
        };
        const spread = Math.min(30, (holder.width - 40) / Math.max(1, childIndex + 1));
        nextX = holder.x + 10 + childIndex * spread;
        nextY = holder.y + 10;
      } else {
        const handHolder = Object.values(widgets).find((w) =>
          isHandHolderWidget(w as HolderWidget),
        ) as HolderWidget | undefined;
        if (handHolder) {
          const updatedChildIds = [...handHolder.childIds, drawnCardId];
          widgets[handHolder.id] = {
            ...handHolder,
            childIds: updatedChildIds,
          };

          if (card) {
            widgets[drawnCardId] = {
              ...card,
              inPile: false,
              pileId: undefined,
              faceUp: true,
              activeFace: 1,
              zIndex: 2000000,
            };
          }

          applyLayout(widgets, layoutHand(handHolder, updatedChildIds, widgets));
        } else {
          nextX = Math.round(state.game.table.width / 2 - cardWidth / 2);
          nextY = Math.round(state.game.table.height - cardHeight - 30);
          if (card) {
            widgets[drawnCardId] = {
              ...card,
              x: nextX,
              y: nextY,
              inPile: false,
              pileId: undefined,
              faceUp: true,
              activeFace: 1,
              zIndex: 2000000,
            };
          }
        }
      }

      if (card && (action.payload.position || action.payload.targetHolderId)) {
        const faceUp = action.payload.position ? (action.payload.faceUp ?? true) : true;
        widgets[drawnCardId] = {
          ...card,
          x: nextX,
          y: nextY,
          inPile: false,
          pileId: undefined,
          faceUp,
          activeFace: faceUp ? 1 : 0,
          zIndex: 2000000,
        };
      }

      return {
        ...state,
        game: {
          ...state.game,
          widgets,
        },
      };
    }

    case 'RETURN_CARD_TO_DECK': {
      const { cardId, deckId } = action.payload;
      const deckWidget = state.game.widgets[deckId];
      if (!deckWidget || deckWidget.type !== 'deck') return state;
      const deck = deckWidget as DeckWidget;
      const card = state.game.widgets[cardId] as CardWidget | undefined;
      if (!card || card.type !== 'card') return state;

      const widgets = { ...state.game.widgets };
      removeFromHolderAndUpdateHand(widgets, cardId);

      placeCardInDeck(widgets, deck, card, cardId);

      return {
        ...state,
        game: {
          ...state.game,
          widgets,
        },
      };
    }
  }
}
