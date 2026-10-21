/**
 * Taking supply pieces and playing hand cards [ID: LOGIC-TABLETOP-PIECE-REDUCER]
 */
import type { CardWidget, HolderWidget, GridSnapDef } from '../types';
import { snapToGridCoords } from '../gridLogic';
import { isBoardSnapTarget } from '../boardFilter';
import { removeFromHolderAndUpdateHand } from './holderMembership';
import type { TabletopAction, TabletopGameState } from '../tabletopReducer';

export type PieceAction = Extract<
  TabletopAction,
  { type: 'TAKE_PIECE_FROM_SUPPLY' | 'PLAY_CARD_FROM_HAND' }
>;

export function pieceReducer(
  state: TabletopGameState,
  action: PieceAction,
  root: (state: TabletopGameState, action: TabletopAction) => TabletopGameState,
): TabletopGameState {
  switch (action.type) {
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
      if (
        piece.parent &&
        updatedWidgets[piece.parent] &&
        updatedWidgets[piece.parent].type === 'holder'
      ) {
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
        return root(
          { ...state, game: { ...state.game, widgets: updatedWidgets } },
          { type: 'SNAP_TO_HOLDER', payload: { widgetId: pieceId, holderId: targetHolderId } },
        );
      }

      const maxZ = Math.max(
        10,
        ...Object.values(updatedWidgets).map((w) => (typeof w.zIndex === 'number' ? w.zIndex : 0)),
      );
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
        return root(
          { ...state, game: { ...state.game, widgets } },
          { type: 'SNAP_TO_HOLDER', payload: { widgetId: cardId, holderId: targetId } },
        );
      }

      const maxZ = Math.max(
        10,
        ...Object.values(widgets).map((w) => (typeof w.zIndex === 'number' ? w.zIndex : 0)),
      );

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
  }
}
