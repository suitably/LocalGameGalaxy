/**
 * Reducer for state transitions in Tabletop games [ID: GAME-TABLETOP-REDUCER]
 */
import type {
  TabletopGameDefinition,
  CardWidget,
  DeckWidget,
  HolderWidget,
  CounterWidget,
  DieWidget,
  SeatWidget,
  HiddenZone,
  TabletopTableConfig,
  TabletopWidget,
  ButtonWidget,
} from './types';
import { applyLayout, layoutHolderChildren } from './holderLayout';
import { applyGameDelta, type GameDelta } from './stateDelta';
import { normalizeHandHolders } from './handHolder';
import { removeFromHolderAndUpdateHand } from './reducers/holderMembership';
import { deckReducer, placeCardInDeck } from './reducers/deckReducer';
import { bagReducer } from './reducers/bagReducer';
import { pieceReducer } from './reducers/pieceReducer';
import { viewReducer } from './reducers/viewReducer';
import { editReducer } from './reducers/editReducer';
import { tableToolReducer } from './reducers/tableToolReducer';
import { routineToActions } from './routines';
import { raiseWidget, type ZOrderOp } from './zOrder';
import type { WidgetPatch } from './widgetEdits';

export interface FlyingCardAnimation {
  id: string;
  cardId: string;
  targetHolderId: string;
  startTime: number;
}

export interface TabletopGameState {
  game: TabletopGameDefinition;
  flyingCards: FlyingCardAnimation[];
  currentSeatId?: string;
}

export type TabletopAction =
  | { type: 'LOAD_GAME'; payload: TabletopGameDefinition }
  | { type: 'MOVE_WIDGET'; payload: { id: string; x: number; y: number; zIndex?: number } }
  | { type: 'FLIP_CARD'; payload: { cardId: string } }
  | { type: 'SHUFFLE_DECK'; payload: { deckId: string; newCardIds?: string[] } }
  | {
      type: 'DRAW_CARD';
      payload: {
        deckId: string;
        cardId?: string;
        targetHolderId?: string;
        position?: { x: number; y: number };
        /** Only with `position`: false keeps the drawn card hidden (dragged off a deck). */
        faceUp?: boolean;
      };
    }
  | {
      type: 'DRAW_FROM_BAG';
      payload: {
        bagId: string;
        position?: { x: number; y: number };
        spawnedId?: string;
        targetHolderId?: string;
      };
    }
  | { type: 'SNAP_TO_HOLDER'; payload: { widgetId: string; holderId: string } }
  | { type: 'APPLY_REMOTE_DELTA'; payload: GameDelta }
  /** Undo/redo from the editor; unlike APPLY_REMOTE_DELTA it is synced as an intent. */
  | { type: 'APPLY_EDIT_DELTA'; payload: GameDelta }
  | { type: 'PATCH_WIDGETS'; payload: { patches: Record<string, WidgetPatch> } }
  | { type: 'ADD_WIDGET'; payload: { widget: TabletopWidget } }
  | { type: 'ADD_WIDGETS'; payload: { widgets: TabletopWidget[] } }
  | { type: 'TOGGLE_TIMER'; payload: { timerId: string; now: number } }
  | { type: 'RESET_TIMER'; payload: { timerId: string } }
  | { type: 'SPIN_SPINNER'; payload: { spinnerId: string; index?: number } }
  | { type: 'NEXT_STATE'; payload: { widgetId: string } }
  | { type: 'RUN_ROUTINE'; payload: { buttonId: string; now: number } }
  | { type: 'DELETE_WIDGETS'; payload: { ids: string[] } }
  | { type: 'UPDATE_TABLE'; payload: { changes: Partial<TabletopTableConfig> } }
  | { type: 'RETURN_CARD_TO_DECK'; payload: { cardId: string; deckId: string } }
  | { type: 'UPDATE_COUNTER'; payload: { counterId: string; delta: number } }
  | { type: 'ROLL_DIE'; payload: { dieId: string; value?: number } }
  | { type: 'ROTATE_CARD'; payload: { cardId: string; angle?: number; deltaDegrees?: number } }
  | { type: 'ANIMATE_CARD_TO_TABLE'; payload: { cardId: string; targetHolderId: string } }
  | { type: 'FINISH_ANIMATION'; payload: { animationId: string } }
  | { type: 'SELECT_SEAT'; payload: { seatId: string; playerName?: string } }
  | {
      type: 'TAKE_PIECE_FROM_SUPPLY';
      payload: { pieceId: string; targetPosition?: { x: number; y: number } };
    }
  | { type: 'PLAY_CARD_FROM_HAND'; payload: { cardId: string; position: { x: number; y: number } } }
  | { type: 'SCALE_WIDGETS'; payload: { widgetIds: string[]; factor: number } }
  | { type: 'RESET_WIDGET_SCALE'; payload: { widgetIds: string[] } }
  | { type: 'SET_Z_ORDER'; payload: { widgetIds: string[]; op: ZOrderOp } }
  | { type: 'SET_WIDGET_SHOW_ALWAYS'; payload: { widgetId: string; showAlways: boolean } }
  | { type: 'ADD_HIDDEN_ZONE'; payload: { zone: HiddenZone } }
  | { type: 'UPDATE_HIDDEN_ZONE'; payload: { id: string; changes: Partial<HiddenZone> } }
  | { type: 'REMOVE_HIDDEN_ZONE'; payload: { id: string } }
  | { type: 'MOVE_HIDDEN_ZONE'; payload: { id: string; dx: number; dy: number } }
  | {
      type: 'RESIZE_HIDDEN_ZONE';
      payload: { id: string; x: number; y: number; width: number; height: number };
    }
  | { type: 'TOGGLE_ZONE_REVEAL'; payload: { id: string } };

