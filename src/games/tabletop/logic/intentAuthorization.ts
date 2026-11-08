/**
 * Per-seat intent authorization on the host [ID: LOGIC-TABLETOP-INTENT-AUTH]
 *
 * The host applies a phone's intent only if it stays within that phone's seat (#685, ADR-0005
 * decision 4): editor actions are host-only, a phone never touches or fills another seat's hand
 * and never hands a hidden zone (or anything else) to a different owner. The seat is the claim
 * the phone made when it joined; see `docs/tech/tabletop-engine.md` for the residual risk.
 */
import type { TabletopAction } from './tabletopReducer';
import type { HolderWidget, TabletopGameDefinition, TabletopWidget } from './types';
import { isHandHolder } from './handHolder';
import { privateCardOwners } from './handPrivacy';

/** Who sent an intent, as the host knows it. `seat` null = no seat (owns no hand, no zone). */
export interface IntentSender {
  spectator: boolean;
  seat: number | null;
}

/** Editor and host-UI actions: they rewrite widgets, the table or the host's seat wholesale. */
const HOST_ONLY_ACTIONS = new Set<TabletopAction['type']>([
  'PATCH_WIDGETS',
  'ADD_WIDGET',
  'ADD_WIDGETS',
  'DELETE_WIDGETS',
  'UPDATE_TABLE',
  'APPLY_EDIT_DELTA',
  'SELECT_SEAT',
]);

export const isHostOnlyAction = (action: TabletopAction): boolean =>
  HOST_ONLY_ACTIONS.has(action.type);

type Widgets = Record<string, TabletopWidget>;

/** Seat that owns a hand holder, or undefined for anything else (incl. ownerless hands). */
function handOwner(widget: TabletopWidget | undefined): number | undefined {
  if (!widget || widget.type !== 'holder') return undefined;
  const holder = widget as HolderWidget;
  return typeof holder.ownerSeat === 'number' && isHandHolder(holder)
    ? holder.ownerSeat
    : undefined;
}

/** Widgets an action reads or changes, and the holders it puts something into. */
function touchedIds(action: TabletopAction, widgets: Widgets): { ids: string[]; into: string[] } {
  switch (action.type) {
    case 'MOVE_WIDGET':
      return { ids: [action.payload.id], into: [] };
    case 'FLIP_CARD':
    case 'ROTATE_CARD':
    case 'RETURN_CARD_TO_DECK':
    case 'PLAY_CARD_FROM_HAND':
      return { ids: [action.payload.cardId], into: [] };
    case 'SHUFFLE_DECK':
      return { ids: [action.payload.deckId, ...(action.payload.newCardIds ?? [])], into: [] };
    case 'DRAW_CARD': {
      const { cardId, targetHolderId, position } = action.payload;
      // Without target or position the reducer falls back to the first hand holder.
      const fallback = Object.values(widgets).find((w) => w.type === 'holder' && isHandHolder(w));
      const into = targetHolderId ?? (position ? undefined : fallback?.id);
      return { ids: cardId ? [cardId] : [], into: into ? [into] : [] };
    }
    case 'DRAW_FROM_BAG':
      return {
        ids: [],
        into: action.payload.targetHolderId ? [action.payload.targetHolderId] : [],
      };
    case 'SNAP_TO_HOLDER':
      return { ids: [action.payload.widgetId], into: [action.payload.holderId] };
    case 'ANIMATE_CARD_TO_TABLE':
      return { ids: [action.payload.cardId], into: [action.payload.targetHolderId] };
    case 'TAKE_PIECE_FROM_SUPPLY':
      return { ids: [action.payload.pieceId], into: [] };
    case 'SCALE_WIDGETS':
    case 'RESET_WIDGET_SCALE':
    case 'SET_Z_ORDER':
      return { ids: action.payload.widgetIds, into: [] };
    case 'SET_WIDGET_SHOW_ALWAYS':
    case 'NEXT_STATE':
      return { ids: [action.payload.widgetId], into: [] };
    default:
      return { ids: [], into: [] };
  }
}

/** Hidden-zone actions: only zones the sender's seat owns, never a change of owner. */
function zoneAllowed(
  action: TabletopAction,
  game: Pick<TabletopGameDefinition, 'hiddenZones'>,
  seat: number | null,
): boolean | undefined {
  const own = (id: string) => seat !== null && game.hiddenZones?.[id]?.ownerSeat === seat;
  switch (action.type) {
    case 'ADD_HIDDEN_ZONE':
      return seat !== null && action.payload.zone.ownerSeat === seat;
    case 'UPDATE_HIDDEN_ZONE':
      return own(action.payload.id) && !('ownerSeat' in action.payload.changes);
    case 'MOVE_HIDDEN_ZONE':
    case 'RESIZE_HIDDEN_ZONE':
    case 'REMOVE_HIDDEN_ZONE':
    case 'TOGGLE_ZONE_REVEAL':
      return own(action.payload.id);
    default:
      return undefined;
  }
}

/**
 * Whether a seated, non-spectator sender may apply this action on the host's game. Spectator,
 * local-only and redacted checks stay in `acceptIntent` (`syncProtocol.ts`).
 */
export function authorizeSeatIntent(
  action: TabletopAction,
  sender: IntentSender,
  game: Pick<TabletopGameDefinition, 'widgets' | 'hiddenZones'>,
): boolean {
  if (sender.spectator || isHostOnlyAction(action)) return false;
  const zone = zoneAllowed(action, game, sender.seat);
  if (zone !== undefined) return zone;

  const widgets = game.widgets ?? {};
  const owners = privateCardOwners(widgets);
  const foreign = (seat: number | undefined) => seat !== undefined && seat !== sender.seat;
  const { ids, into } = touchedIds(action, widgets);
  if (ids.some((id) => foreign(owners.get(id)) || foreign(handOwner(widgets[id])))) return false;
  return !into.some((id) => foreign(handOwner(widgets[id])));
}
