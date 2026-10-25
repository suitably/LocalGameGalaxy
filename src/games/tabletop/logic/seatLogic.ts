/**
 * Tabletop seat and player logic [ID: LOGIC-TABLETOP-SEAT]
 */
import type { TabletopWidget, SeatWidget, TokenWidget, HolderWidget, CardWidget } from './types';
import { isHandHolderWidget } from './handHolder';
import { findPlayerHandHolder } from './boardFilter';
import { PIECE_ORDER, pieceNeutrals, piecePalette } from '../../../themeTokens';

/** Seat 1..8 in palette order (DESIGN.md §2.3). */
export const DEFAULT_SEAT_COLORS: Record<number, string> = Object.fromEntries(
  PIECE_ORDER.map((c, i) => [i + 1, piecePalette[c]]),
);

/**
 * Returns all seat widgets defined in the game, sorted by seat index.
 */
export function getSeatWidgets(widgets: Record<string, TabletopWidget>): SeatWidget[] {
  const seats = Object.values(widgets).filter((w): w is SeatWidget => w.type === 'seat');
  return seats.sort((a, b) => (a.index || 0) - (b.index || 0));
}

/**
 * Resolves the visual color of a seat, falling back to name heuristics or default palette.
 */
export function resolveSeatColor(seat: SeatWidget): string {
  if (seat.color && seat.color !== '#999999' && seat.color !== '#999') {
    return seat.color;
  }
  const idLower = (seat.id || '').toLowerCase();
  const labelLower = (seat.label || '').toLowerCase();
  if (idLower.includes('white') || labelLower.includes('white') || idLower.includes('weiß'))
    return pieceNeutrals.white;
  if (idLower.includes('black') || labelLower.includes('black') || idLower.includes('schwarz'))
    return pieceNeutrals.black;
  if (idLower.includes('red') || labelLower.includes('red') || idLower.includes('rot'))
    return piecePalette.red;
  if (idLower.includes('blue') || labelLower.includes('blue') || idLower.includes('blau'))
    return piecePalette.blue;
  if (idLower.includes('orange')) return piecePalette.orange;
  if (idLower.includes('green') || labelLower.includes('grün')) return piecePalette.green;

  return DEFAULT_SEAT_COLORS[seat.index] || piecePalette.blue;
}

/**
 * Finds all personal supply pieces for a given seat that are currently sitting in reserve holders.
 * Returns map of piece group key -> list of TokenWidget.
 */
export function getPlayerSupplyPieces(
  widgets: Record<string, TabletopWidget>,
  seatIndex: number,
): Record<string, TokenWidget[]> {
  const result: Record<string, TokenWidget[]> = {};
  const playerPrefix = `player ${seatIndex}`;

  // Find all holders belonging to this player (e.g. "Player 1 - Roads", "Player 1 - Settlements", etc.)
  const playerHolders = Object.values(widgets).filter(
    (w): w is HolderWidget =>
      w.type === 'holder' &&
      (w.id.toLowerCase().startsWith(playerPrefix) ||
        w.ownerSeat === seatIndex - 1 ||
        w.ownerSeat === seatIndex),
  );

  const holderChildIds = new Set<string>();
  for (const h of playerHolders) {
    for (const cid of h.childIds || []) {
      holderChildIds.add(cid);
    }
  }

  // Find tokens that are in these holders or have ownerSeat matching this seat
  for (const w of Object.values(widgets)) {
    if (w.type !== 'token') continue;
    const isChild = holderChildIds.has(w.id);
    const parentMatches =
      typeof w.parent === 'string' && w.parent.toLowerCase().startsWith(playerPrefix);
    const ownerMatches = w.ownerSeat === seatIndex - 1 || w.ownerSeat === seatIndex;

    if ((isChild || parentMatches || ownerMatches) && w.parent) {
      // Determine piece group (e.g. "Road", "Settlement", "City", or label)
      let groupName = w.label || 'Piece';
      const checkStr = `${w.id} ${w.parent || ''} ${w.label || ''}`.toLowerCase();
      if (checkStr.includes('road')) groupName = 'Road';
      else if (checkStr.includes('settlement')) groupName = 'Settlement';
      else if (checkStr.includes('city')) groupName = 'City';

      if (!result[groupName]) result[groupName] = [];
      result[groupName].push(w as TokenWidget);
    }
  }

  return result;
}

export interface PlayerStats {
  seatId: string;
  seatIndex: number;
  seatName: string;
  color: string;
  player?: string;
  handCardCount: number;
  supplies: { group: string; inSupply: number; total: number }[];
  isTurn: boolean;
}

