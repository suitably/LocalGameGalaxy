/**
 * Reducer for state transitions in Tabletop games [ID: GAME-TABLETOP-REDUCER]
 */
import type { TabletopGameDefinition, TabletopWidget, CardWidget, DeckWidget, HolderWidget, CounterWidget, DieWidget, SeatWidget, GridSnapDef, HiddenZone, BagWidget } from './types';
import { calculateHandLayout } from './handLayout';
import { snapToGridCoords } from './gridLogic';
import { isBoardSnapTarget } from './boardFilter';

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
  | { type: 'DRAW_CARD'; payload: { deckId: string; cardId?: string; targetHolderId?: string; position?: { x: number; y: number } } }
  | { type: 'DRAW_FROM_BAG'; payload: { bagId: string; position?: { x: number; y: number }; spawnedId?: string; targetHolderId?: string } }
  | { type: 'SNAP_TO_HOLDER'; payload: { widgetId: string; holderId: string } }
  | { type: 'RETURN_CARD_TO_DECK'; payload: { cardId: string; deckId: string } }
  | { type: 'UPDATE_COUNTER'; payload: { counterId: string; delta: number } }
  | { type: 'ROLL_DIE'; payload: { dieId: string; value?: number } }
  | { type: 'ROTATE_CARD'; payload: { cardId: string; angle?: number; deltaDegrees?: number } }
  | { type: 'ANIMATE_CARD_TO_TABLE'; payload: { cardId: string; targetHolderId: string } }
  | { type: 'FINISH_ANIMATION'; payload: { animationId: string } }
  | { type: 'SELECT_SEAT'; payload: { seatId: string; playerName?: string } }
  | { type: 'TAKE_PIECE_FROM_SUPPLY'; payload: { pieceId: string; targetPosition?: { x: number; y: number } } }
  | { type: 'PLAY_CARD_FROM_HAND'; payload: { cardId: string; position: { x: number; y: number } } }
  | { type: 'SCALE_WIDGETS'; payload: { widgetIds: string[]; factor: number } }
  | { type: 'RESET_WIDGET_SCALE'; payload: { widgetIds: string[] } }
  | { type: 'SET_WIDGET_SHOW_ALWAYS'; payload: { widgetId: string; showAlways: boolean } }
  | { type: 'ADD_HIDDEN_ZONE'; payload: { zone: HiddenZone } }
  | { type: 'UPDATE_HIDDEN_ZONE'; payload: { id: string; changes: Partial<HiddenZone> } }
  | { type: 'REMOVE_HIDDEN_ZONE'; payload: { id: string } }
  | { type: 'TOGGLE_ZONE_REVEAL'; payload: { id: string } };

