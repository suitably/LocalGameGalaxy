/** PlayingCards.io and VirtualTabletop widget normalization [ID: GAME-TABLETOP-NORMALIZER] */
import { normalizeVttTypedWidget } from './vttWidgets';
import type { TabletopWidget, DeckWidget } from './types';
import { resolveAssetUrl } from './pcioAssetUtils';
import { DEFAULT_SEAT_COLORS } from './seatLogic';
import {
  isWidgetHidden,
  resolveGlobalPosition,
  resolveRotation,
  resolveZIndex,
} from './pcio/pcioHelpers';
import type { PcioWidgetContext } from './pcio/pcioContext';
import { normalizePile } from './pcio/pcioPile';
import {
  normalizeDeck,
  normalizeHand,
  normalizeSeat,
  normalizeHolder,
} from './pcio/pcioContainers';
import { normalizeCard } from './pcio/pcioCard';
import { normalizeToken } from './pcio/pcioToken';

/**
 * Normalizes PlayingCards.io and VirtualTabletop widget structures into Galaxy Tabletop Widgets.
 */
export function normalizePcioWidgets(
  rawWidgets: Record<string, Record<string, unknown>>,
  assetFiles?: Record<string, string>,
): Record<string, TabletopWidget> {
  const normalized: Record<string, TabletopWidget> = {};

  // First pass: identify hidden widgets & piles
  const hiddenIds = new Set<string>();
  const pileCardMap = new Map<string, string[]>(); // pileId -> child card IDs
  const holderHasPileChild = new Set<string>();

  for (const [id, raw] of Object.entries(rawWidgets)) {
    if (!raw || typeof raw !== 'object') continue;
    if (isWidgetHidden(id, rawWidgets)) {
      hiddenIds.add(id);
      continue;
    }
    const parent = typeof raw.parent === 'string' ? raw.parent : undefined;
    if (parent && rawWidgets[parent]) {
      const parentType = String(rawWidgets[parent].type || '').toLowerCase();
      if (parentType === 'pile') {
        if (!pileCardMap.has(parent)) {
          pileCardMap.set(parent, []);
        }
        pileCardMap.get(parent)!.push(id);
      }
      if (String(raw.type || '').toLowerCase() === 'pile') {
        holderHasPileChild.add(parent);
      }
    }
  }

  // Pre-seed seat colors so that child pieces and holders inherit proper vibrant player colors
  for (const [id, raw] of Object.entries(rawWidgets)) {
    if (!raw || typeof raw !== 'object') continue;
    if (String(raw.type || '').toLowerCase() === 'seat') {
      let seatIndex = 1;
      if (typeof raw.index === 'number') seatIndex = raw.index;
      else if (typeof raw.player === 'number') seatIndex = raw.player;
      else if (typeof id === 'string' && /\d+/.test(id)) {
        seatIndex = parseInt(id.replace(/\D/g, ''), 10) || 1;
      }
      const rawColor = raw.color;
      const effectiveColor =
        typeof rawColor === 'string' && rawColor !== '#999999' && rawColor !== '#999'
          ? rawColor
          : DEFAULT_SEAT_COLORS[seatIndex] || '#dc2626';
      raw.color = effectiveColor;
      if (rawWidgets[`Player ${seatIndex}`]) {
        rawWidgets[`Player ${seatIndex}`].color = effectiveColor;
      }
    }
  }

  for (const [id, raw] of Object.entries(rawWidgets)) {
    if (!raw || typeof raw !== 'object' || hiddenIds.has(id)) continue;
    if (id === 'Background') continue;

    const rawType = String(raw.type || '').toLowerCase();
    const globalPos = resolveGlobalPosition(id, rawWidgets);
    const rotation = resolveRotation(id, rawWidgets);
    const label =
      typeof raw.label === 'string'
        ? raw.label
        : typeof raw.text === 'string'
          ? raw.text
          : undefined;
    const rawImage = (raw.image || raw.faceImage) as string | undefined;
    const resolvedImage = resolveAssetUrl(rawImage, assetFiles);

    const resolveImage = (ref: unknown) =>
      resolveAssetUrl(typeof ref === 'string' ? ref : undefined, assetFiles) ?? undefined;

    // 0. Types we have a widget for (label, button, spinner, timer, dice) keep their type
    const typed = normalizeVttTypedWidget(rawType, raw, {
      id,
      x: globalPos.x,
      y: globalPos.y,
      zIndex: resolveZIndex(raw, rawWidgets, rawType === 'dice' || rawType === 'die' ? 5 : 1),
      rotation,
      resolveImage,
    });
    if (typed) {
      normalized[id] = typed;
      continue;
    }

    const ctx: PcioWidgetContext = {
      id,
      raw,
      rawType,
      rawWidgets,
      assetFiles,
      globalPos,
      rotation,
      label,
      rawImage,
      resolvedImage,
      resolveImage,
      normalized,
      pileCardMap,
      holderHasPileChild,
    };

    // 1. Pile Widget -> Converts into a stacked DeckWidget with count badge & top card preview
    if (rawType === 'pile') {
      normalizePile(ctx);
      continue;
    }

    // 2. Deck Widget
    if (rawType.includes('deck') || rawType === 'carddeck') {
      normalizeDeck(ctx);
      continue;
    }

    // 3. Hand Widget (e.g. "Hand", "my_hand", or childrenPerOwner)
    const isHandHolder =
      rawType.includes('hand') ||
      rawType === 'cardhand' ||
      Boolean(raw.childrenPerOwner) ||
      (typeof id === 'string' &&
        (id.toLowerCase() === 'hand' ||
          id.toLowerCase().includes('_hand') ||
          id.toLowerCase().includes('hand_') ||
          id.toLowerCase().includes('- hand')));

    if (isHandHolder) {
      normalizeHand(ctx);
      continue;
    }

    // 3b. Seat Widget
    if (rawType === 'seat') {
      normalizeSeat(ctx);
      continue;
    }

    // 4. Holder Widget
    if (rawType.includes('holder') || rawType === 'zone') {
      normalizeHolder(ctx);
      continue;
    }

    // 6. Card Widget (or specialized Number Chip)
    if (rawType.includes('card') || raw.cardType || raw.deck) {
      normalizeCard(ctx);
      continue;
    }

    // 7. Generic Token or Piece (Roads, Settlements, Cities, Robber, etc.)
    normalizeToken(ctx);
  }

  // Associate cardIds with decks (only for cards not inside piles and not placed directly on the board)
  for (const [id, raw] of Object.entries(rawWidgets)) {
    if (!raw || typeof raw !== 'object' || hiddenIds.has(id)) continue;
    if (typeof raw.parent === 'string' && pileCardMap.has(raw.parent)) continue;
    if (typeof raw.x === 'number' && typeof raw.y === 'number' && !raw.parent) continue;
    if (raw.movable === false) continue;

    const deckId =
      typeof raw.deck === 'string'
        ? raw.deck
        : typeof raw.deckId === 'string'
          ? raw.deckId
          : undefined;
    if (deckId && normalized[deckId] && normalized[deckId].type === 'deck') {
      const d = normalized[deckId] as DeckWidget;
      if (!d.cardIds.includes(id)) {
        d.cardIds.push(id);
      }
    }
  }

  return normalized;
}
