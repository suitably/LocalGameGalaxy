/**
 * Tabletop State Reducer [ID: GAME-TABLETOP-REDUCER]
 */
import type { TabletopGameDefinition, CardWidget, DeckWidget, HolderWidget, CounterWidget, DieWidget } from './types';

export interface FlyingCardAnimation {
  id: string;
  cardId: string;
  targetHolderId: string;
  startTime: number;
}

export interface TabletopGameState {
  game: TabletopGameDefinition;
  flyingCards: FlyingCardAnimation[];
}

export type TabletopAction =
  | { type: 'LOAD_GAME'; payload: TabletopGameDefinition }
  | { type: 'MOVE_WIDGET'; payload: { id: string; x: number; y: number; zIndex?: number } }
  | { type: 'FLIP_CARD'; payload: { cardId: string } }
  | { type: 'SHUFFLE_DECK'; payload: { deckId: string; newCardIds?: string[] } }
  | { type: 'DRAW_CARD'; payload: { deckId: string; targetHolderId?: string } }
  | { type: 'SNAP_TO_HOLDER'; payload: { widgetId: string; holderId: string } }
  | { type: 'UPDATE_COUNTER'; payload: { counterId: string; delta: number } }
  | { type: 'ROLL_DIE'; payload: { dieId: string; value?: number } }
  | { type: 'ANIMATE_CARD_TO_TABLE'; payload: { cardId: string; targetHolderId: string } }
  | { type: 'FINISH_ANIMATION'; payload: { animationId: string } };

export function tabletopReducer(state: TabletopGameState, action: TabletopAction): TabletopGameState {
  switch (action.type) {
    case 'LOAD_GAME':
      return {
        game: action.payload,
        flyingCards: [],
      };

    case 'MOVE_WIDGET': {
      const widget = state.game.widgets[action.payload.id];
      if (!widget) return state;

      return {
        ...state,
        game: {
          ...state.game,
          widgets: {
            ...state.game.widgets,
            [action.payload.id]: {
              ...widget,
              x: action.payload.x,
              y: action.payload.y,
              zIndex: action.payload.zIndex ?? widget.zIndex,
            },
          },
        },
      };
    }

    case 'FLIP_CARD': {
      const widget = state.game.widgets[action.payload.cardId];
      if (!widget || widget.type !== 'card') return state;
      const card = widget as CardWidget;

      return {
        ...state,
        game: {
          ...state.game,
          widgets: {
            ...state.game.widgets,
            [card.id]: {
              ...card,
              faceUp: !card.faceUp,
            },
          },
        },
      };
    }

    case 'SHUFFLE_DECK': {
      const widget = state.game.widgets[action.payload.deckId];
      if (!widget || widget.type !== 'deck') return state;
      const deck = widget as DeckWidget;

      const newIds = action.payload.newCardIds
        ? [...action.payload.newCardIds]
        : [...deck.cardIds].sort(() => Math.random() - 0.5);

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

      const drawnCardId = deck.cardIds[0];
      const remainingDeckIds = deck.cardIds.slice(1);

      const widgets = { ...state.game.widgets };
      widgets[deck.id] = { ...deck, cardIds: remainingDeckIds };

      if (action.payload.targetHolderId && widgets[action.payload.targetHolderId]) {
        const holder = widgets[action.payload.targetHolderId] as HolderWidget;
        widgets[holder.id] = {
          ...holder,
          childIds: [...holder.childIds, drawnCardId],
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

    case 'SNAP_TO_HOLDER': {
      const { widgetId, holderId } = action.payload;
      const holderWidget = state.game.widgets[holderId];
      if (!holderWidget || holderWidget.type !== 'holder') return state;
      const holder = holderWidget as HolderWidget;

      const widgets = { ...state.game.widgets };

      // Remove from any prior holder
      for (const [wId, w] of Object.entries(widgets)) {
        if (w.type === 'holder') {
          const h = w as HolderWidget;
          if (h.childIds.includes(widgetId)) {
            widgets[wId] = {
              ...h,
              childIds: h.childIds.filter((id) => id !== widgetId),
            };
          }
        }
      }

      // Add to new holder if not already present
      if (!holder.childIds.includes(widgetId)) {
        widgets[holderId] = {
          ...holder,
          childIds: [...holder.childIds, widgetId],
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

    case 'UPDATE_COUNTER': {
      const counterWidget = state.game.widgets[action.payload.counterId];
      if (!counterWidget || counterWidget.type !== 'counter') return state;
      const counter = counterWidget as CounterWidget;

      const newVal = counter.value + action.payload.delta;
      const clamped = Math.min(
        counter.max ?? Infinity,
        Math.max(counter.min ?? -Infinity, newVal)
      );

      return {
        ...state,
        game: {
          ...state.game,
          widgets: {
            ...state.game.widgets,
            [counter.id]: {
              ...counter,
              value: clamped,
            },
          },
        },
      };
    }

    case 'ROLL_DIE': {
      const dieWidget = state.game.widgets[action.payload.dieId];
      if (!dieWidget || dieWidget.type !== 'die') return state;
      const die = dieWidget as DieWidget;

      const value = action.payload.value ?? (Math.floor(Math.random() * die.sides) + 1);

      return {
        ...state,
        game: {
          ...state.game,
          widgets: {
            ...state.game.widgets,
            [die.id]: {
              ...die,
              currentValue: value,
              rolling: false,
            },
          },
        },
      };
    }

    case 'ANIMATE_CARD_TO_TABLE': {
      const animId = `anim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const flying: FlyingCardAnimation = {
        id: animId,
        cardId: action.payload.cardId,
        targetHolderId: action.payload.targetHolderId,
        startTime: Date.now(),
      };

      // Also snap to holder immediately in state
      return tabletopReducer(
        { ...state, flyingCards: [...state.flyingCards, flying] },
        { type: 'SNAP_TO_HOLDER', payload: { widgetId: action.payload.cardId, holderId: action.payload.targetHolderId } }
      );
    }

    case 'FINISH_ANIMATION': {
      return {
        ...state,
        flyingCards: state.flyingCards.filter((f) => f.id !== action.payload.animationId),
      };
    }

    default:
      return state;
  }
}