function removeFromHolderAndUpdateHand(widgets: Record<string, TabletopWidget>, childId: string) {
  for (const [wId, w] of Object.entries(widgets)) {
    if (w.type === 'holder') {
      const h = w as HolderWidget;
      if (h.childIds.includes(childId)) {
        const nextChildIds = h.childIds.filter((id) => id !== childId);
        const updatedH = {
          ...h,
          childIds: nextChildIds,
        };
        widgets[wId] = updatedH;
        const isHand = updatedH.isHand || updatedH.id.toLowerCase() === 'hand' || updatedH.id.toLowerCase().includes('hand');
        if (isHand) {
          const remainingCards = nextChildIds.map((id) => widgets[id] as CardWidget).filter(Boolean);
          const layout = calculateHandLayout(updatedH, remainingCards);
          for (const [cId, pos] of Object.entries(layout)) {
            const w = widgets[cId];
            if (w && w.type === 'card') {
              widgets[cId] = {
                ...w,
                x: pos.x,
                y: pos.y,
                zIndex: pos.zIndex,
                stackCount: pos.stackCount,
              };
            }
          }
        }
      }
    }
  }
}

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
      for (const [wId, w] of Object.entries(widgets)) {
        if (w.type === 'holder') {
          const h = w as HolderWidget;
          if (h.childIds?.includes(action.payload.id)) {
            const nextChildIds = h.childIds.filter((id) => id !== action.payload.id);
            const updatedH = { ...h, childIds: nextChildIds };
            widgets[wId] = updatedH;

            const isHand = updatedH.isHand || (updatedH.id || '').toLowerCase().includes('hand');
            if (isHand) {
              const remainingCards = nextChildIds.map((id) => widgets[id] as CardWidget).filter(Boolean);
              const layout = calculateHandLayout(updatedH, remainingCards);
              for (const [cId, pos] of Object.entries(layout)) {
                const cw = widgets[cId];
                if (cw && cw.type === 'card') {
                  widgets[cId] = { ...cw, x: pos.x, y: pos.y, zIndex: pos.zIndex, stackCount: pos.stackCount };
                }
              }
            }
          }
        }
      }

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

      return {
        ...state,
        game: {
          ...state.game,
          widgets,
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
      if (!widget || (widget.type !== 'card' && widget.type !== 'token' && widget.type !== 'holder')) return state;
      const currentRot = typeof (widget as CardWidget).rotation === 'number' ? (widget as CardWidget).rotation : 0;
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

    case 'SHUFFLE_DECK': {
      const widget = state.game.widgets[action.payload.deckId];
      if (!widget || widget.type !== 'deck') return state;
      const deck = widget as DeckWidget;

      const newIds = action.payload.newCardIds
        ? [...action.payload.newCardIds]
        : [...deck.cardIds];

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
        const handHolder = Object.values(widgets).find(
          (w) => w.type === 'holder' && (w.id.toLowerCase() === 'hand' || w.id.toLowerCase().includes('hand') || (w as HolderWidget).isHand)
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

          const handCards = updatedChildIds
            .map((cId) => widgets[cId] as CardWidget)
            .filter(Boolean);
          const layout = calculateHandLayout(handHolder, handCards);
          for (const [cId, pos] of Object.entries(layout)) {
            const w = widgets[cId];
            if (w && w.type === 'card') {
              widgets[cId] = {
                ...w,
                x: pos.x,
                y: pos.y,
                zIndex: pos.zIndex,
                stackCount: pos.stackCount,
              };
            }
          }
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

      return {
        ...state,
        game: {
          ...state.game,
          widgets,
        },
      };
    }

    case 'DRAW_FROM_BAG': {
      const bagWidget = state.game.widgets[action.payload.bagId];
      if (!bagWidget || bagWidget.type !== 'bag') return state;
      const bag = bagWidget as BagWidget;
      const widgets: Record<string, TabletopWidget> = { ...state.game.widgets };

      if (bag.isInfinite && bag.templateWidget) {
        const template = bag.templateWidget;
        const spawnedId = action.payload.spawnedId || `tok_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

        let nextX = bag.x + bag.width + 16;
        let nextY = bag.y;

        if (action.payload.position) {
          nextX = action.payload.position.x;
          nextY = action.payload.position.y;
        } else if (action.payload.targetHolderId && widgets[action.payload.targetHolderId]) {
          const holder = widgets[action.payload.targetHolderId] as HolderWidget;
          const childIndex = holder.childIds?.length || 0;
          widgets[holder.id] = {
            ...holder,
            childIds: [...(holder.childIds || []), spawnedId],
          };
          const spread = Math.min(30, (holder.width - 40) / Math.max(1, childIndex + 1));
          nextX = holder.x + 10 + childIndex * spread;
          nextY = holder.y + 10;
        }

        const maxZ = Math.max(1, ...Object.values(widgets).map((w) => w.zIndex || 0));

        const cloned: TabletopWidget = {
          ...template,
          id: spawnedId,
          x: nextX,
          y: nextY,
          zIndex: maxZ + 1,
          movable: true,
          pinned: false,
        };

        widgets[spawnedId] = cloned;

        return {
          ...state,
          game: {
            ...state.game,
            widgets,
            updatedAt: Date.now(),
          },
        };
      } else if (!bag.isInfinite && bag.itemIds && bag.itemIds.length > 0) {
        const drawnId = bag.itemIds[bag.itemIds.length - 1];
        const remainingItemIds = bag.itemIds.filter((id) => id !== drawnId);

        widgets[bag.id] = {
          ...bag,
          itemIds: remainingItemIds,
          itemCount: remainingItemIds.length,
        };

        let nextX = bag.x + bag.width + 16;
        let nextY = bag.y;
        if (action.payload.position) {
          nextX = action.payload.position.x;
          nextY = action.payload.position.y;
        }

        const item = widgets[drawnId];
        if (item) {
          widgets[drawnId] = {
            ...item,
            x: nextX,
            y: nextY,
            movable: true,
            pinned: false,
          };
        }

        return {
          ...state,
          game: {
            ...state.game,
            widgets,
            updatedAt: Date.now(),
          },
        };
      }

      return state;
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

      const newCardIds = deck.cardIds.includes(cardId)
        ? deck.cardIds
        : [...deck.cardIds, cardId];

      widgets[deck.id] = {
        ...deck,
        cardIds: newCardIds,
        cardCount: newCardIds.length,
        ...(deck.isPile && card
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
      const targetWidget = state.game.widgets[holderId];
      if (!targetWidget) return state;

      const card = state.game.widgets[widgetId] as CardWidget | undefined;
      const widgets = { ...state.game.widgets };

      let targetDeckId: string | undefined;
      if (targetWidget.type === 'deck') {
        targetDeckId = targetWidget.id;
      } else if (targetWidget.type === 'holder' && (targetWidget as HolderWidget).hasPileChild) {
        const pileChild = Object.values(widgets).find(
          (w) => w.type === 'deck' && w.parent === targetWidget.id
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
        const newCardIds = deck.cardIds.includes(widgetId)
          ? deck.cardIds
          : [...deck.cardIds, widgetId];
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
        widgets[widgetId] = {
          ...card,
          inPile: true,
          pileId: deck.id,
          faceUp: deck.faceUp ?? false,
          activeFace: deck.activeFace ?? 0,
          x: deck.x,
          y: deck.y,
          zIndex: deck.zIndex,
        };
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
        const isHand = updatedHolder.isHand || updatedHolder.id.toLowerCase() === 'hand' || updatedHolder.id.toLowerCase().includes('hand');

        if (isHand) {
          const handCards = updatedHolder.childIds
            .map((id) => widgets[id] as CardWidget)
            .filter(Boolean);
          const layout = calculateHandLayout(updatedHolder, handCards);
          for (const [cId, pos] of Object.entries(layout)) {
            const w = widgets[cId];
            if (w && w.type === 'card') {
              widgets[cId] = {
                ...w,
                parent: holderId,
                x: pos.x,
                y: pos.y,
                zIndex: pos.zIndex,
                stackCount: pos.stackCount,
              };
            }
          }
        } else {
          const childIndex = updatedHolder.childIds.indexOf(widgetId);
          const childW = widgets[widgetId]?.width || 80;
          const childH = widgets[widgetId]?.height || 120;
          let childX = updatedHolder.x + Math.max(0, Math.round((updatedHolder.width - childW) / 2));
          let childY = updatedHolder.y + Math.max(0, Math.round((updatedHolder.height - childH) / 2));
          switch (updatedHolder.layout) {
            case 'stack':
              childX += childIndex * 2;
              childY += childIndex * 2;
              break;
            case 'fan': {
              const totalCards = updatedHolder.childIds.length;
              const cardW = 80;
              const maxSpread = cardW + 16;
              const availableWidth = Math.max(0, updatedHolder.width - cardW - 32);
              const spread = totalCards > 1
                ? Math.min(maxSpread, Math.max(36, availableWidth / (totalCards - 1)))
                : maxSpread;

              updatedHolder.childIds.forEach((cId, idx) => {
                if (widgets[cId]) {
                  widgets[cId] = {
                    ...widgets[cId],
                    parent: holderId,
                    x: updatedHolder.x + 16 + idx * spread,
                    y: updatedHolder.y + Math.max(4, (updatedHolder.height - 120) / 2),
                    zIndex: updatedHolder.zIndex + 10 + idx,
                  };
                }
              });
              childX = updatedHolder.x + 16 + childIndex * spread;
              childY = updatedHolder.y + Math.max(4, (updatedHolder.height - 120) / 2);
              break;
            }
            case 'grid': {
              const cols = Math.floor(updatedHolder.width / 84);
              childX += (childIndex % cols) * 84;
              childY += Math.floor(childIndex / cols) * 124;
              break;
            }
          }
          widgets[widgetId] = {
            ...widgets[widgetId],
            parent: holderId,
            x: childX,
            y: childY,
            zIndex: Math.max(widgets[widgetId].zIndex, holder.zIndex + 10),
          };
        }
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
              player: playerName || seat.player || 'Player',
            },
          },
        },
      };
    }

    case 'TAKE_PIECE_FROM_SUPPLY': {
      const { pieceId, targetPosition } = action.payload;
      const piece = state.game.widgets[pieceId];
      if (!piece) return state;

      let posX = targetPosition?.x ?? Math.round(state.game.table.width / 2);
      let posY = targetPosition?.y ?? Math.round(state.game.table.height / 2 + 60);

      if (targetPosition && Array.isArray(piece.grid) && piece.grid.length > 0) {
        const snapped = snapToGridCoords(piece, posX, posY, piece.grid as GridSnapDef[]);
        if (snapped) {
          posX = snapped.x;
          posY = snapped.y;
        }
      }

      const updatedWidgets = { ...state.game.widgets };
      if (piece.parent && updatedWidgets[piece.parent] && updatedWidgets[piece.parent].type === 'holder') {
        const parentHolder = updatedWidgets[piece.parent] as HolderWidget;
        updatedWidgets[piece.parent] = {
          ...parentHolder,
          childIds: (parentHolder.childIds || []).filter((id) => id !== pieceId),
        };
      }

      // Check if dropped on a board HOLDER widget (excluding personal supply organizers)
      const pieceW = piece.width || 56;
      const pieceH = piece.height || 56;
      const cx = posX + pieceW / 2;
      const cy = posY + pieceH / 2;
      let targetHolderId: string | undefined;
      for (const [id, w] of Object.entries(updatedWidgets)) {
        if (id !== pieceId && isBoardSnapTarget(w, 'token')) {
          if (cx >= w.x && cx <= w.x + w.width && cy >= w.y && cy <= w.y + w.height) {
            targetHolderId = id;
            break;
          }
        }
      }

      if (targetHolderId) {
        return tabletopReducer(
          { ...state, game: { ...state.game, widgets: updatedWidgets } },
          { type: 'SNAP_TO_HOLDER', payload: { widgetId: pieceId, holderId: targetHolderId } }
        );
      }

      const maxZ = Math.max(10, ...Object.values(updatedWidgets).map((w) => (typeof w.zIndex === 'number' ? w.zIndex : 0)));
      const previousParent = piece.parent || piece.supplyHolderId;

      updatedWidgets[pieceId] = {
        ...piece,
        parent: undefined,
        supplyHolderId: previousParent,
        x: posX,
        y: posY,
        zIndex: Math.max(5000, maxZ + 1),
        movable: true,
      };

      return {
        ...state,
        game: {
          ...state.game,
          widgets: updatedWidgets,
        },
      };
    }

    case 'PLAY_CARD_FROM_HAND': {
      const { cardId, position } = action.payload;
      const card = state.game.widgets[cardId] as CardWidget | undefined;
      if (!card || card.type !== 'card') return state;

      const widgets = { ...state.game.widgets };

      // Remove from any hand or parent holder
      removeFromHolderAndUpdateHand(widgets, cardId);

      let posX = position.x;
      let posY = position.y;

      if (Array.isArray(card.grid) && card.grid.length > 0) {
        const snapped = snapToGridCoords(card, posX, posY, card.grid as GridSnapDef[]);
        if (snapped) {
          posX = snapped.x;
          posY = snapped.y;
        }
      }

      // Check if dropped directly on a DECK or board HOLDER widget (excluding personal hands)
      const cx = posX + (card.width || 80) / 2;
      const cy = posY + (card.height || 120) / 2;
      let targetId: string | undefined;
      for (const [id, w] of Object.entries(widgets)) {
        if (id !== cardId && isBoardSnapTarget(w, 'card')) {
          if (cx >= w.x && cx <= w.x + w.width && cy >= w.y && cy <= w.y + w.height) {
            targetId = id;
            break;
          }
        }
      }

      if (targetId) {
        return tabletopReducer(
          { ...state, game: { ...state.game, widgets } },
          { type: 'SNAP_TO_HOLDER', payload: { widgetId: cardId, holderId: targetId } }
        );
      }

      const maxZ = Math.max(10, ...Object.values(widgets).map((w) => (typeof w.zIndex === 'number' ? w.zIndex : 0)));

      widgets[cardId] = {
        ...card,
        parent: undefined,
        inPile: false,
        pileId: undefined,
        x: posX,
        y: posY,
        zIndex: Math.max(5000, maxZ + 1),
        faceUp: true,
        activeFace: 1,
        movable: true,
      };

      return {
        ...state,
        game: {
          ...state.game,
          widgets,
        },
      };
    }

    case 'SCALE_WIDGETS': {
      const { widgetIds, factor } = action.payload;
      if (!widgetIds || widgetIds.length === 0 || factor <= 0) return state;
      const widgets = { ...state.game.widgets };
      for (const id of widgetIds) {
        const w = widgets[id];
        if (!w || w.pinned) continue;
        const defaultW = w.defaultWidth ?? w.width;
        const defaultH = w.defaultHeight ?? w.height;
        const newW = Math.max(24, Math.min(1200, Math.round(w.width * factor)));
        const newH = Math.max(24, Math.min(1200, Math.round(w.height * factor)));
        const dx = Math.round((newW - w.width) / 2);
        const dy = Math.round((newH - w.height) / 2);
        widgets[id] = {
          ...w,
          width: newW,
          height: newH,
          x: w.x - dx,
          y: w.y - dy,
          defaultWidth: defaultW,
          defaultHeight: defaultH,
        };
      }
      return { ...state, game: { ...state.game, widgets } };
    }

    case 'RESET_WIDGET_SCALE': {
      const { widgetIds } = action.payload;
      if (!widgetIds || widgetIds.length === 0) return state;
      const widgets = { ...state.game.widgets };
      for (const id of widgetIds) {
        const w = widgets[id];
        if (!w || w.pinned) continue;
        if (w.defaultWidth && w.defaultHeight) {
          const dx = Math.round((w.defaultWidth - w.width) / 2);
          const dy = Math.round((w.defaultHeight - w.height) / 2);
          widgets[id] = {
            ...w,
            width: w.defaultWidth,
            height: w.defaultHeight,
            x: w.x - dx,
            y: w.y - dy,
          };
        }
      }
      return { ...state, game: { ...state.game, widgets } };
    }

    case 'SET_WIDGET_SHOW_ALWAYS': {
      const { widgetId, showAlways } = action.payload;
      const w = state.game.widgets[widgetId];
      if (!w) return state;
      return {
        ...state,
        game: {
          ...state.game,
          widgets: {
            ...state.game.widgets,
            [widgetId]: { ...w, showAlways },
          },
        },
      };
    }

    case 'ADD_HIDDEN_ZONE': {
      const { zone } = action.payload;
      const hiddenZones = { ...(state.game.hiddenZones || {}), [zone.id]: zone };
      return {
        ...state,
        game: {
          ...state.game,
          hiddenZones,
        },
      };
    }

    case 'UPDATE_HIDDEN_ZONE': {
      const { id, changes } = action.payload;
      const existing = state.game.hiddenZones?.[id];
      if (!existing) return state;
      const hiddenZones = {
        ...(state.game.hiddenZones || {}),
        [id]: { ...existing, ...changes },
      };
      return {
        ...state,
        game: {
          ...state.game,
          hiddenZones,
        },
      };
    }

    case 'REMOVE_HIDDEN_ZONE': {
      const { id } = action.payload;
      if (!state.game.hiddenZones || !state.game.hiddenZones[id]) return state;
      const hiddenZones = { ...state.game.hiddenZones };
      delete hiddenZones[id];
      return {
        ...state,
        game: {
          ...state.game,
          hiddenZones,
        },
      };
    }

    case 'TOGGLE_ZONE_REVEAL': {
      const { id } = action.payload;
      const existing = state.game.hiddenZones?.[id];
      if (!existing) return state;
      const hiddenZones = {
        ...(state.game.hiddenZones || {}),
        [id]: { ...existing, revealed: !existing.revealed },
      };
      return {
        ...state,
        game: {
          ...state.game,
          hiddenZones,
        },
      };
    }

    default:
      return state;
  }
}