export function tabletopReducer(
  state: TabletopGameState,
  action: TabletopAction,
): TabletopGameState {
  switch (action.type) {
    case 'LOAD_GAME':
      return {
        game: normalizeHandHolders(action.payload),
        flyingCards: [],
      };

    case 'APPLY_REMOTE_DELTA':
    case 'APPLY_EDIT_DELTA':
      return { ...state, game: applyGameDelta(state.game, action.payload) };

    case 'MOVE_WIDGET': {
      const widget = state.game.widgets[action.payload.id];
      if (!widget) return state;

      const widgets = { ...state.game.widgets };

      // Remove from any parent holder that references it via parent property
      if (widget.parent && widgets[widget.parent] && widgets[widget.parent].type === 'holder') {
        const parentHolder = widgets[widget.parent] as HolderWidget;
        widgets[widget.parent] = {
          ...parentHolder,
          childIds: (parentHolder.childIds || []).filter((id) => id !== action.payload.id),
        };
      }

      // Remove from any holder that contains it
      removeFromHolderAndUpdateHand(widgets, action.payload.id);

      const previousParent = widget.parent || widget.supplyHolderId;
      widgets[action.payload.id] = {
        ...widget,
        parent: undefined,
        supplyHolderId: previousParent,
        x: action.payload.x,
        y: action.payload.y,
        zIndex: action.payload.zIndex ?? widget.zIndex,
        movable: true,
        ...(widget.type === 'card' ? { inPile: false, pileId: undefined } : {}),
      };

      // A moved widget goes to the top unless the caller fixed a zIndex or it keeps its layer.
      const stacked =
        action.payload.zIndex === undefined && !widget.keepZOrder
          ? raiseWidget(widgets, action.payload.id)
          : widgets;

      return {
        ...state,
        game: {
          ...state.game,
          widgets: stacked,
        },
      };
    }

    case 'FLIP_CARD': {
      const widget = state.game.widgets[action.payload.cardId];
      if (!widget || widget.type !== 'card') return state;
      const card = widget as CardWidget;
      const nextFaceUp = !card.faceUp;

      return {
        ...state,
        game: {
          ...state.game,
          widgets: {
            ...state.game.widgets,
            [card.id]: {
              ...card,
              faceUp: nextFaceUp,
              activeFace: nextFaceUp ? 1 : 0,
            },
          },
        },
      };
    }

    case 'ROTATE_CARD': {
      const widget = state.game.widgets[action.payload.cardId];
      if (
        !widget ||
        (widget.type !== 'card' && widget.type !== 'token' && widget.type !== 'holder')
      )
        return state;
      const currentRot =
        typeof (widget as CardWidget).rotation === 'number' ? (widget as CardWidget).rotation : 0;
      const delta = action.payload.deltaDegrees ?? action.payload.angle ?? 60;
      const nextRot = (currentRot + delta) % 360;

      return {
        ...state,
        game: {
          ...state.game,
          widgets: {
            ...state.game.widgets,
            [widget.id]: {
              ...widget,
              rotation: nextRot,
            },
          },
        },
      };
    }

    case 'SNAP_TO_HOLDER': {
      const { widgetId, holderId } = action.payload;
      const targetWidget = state.game.widgets[holderId];
      if (!targetWidget) return state;

      const card = state.game.widgets[widgetId] as CardWidget | undefined;
      const widgets = { ...state.game.widgets };

      let targetDeckId: string | undefined;
      if (targetWidget.type === 'deck') {
        targetDeckId = targetWidget.id;
      } else if (targetWidget.type === 'holder' && (targetWidget as HolderWidget).hasPileChild) {
        const pileChild = Object.values(widgets).find(
          (w) => w.type === 'deck' && w.parent === targetWidget.id,
        );
        if (pileChild) targetDeckId = pileChild.id;
      }

      if (targetDeckId && card && card.type === 'card') {
        const deck = widgets[targetDeckId] as DeckWidget;
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
        placeCardInDeck(widgets, deck, card, widgetId);
        return {
          ...state,
          game: {
            ...state.game,
            widgets,
          },
        };
      }

      if (targetWidget.type !== 'holder') return state;
      const holder = targetWidget as HolderWidget;

      // Remove from any prior holder
      removeFromHolderAndUpdateHand(widgets, widgetId);

      // Add to new holder if not already present
      if (!holder.childIds.includes(widgetId)) {
        widgets[holderId] = {
          ...holder,
          childIds: [...holder.childIds, widgetId],
        };
      }

      // Move widget coordinates to holder
      if (widgets[widgetId]) {
        const updatedHolder = widgets[holderId] as HolderWidget;
        applyLayout(widgets, layoutHolderChildren(updatedHolder, widgets, widgetId), holderId);
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
      const clamped = Math.min(counter.max ?? Infinity, Math.max(counter.min ?? -Infinity, newVal));

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

      const value = action.payload.value ?? Math.floor(Math.random() * die.sides) + 1;

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
        {
          type: 'SNAP_TO_HOLDER',
          payload: { widgetId: action.payload.cardId, holderId: action.payload.targetHolderId },
        },
      );
    }

    case 'FINISH_ANIMATION': {
      return {
        ...state,
        flyingCards: state.flyingCards.filter((f) => f.id !== action.payload.animationId),
      };
    }

    case 'SELECT_SEAT': {
      const { seatId, playerName } = action.payload;
      const seatWidget = state.game.widgets[seatId];
      if (!seatWidget || seatWidget.type !== 'seat') {
        return { ...state, currentSeatId: seatId };
      }
      const seat = seatWidget as SeatWidget;
      return {
        ...state,
        currentSeatId: seatId,
        game: {
          ...state.game,
          widgets: {
            ...state.game.widgets,
            [seatId]: {
              ...seat,
              player: playerName || seat.player,
            },
          },
        },
      };
    }

    case 'SHUFFLE_DECK':
    case 'DRAW_CARD':
    case 'RETURN_CARD_TO_DECK':
      return deckReducer(state, action);
    case 'DRAW_FROM_BAG':
      return bagReducer(state, action);
    case 'TAKE_PIECE_FROM_SUPPLY':
    case 'PLAY_CARD_FROM_HAND':
      return pieceReducer(state, action, tabletopReducer);
    case 'SCALE_WIDGETS':
    case 'RESET_WIDGET_SCALE':
    case 'SET_WIDGET_SHOW_ALWAYS':
    case 'SET_Z_ORDER':
    case 'ADD_HIDDEN_ZONE':
    case 'UPDATE_HIDDEN_ZONE':
    case 'MOVE_HIDDEN_ZONE':
    case 'RESIZE_HIDDEN_ZONE':
    case 'REMOVE_HIDDEN_ZONE':
    case 'TOGGLE_ZONE_REVEAL':
      return viewReducer(state, action);

    case 'PATCH_WIDGETS':
    case 'ADD_WIDGET':
    case 'ADD_WIDGETS':
    case 'DELETE_WIDGETS':
    case 'UPDATE_TABLE':
      return editReducer(state, action);

    case 'TOGGLE_TIMER':
    case 'RESET_TIMER':
    case 'SPIN_SPINNER':
    case 'NEXT_STATE':
      return tableToolReducer(state, action);

    case 'RUN_ROUTINE': {
      // The routine's steps are ordinary actions, applied in order on the device that owns state.
      const button = state.game.widgets[action.payload.buttonId];
      if (!button || button.type !== 'button') return state;
      return routineToActions((button as ButtonWidget).routine, action.payload.now).reduce(
        tabletopReducer,
        state,
      );
    }

    default:
      return state;
  }
}
