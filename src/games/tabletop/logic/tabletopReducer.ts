/**
 * Reducer for state transitions in Tabletop games [ID: GAME-TABLETOP-REDUCER]
 */
import type { TabletopGameDefinition, TabletopWidget, CardWidget, DeckWidget, HolderWidget, CounterWidget, DieWidget, SeatWidget, GridSnapDef } from './types';
import { calculateHandLayout } from './handLayout';
import { snapToGridCoords } from './gridLogic';

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
  | { type: 'DRAW_CARD'; payload: { deckId: string; targetHolderId?: string; position?: { x: number; y: number } } }
  | { type: 'SNAP_TO_HOLDER'; payload: { widgetId: string; holderId: string } }
  | { type: 'RETURN_CARD_TO_DECK'; payload: { cardId: string; deckId: string } }
  | { type: 'UPDATE_COUNTER'; payload: { counterId: string; delta: number } }
  | { type: 'ROLL_DIE'; payload: { dieId: string; value?: number } }
  | { type: 'ROTATE_CARD'; payload: { cardId: string; angle?: number } }
  | { type: 'ANIMATE_CARD_TO_TABLE'; payload: { cardId: string; targetHolderId: string } }
  | { type: 'FINISH_ANIMATION'; payload: { animationId: string } }
  | { type: 'SELECT_SEAT'; payload: { seatId: string; playerName?: string } }
  | { type: 'TAKE_PIECE_FROM_SUPPLY'; payload: { pieceId: string; targetPosition?: { x: number; y: number } } }
  | { type: 'PLAY_CARD_FROM_HAND'; payload: { cardId: string; position: { x: number; y: number } } };

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

      widgets[action.payload.id] = {
        ...widget,
        x: action.payload.x,
        y: action.payload.y,
        zIndex: action.payload.zIndex ?? widget.zIndex,
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

    case 'ROTATE_CARD': {
      const { cardId, angle = 60 } = action.payload;
      const card = state.game.widgets[cardId];
      if (!card || card.type !== 'card') return state;
      const cardWidget = card as CardWidget;
      return {
        ...state,
        game: {
          ...state.game,
          widgets: {
            ...state.game.widgets,
            [cardId]: {
              ...cardWidget,
              rotation: (cardWidget.rotation + angle) % 360,
            },
          },
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
      const delta = action.payload.deltaDegrees ?? 90;
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

      const drawnCardId = deck.cardIds[deck.cardIds.length - 1];
      const remainingDeckIds = deck.cardIds.slice(0, -1);

      const widgets: Record<string, TabletopWidget> = { ...state.game.widgets };

      // Update remaining deck / pile state
      let updatedTopFront = deck.frontContent;
      let updatedTopBack = deck.backContent;

      if (deck.isPile) {
        if (remainingDeckIds.length > 0) {
          const nextTopId = remainingDeckIds[remainingDeckIds.length - 1];
          const nextTopCard = widgets[nextTopId] as CardWidget | undefined;
          if (nextTopCard) {
            updatedTopFront = nextTopCard.frontContent;
            updatedTopBack = nextTopCard.backContent;
          }
        } else {
          updatedTopFront = undefined;
        }
      }

      widgets[deck.id] = {
        ...deck,
        cardIds: remainingDeckIds,
        cardCount: remainingDeckIds.length,
        frontContent: updatedTopFront,
        backContent: updatedTopBack,
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

    case 'RETURN_CARD_TO_DECK': {
      const { cardId, deckId } = action.payload;
      const deckWidget = state.game.widgets[deckId];
      if (!deckWidget || deckWidget.type !== 'deck') return state;
      const deck = deckWidget as DeckWidget;
      const card = state.game.widgets[cardId] as CardWidget | undefined;
      if (!card || card.type !== 'card') return state;

      const widgets = { ...state.game.widgets };
      for (const [wId, w] of Object.entries(widgets)) {
        if (w.type === 'holder') {
          const h = w as HolderWidget;
          if (h.childIds.includes(cardId)) {
            const nextChildIds = h.childIds.filter((id) => id !== cardId);
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

      const newCardIds = deck.cardIds.includes(cardId)
        ? deck.cardIds
        : [cardId, ...deck.cardIds];

      widgets[deck.id] = {
        ...deck,
        cardIds: newCardIds,
        cardCount: newCardIds.length,
      };

      widgets[cardId] = {
        ...card,
        inPile: true,
        pileId: deck.id,
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
          : [widgetId, ...deck.cardIds];
        widgets[deck.id] = {
          ...deck,
          cardIds: newCardIds,
          cardCount: newCardIds.length,
        };
        widgets[widgetId] = {
          ...card,
          inPile: true,
          pileId: deck.id,
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
      for (const [wId, w] of Object.entries(widgets)) {
        if (w.type === 'holder') {
          const h = w as HolderWidget;
          if (h.childIds.includes(widgetId)) {
            const nextChildIds = h.childIds.filter((id) => id !== widgetId);
            const updatedH = {
              ...h,
              childIds: nextChildIds,
            };
            widgets[wId] = updatedH;
            const priorIsHand = updatedH.isHand || updatedH.id.toLowerCase() === 'hand' || updatedH.id.toLowerCase().includes('hand');
            if (priorIsHand) {
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
                x: pos.x,
                y: pos.y,
                zIndex: pos.zIndex,
                stackCount: pos.stackCount,
              };
            }
          }
        } else {
          const childIndex = updatedHolder.childIds.indexOf(widgetId);
          let childX = updatedHolder.x + 4;
          let childY = updatedHolder.y + 4;
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

      updatedWidgets[pieceId] = {
        ...piece,
        parent: undefined,
        x: posX,
        y: posY,
        zIndex: 5000,
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
      for (const [wId, w] of Object.entries(widgets)) {
        if (w.type === 'holder') {
          const h = w as HolderWidget;
          if (h.childIds.includes(cardId)) {
            const nextChildIds = h.childIds.filter((id) => id !== cardId);
            const updatedH = { ...h, childIds: nextChildIds };
            widgets[wId] = updatedH;
            const isHand = updatedH.isHand || updatedH.id.toLowerCase().includes('hand');
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

      let posX = position.x;
      let posY = position.y;

      if (Array.isArray(card.grid) && card.grid.length > 0) {
        const snapped = snapToGridCoords(card, posX, posY, card.grid as GridSnapDef[]);
        if (snapped) {
          posX = snapped.x;
          posY = snapped.y;
        }
      }

      // Only snap if dropped directly on a DECK widget
      const cx = posX + (card.width || 80) / 2;
      const cy = posY + (card.height || 120) / 2;
      let targetDeckId: string | undefined;
      for (const [id, w] of Object.entries(widgets)) {
        if (id !== cardId && w.type === 'deck') {
          if (cx >= w.x && cx <= w.x + w.width && cy >= w.y && cy <= w.y + w.height) {
            targetDeckId = id;
            break;
          }
        }
      }

      if (targetDeckId) {
        const deck = widgets[targetDeckId] as DeckWidget;
        const newCardIds = deck.cardIds.includes(cardId) ? deck.cardIds : [cardId, ...deck.cardIds];
        widgets[deck.id] = { ...deck, cardIds: newCardIds, cardCount: newCardIds.length };
        widgets[cardId] = { ...card, parent: undefined, inPile: true, pileId: deck.id, x: deck.x, y: deck.y, zIndex: deck.zIndex };
        return { ...state, game: { ...state.game, widgets } };
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

    default:
      return state;
  }
}
