/** TTS card and deck conversion [ID: GAME-TABLETOP-TTS-PARSER] */
import type { TTSObjectState, TTSCustomDeckEntry } from '../ttsTypes';
import type { CardWidget, DeckWidget, CardContent, TabletopWidget } from '../types';
import { cardOrientation, claimId } from '../ttsFidelity';
import { resolveCardSprite, resolveBackSprite } from '../ttsSpritesheet';
import { sanitizeTtsUrl } from './ttsUrl';
import { getCardShapeAndSize, topLeft } from './ttsGeometry';

export function buildCardFrontContent(
  cardId: number,
  customDecks: Record<string, TTSCustomDeckEntry>,
): CardContent {
  const sprite = resolveCardSprite(cardId, customDecks);
  if (!sprite) return { type: 'text', value: '🂠' };
  return {
    type: 'image',
    value: sprite.url,
    spriteSheet: {
      url: sprite.url,
      col: sprite.col,
      row: sprite.row,
      numWidth: sprite.numWidth,
      numHeight: sprite.numHeight,
    },
  };
}

export function buildCardBackContent(
  cardId: number,
  customDecks: Record<string, TTSCustomDeckEntry>,
): CardContent {
  // Try UniqueBack first
  const backSprite = resolveBackSprite(cardId, customDecks);
  if (backSprite) {
    return {
      type: 'image',
      value: backSprite.url,
      spriteSheet: {
        url: backSprite.url,
        col: backSprite.col,
        row: backSprite.row,
        numWidth: backSprite.numWidth,
        numHeight: backSprite.numHeight,
      },
    };
  }
  // Shared back
  const deckIndex = Math.floor(cardId / 100);
  const deck = customDecks[String(deckIndex)];
  if (deck?.BackURL) {
    return { type: 'image', value: deck.BackURL };
  }
  return { type: 'text', value: '🂠', color: '#1565c0' };
}

// ─── Object Converters ───────────────────────────────────────────────

let widgetIdCounter = 0;

/** Restarts the per-import widget id counter (called once per parse). */
export function resetWidgetIdCounter(): void {
  widgetIdCounter = 0;
}

export function nextId(prefix: string): string {
  return `${prefix}_${++widgetIdCounter}`;
}

export function sanitizeCustomDecks(
  decks?: Record<string, TTSCustomDeckEntry>,
): Record<string, TTSCustomDeckEntry> {
  if (!decks) return {};
  const res: Record<string, TTSCustomDeckEntry> = {};
  for (const [k, d] of Object.entries(decks)) {
    res[k] = { ...d, FaceURL: sanitizeTtsUrl(d.FaceURL), BackURL: sanitizeTtsUrl(d.BackURL) };
  }
  return res;
}

export function convertCard(
  obj: TTSObjectState,
  pos: { x: number; y: number; zIndex: number },
  allCustomDecks: Record<string, TTSCustomDeckEntry>,
  deckWidgetId?: string,
): CardWidget {
  const cardId = obj.CardID ?? 0;
  const decks = { ...allCustomDecks, ...sanitizeCustomDecks(obj.CustomDeck) };
  const deckIndex = Math.floor(cardId / 100);
  const deckEntry = decks[String(deckIndex)];
  const shapeInfo = getCardShapeAndSize(deckEntry, obj.Transform);

  const { faceUp, rotation } = cardOrientation(obj.Transform);

  return {
    id: claimId(obj.GUID),
    type: 'card',
    ...topLeft(pos, shapeInfo.width, shapeInfo.height),
    width: shapeInfo.width,
    height: shapeInfo.height,
    clipPath: shapeInfo.clipPath,
    zIndex: pos.zIndex,
    label: obj.Nickname || `Card ${cardId}`,
    ...(obj.Nickname
      ? {}
      : { labelKey: 'games.tabletop.labels.card_n', labelParams: { n: cardId } }),
    deckId: deckWidgetId,
    frontContent: buildCardFrontContent(cardId, decks),
    backContent: buildCardBackContent(cardId, decks),
    faceUp,
    rotation,
    movable: !obj.Locked,
    pinned: Boolean(obj.Locked),
  };
}

