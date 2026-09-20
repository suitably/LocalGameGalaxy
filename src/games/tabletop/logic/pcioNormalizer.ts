/** PlayingCards.io widget normalization [ID: GAME-TABLETOP-NORMALIZER] */
import type { TabletopWidget, CardWidget, DeckWidget, HolderWidget, DieWidget } from './types';
import { resolveAssetUrl } from './pcioAssetUtils';

/**
 * Normalizes PlayingCards.io widget structures into Galaxy Tabletop Widgets.
 */
export function normalizePcioWidgets(
  rawWidgets: Record<string, Record<string, unknown>>,
  assetFiles?: Record<string, string>,
): Record<string, TabletopWidget> {
  const normalized: Record<string, TabletopWidget> = {};

  for (const [id, raw] of Object.entries(rawWidgets)) {
    if (!raw || typeof raw !== 'object') continue;
    const rawType = String(raw.type || '').toLowerCase();
    const x = typeof raw.x === 'number' ? raw.x : 0;
    const y = typeof raw.y === 'number' ? raw.y : 0;
    const width = typeof raw.width === 'number' && raw.width > 0 ? raw.width : 80;
    const height = typeof raw.height === 'number' && raw.height > 0 ? raw.height : 120;
    const zIndex = typeof raw.zIndex === 'number' ? raw.zIndex : (typeof raw.z === 'number' ? raw.z : 1);
    const label = typeof raw.label === 'string' ? raw.label : (typeof raw.text === 'string' ? raw.text : undefined);

    if (rawType.includes('deck') || rawType === 'carddeck') {
      const cardIds = Array.isArray(raw.cardIds) ? (raw.cardIds as string[]) : [];
      const deckBackImg = resolveAssetUrl(raw.backImage || raw.image || raw.back, assetFiles);
      normalized[id] = {
        id,
        type: 'deck',
        x,
        y,
        width,
        height,
        zIndex,
        label: label || id || 'Ziehstapel',
        cardIds,
        backContent: deckBackImg
          ? { type: 'image', value: deckBackImg }
          : { type: 'text', value: '🂠', color: '#1565c0' },
      } as DeckWidget;
    } else if (rawType.includes('hand') || rawType === 'cardhand') {
      const seat = typeof raw.seat === 'number' ? raw.seat : (typeof raw.player === 'number' ? raw.player : 0);
      normalized[id] = {
        id,
        type: 'holder',
        x,
        y,
        width: Math.max(width, 240),
        height: Math.max(height, 140),
        zIndex,
        label: label || `Hand Spieler ${seat + 1}`,
        dropTargetTypes: ['card'],
        childIds: Array.isArray(raw.childIds) ? (raw.childIds as string[]) : [],
        layout: 'fan',
        isHand: true,
        ownerSeat: seat,
      } as HolderWidget;
    } else if (rawType.includes('holder') || rawType === 'zone' || rawType.includes('pile') || rawType === 'seat') {
      normalized[id] = {
        id,
        type: 'holder',
        x,
        y,
        width,
        height,
        zIndex,
        label: label || id || 'Ablage',
        dropTargetTypes: ['card', 'token'],
        childIds: Array.isArray(raw.childIds) ? (raw.childIds as string[]) : [],
        layout: 'stack',
        dropTarget: true,
      } as HolderWidget;
    } else if (rawType === 'dice' || rawType === 'die') {
      normalized[id] = {
        id,
        type: 'die',
        x,
        y,
        width: Math.max(width, 48),
        height: Math.max(height, 48),
        zIndex,
        label,
        currentValue: typeof raw.value === 'number' ? raw.value : 1,
        sides: typeof raw.sides === 'number' ? raw.sides : 6,
        color: typeof raw.color === 'string' ? raw.color : '#ffffff',
      } as DieWidget;
    } else if (rawType.includes('card') || raw.cardType || raw.deck) {
      const deckId = typeof raw.deck === 'string' ? raw.deck : (typeof raw.deckId === 'string' ? raw.deckId : undefined);
      const deckObj = deckId ? (rawWidgets[deckId] as Record<string, unknown> | undefined) : undefined;
      const cardTypeKey = typeof raw.cardType === 'string' ? raw.cardType : undefined;
      const cardTypeObj = deckObj?.cardTypes && typeof deckObj.cardTypes === 'object' && cardTypeKey
        ? (deckObj.cardTypes as Record<string, Record<string, unknown>>)[cardTypeKey]
        : undefined;

      const cardTypeImg = cardTypeObj
        ? (cardTypeObj.image || cardTypeObj.resource || cardTypeObj.face || cardTypeObj.background)
        : undefined;

      const frontRaw = raw.frontImage || raw.image || raw.faceImage || raw.front || raw.face || cardTypeImg;
      const frontImg = resolveAssetUrl(frontRaw, assetFiles);
      const backRaw = raw.backImage || raw.back || deckObj?.backImage || deckObj?.image;
      const backImg = resolveAssetUrl(backRaw, assetFiles);

      const cardLabel = label || (cardTypeObj?.text as string) || (cardTypeObj?.number ? String(cardTypeObj.number) : undefined) || cardTypeKey || 'Karte';

      normalized[id] = {
        id,
        type: 'card',
        x,
        y,
        width,
        height,
        zIndex,
        label: cardLabel,
        deckId,
        frontContent: frontImg
          ? { type: 'image', value: frontImg }
          : {
              type: typeof raw.frontImage === 'string' ? 'image' : 'text',
              value: String(frontRaw || cardLabel),
            },
        backContent: backImg
          ? { type: 'image', value: backImg }
          : {
              type: typeof raw.backImage === 'string' ? 'image' : 'text',
              value: String(raw.backImage || '🂠'),
              color: '#1565c0',
            },
        faceUp: raw.faceUp !== false,
        rotation: typeof raw.rotation === 'number' ? raw.rotation : 0,
      } as CardWidget;
    } else {
      normalized[id] = {
        id,
        type: 'token',
        x,
        y,
        width,
        height,
        zIndex,
        label: label || id,
        color: typeof raw.color === 'string' ? raw.color : '#ffb300',
        shape: 'circle',
      };
    }
  }

  // Associate cardIds with decks and childIds with parents/holders
  for (const [id, raw] of Object.entries(rawWidgets)) {
    if (!raw || typeof raw !== 'object') continue;
    const deckId = typeof raw.deck === 'string' ? raw.deck : (typeof raw.deckId === 'string' ? raw.deckId : undefined);
    if (deckId && normalized[deckId] && normalized[deckId].type === 'deck') {
      const d = normalized[deckId] as DeckWidget;
      if (!d.cardIds.includes(id)) {
        d.cardIds.push(id);
      }
    }

    const parentId = typeof raw.parent === 'string' ? raw.parent : undefined;
    if (parentId && normalized[parentId] && normalized[parentId].type === 'holder') {
      const h = normalized[parentId] as HolderWidget;
      if (!h.childIds.includes(id)) {
        h.childIds.push(id);
      }
      if (normalized[id] && normalized[id].x === 0 && normalized[id].y === 0) {
        normalized[id].x = h.x;
        normalized[id].y = h.y;
      }
    }
  }

  return normalized;
}