/**
 * Computes player summary statistics for the HUD across all seats.
 */
export function getPlayerStats(
  widgets: Record<string, TabletopWidget>,
  seat: SeatWidget,
): PlayerStats {
  const color = resolveSeatColor(seat);
  const seatIndex = seat.index || 1;
  const playerPrefix = `player ${seatIndex}`;

  // 1. Hand card count
  let handCardCount = 0;
  const handHolders = Object.values(widgets).filter(
    (w): w is HolderWidget =>
      w.type === 'holder' &&
      isHandHolderWidget(w) &&
      (w.ownerSeat === seatIndex - 1 ||
        w.ownerSeat === seatIndex ||
        w.id.toLowerCase().includes(playerPrefix)),
  );

  if (handHolders.length > 0) {
    for (const h of handHolders) {
      handCardCount += (h.childIds || []).filter((cid) => widgets[cid]?.type === 'card').length;
    }
  } else {
    // Check cards with owner / ownerSeat
    handCardCount = Object.values(widgets).filter(
      (w): w is CardWidget =>
        w.type === 'card' &&
        (w.ownerSeat === seatIndex - 1 || w.ownerSeat === seatIndex) &&
        Boolean(w.inPile === false || w.inPile === undefined),
    ).length;
  }

  // 2. Supplies breakdown
  const supplyPieces = getPlayerSupplyPieces(widgets, seatIndex);
  const supplies = Object.entries(supplyPieces).map(([group, pieces]) => {
    return {
      group,
      inSupply: pieces.length,
      total: pieces.length, // total tracked in supply
    };
  });

  return {
    seatId: seat.id,
    seatIndex,
    seatName: seat.label || seat.id,
    color,
    player: seat.player,
    handCardCount,
    supplies,
    isTurn: Boolean(seat.turn),
  };
}

/**
 * Seats for games that only define private hands (`ownerSeat` on hand holders) and no seat
 * widgets, so pass and play can switch between them. One seat per owner, `index` = `ownerSeat`
 * and `hand` = the holder; nothing is returned once the game has seats.
 */
export function seatsForHands(widgets: Record<string, TabletopWidget>): SeatWidget[] {
  if (getSeatWidgets(widgets).length > 0) return [];
  const byOwner = new Map<number, HolderWidget>();
  for (const w of Object.values(widgets)) {
    if (
      w.type === 'holder' &&
      isHandHolderWidget(w) &&
      typeof w.ownerSeat === 'number' &&
      !byOwner.has(w.ownerSeat)
    ) {
      byOwner.set(w.ownerSeat, w as HolderWidget);
    }
  }
  return [...byOwner.entries()]
    .sort(([a], [b]) => a - b)
    .map(([ownerSeat, hand]) => ({
      id: `seat_auto_${ownerSeat}`,
      type: 'seat' as const,
      index: ownerSeat,
      color: DEFAULT_SEAT_COLORS[ownerSeat + 1] || '#dc2626',
      label: hand.label || `Spieler ${ownerSeat + 1}`,
      hand: hand.id,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      zIndex: 0,
    }));
}

/** `currentSeatId` of a viewer without a seat: sees the table, has no hand, cannot draw. */
export const SPECTATOR_SEAT_ID = 'spectator';

export function isSpectatorSeat(seatId: string | undefined | null): boolean {
  return seatId === SPECTATOR_SEAT_ID;
}

export interface SeatView {
  /** The viewer's seat; the first seat while none was chosen; undefined for spectators. */
  activeSeat?: SeatWidget;
  isSpectator: boolean;
  /** Hand the viewer draws into and sees in the dock; undefined for spectators. */
  handHolder?: HolderWidget;
}

/**
 * Seat and hand of the viewer. The table surface and the hand dock both use it, so a tap on
 * the deck and the dock always agree on the hand — also for seat index 0 before any seat
 * was picked. A seat's own `hand` link wins over the owner/index heuristics.
 */
export function resolveSeatView(
  widgets: Record<string, TabletopWidget>,
  currentSeatId: string | undefined,
): SeatView {
  if (isSpectatorSeat(currentSeatId)) return { isSpectator: true };
  const chosen = currentSeatId ? widgets[currentSeatId] : undefined;
  const activeSeat = chosen?.type === 'seat' ? (chosen as SeatWidget) : getSeatWidgets(widgets)[0];
  const linked = activeSeat?.hand ? widgets[activeSeat.hand] : undefined;
  const handHolder =
    linked?.type === 'holder'
      ? (linked as HolderWidget)
      : findPlayerHandHolder(widgets, activeSeat?.index);
  return { activeSeat, isSpectator: false, handHolder };
}