export function convertDeck(
  obj: TTSObjectState,
  pos: { x: number; y: number; zIndex: number },
  allCustomDecks: Record<string, TTSCustomDeckEntry>,
  widgets: Record<string, TabletopWidget>,
): DeckWidget {
  const deckId = nextId('deck');
  const objDecks = sanitizeCustomDecks(obj.CustomDeck);
  const mergedDecks = { ...allCustomDecks, ...objDecks };

  let deckIndex: string | undefined = Object.keys(objDecks)[0];
  if (!deckIndex && obj.DeckIDs && obj.DeckIDs.length > 0) {
    deckIndex = String(Math.floor(obj.DeckIDs[0] / 100));
  } else if (
    !deckIndex &&
    obj.ContainedObjects &&
    obj.ContainedObjects.length > 0 &&
    obj.ContainedObjects[0].CardID
  ) {
    deckIndex = String(Math.floor(obj.ContainedObjects[0].CardID / 100));
  }
  const thisDeck =
    (deckIndex ? mergedDecks[deckIndex] : undefined) || Object.values(mergedDecks)[0];
  const shapeInfo = getCardShapeAndSize(thisDeck, obj.Transform);
  const cardIds: string[] = [];

  // Create cards from ContainedObjects
  if (obj.ContainedObjects && obj.ContainedObjects.length > 0) {
    for (const child of obj.ContainedObjects) {
      const card = convertCard(
        child,
        { x: pos.x, y: pos.y, zIndex: pos.zIndex + 1 },
        mergedDecks,
        deckId,
      );
      card.inPile = true;
      card.pileId = deckId;
      card.faceUp = false;
      card.rotation = 0;
      widgets[card.id] = card;
      cardIds.push(card.id);
    }
  } else if (obj.DeckIDs) {
    // Create cards from DeckIDs (no ContainedObjects)
    for (const dId of obj.DeckIDs) {
      const cId = nextId('card');
      const dIndex = Math.floor(dId / 100);
      const cardDeck = mergedDecks[String(dIndex)] || thisDeck;
      const cardShape = getCardShapeAndSize(cardDeck, obj.Transform);
      const card: CardWidget = {
        id: cId,
        type: 'card',
        ...topLeft(pos, cardShape.width, cardShape.height),
        width: cardShape.width,
        height: cardShape.height,
        clipPath: cardShape.clipPath,
        zIndex: pos.zIndex + 1,
        label: `Card ${dId}`,
        labelKey: 'games.tabletop.labels.card_n',
        labelParams: { n: dId },
        deckId,
        frontContent: buildCardFrontContent(dId, mergedDecks),
        backContent: buildCardBackContent(dId, mergedDecks),
        faceUp: false,
        rotation: 0,
        inPile: true,
        pileId: deckId,
        movable: true,
        pinned: false,
      };
      widgets[cId] = card;
      cardIds.push(cId);
    }
  }

  // Get back image from CustomDeck entry
  const backContent: CardContent = thisDeck?.BackURL
    ? { type: 'image', value: thisDeck.BackURL }
    : { type: 'text', value: '🂠', color: '#1565c0' };

  return {
    id: deckId,
    type: 'deck',
    ...topLeft(pos, shapeInfo.width, shapeInfo.height),
    width: shapeInfo.width,
    height: shapeInfo.height,
    clipPath: shapeInfo.clipPath,
    zIndex: pos.zIndex,
    label: obj.Nickname || 'Card pile',
    ...(obj.Nickname ? {} : { labelKey: 'games.tabletop.labels.card_pile' }),
    cardIds,
    backContent,
    isPile: true,
    cardCount: cardIds.length,
    movable: !obj.Locked,
    pinned: Boolean(obj.Locked),
  };
}
