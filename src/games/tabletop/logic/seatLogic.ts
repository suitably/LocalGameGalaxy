/**
 * Tabletop seat and player logic [ID: LOGIC-TABLETOP-SEAT]
 */
import type { TabletopWidget, SeatWidget, TokenWidget, HolderWidget, CardWidget } from './types';

export const DEFAULT_SEAT_COLORS: Record<number, string> = {
  1: '#dc2626', // Red
  2: '#2563eb', // Blue
  3: '#f8fafc', // White
  4: '#ea580c', // Orange
  5: '#16a34a', // Green
  6: '#854d0e', // Brown
  7: '#9333ea', // Purple
  8: '#eab308', // Yellow
};

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
  if (idLower.includes('white') || labelLower.includes('white') || idLower.includes('weiß')) return '#f8fafc';
  if (idLower.includes('black') || labelLower.includes('black') || idLower.includes('schwarz')) return '#1e293b';
  if (idLower.includes('red') || labelLower.includes('red') || idLower.includes('rot')) return '#dc2626';
  if (idLower.includes('blue') || labelLower.includes('blue') || idLower.includes('blau')) return '#2563eb';
  if (idLower.includes('orange')) return '#ea580c';
  if (idLower.includes('green') || labelLower.includes('grün')) return '#16a34a';

  return DEFAULT_SEAT_COLORS[seat.index] || '#3b82f6';
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
      (w.id.toLowerCase().startsWith(playerPrefix) || w.ownerSeat === seatIndex - 1 || w.ownerSeat === seatIndex),
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
    const parentMatches = typeof w.parent === 'string' && w.parent.toLowerCase().startsWith(playerPrefix);
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
      (w.isHand || w.id.toLowerCase().includes('hand')) &&
      (w.ownerSeat === seatIndex - 1 || w.ownerSeat === seatIndex || w.id.toLowerCase().includes(playerPrefix)),
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
