/** Card and number-chip widget normalization [ID: GAME-TABLETOP-NORMALIZER] */
import type { CardWidget, TokenWidget } from '../types';
import { resolveAssetUrl } from '../pcioAssetUtils';
import { extractClipPath, resolveZIndex, parseFaceTemplateObjects } from './pcioHelpers';
import type { PcioWidgetContext } from './pcioContext';

export function normalizeCard(ctx: PcioWidgetContext): void {
  const { id, raw, rawWidgets, assetFiles, globalPos, rotation, label, normalized } = ctx;
  const deckId =
    typeof raw.deck === 'string'
      ? raw.deck
      : typeof raw.deckId === 'string'
        ? raw.deckId
        : undefined;
  const deckObj = deckId ? (rawWidgets[deckId] as Record<string, unknown> | undefined) : undefined;
  const deckDefaults = deckObj?.cardDefaults as Record<string, unknown> | undefined;
  const cardTypeKey = typeof raw.cardType === 'string' ? raw.cardType : undefined;
  const cardTypeObj =
    deckObj?.cardTypes && typeof deckObj.cardTypes === 'object' && cardTypeKey
      ? (deckObj.cardTypes as Record<string, Record<string, unknown>>)[cardTypeKey]
      : undefined;
  const cardMovable = raw.movable ?? cardTypeObj?.movable ?? deckDefaults?.movable ?? true;
  const isMovable = Boolean(cardMovable);

  // Check for Generic Chips
  let isChip = false;
  if (Array.isArray(deckObj?.faceTemplates)) {
    for (const face of deckObj.faceTemplates) {
      if (face && typeof face === 'object' && 'objects' in face) {
        const objs = (face as { objects?: unknown[] }).objects;
        if (Array.isArray(objs)) {
          if (
            objs.some((o) => {
              if (!o || typeof o !== 'object') return false;
              const item = o as { type?: string; dynamicProperties?: { value?: string } };
              return item.type === 'text' && item.dynamicProperties?.value === 'number';
            })
          ) {
            isChip = true;
            break;
          }
        }
      }
    }
  }

  // Special Case: Number Chips (e.g. Catan "Chips" deck with number & probability dots)
  if (
    isChip ||
    (cardTypeObj && (cardTypeObj.number !== undefined || cardTypeObj.dots !== undefined))
  ) {
    const numberVal =
      cardTypeObj?.number !== undefined ? String(cardTypeObj.number) : String(cardTypeKey || '');
    const dotsVal = cardTypeObj?.dots !== undefined ? String(cardTypeObj.dots) : '';
    const chipWidth = Number(raw.width ?? deckDefaults?.width) || 60;
    const chipHeight = Number(raw.height ?? deckDefaults?.height) || 60;
    const isRed =
      String(cardTypeObj?.css || '').includes('red') || numberVal === '6' || numberVal === '8';
    const chipZ = resolveZIndex(raw, rawWidgets, 0);

    normalized[id] = {
      id,
      type: 'token',
      x: globalPos.x,
      y: globalPos.y,
      width: chipWidth,
      height: chipHeight,
      zIndex: Math.max(chipZ, 600000), // Number chips sit above hexes
      label: numberVal,
      subText: dotsVal,
      textColor: isRed ? '#dc2626' : '#3e2723',
      color: (deckDefaults?.background as string) || '#ECCCA0',
      shape: 'circle',
      rotation,
      movable: isMovable,
      pinned: !isMovable,
    } as TokenWidget;
    return;
  }

  // Check if card belongs to a pile
  const parentId = typeof raw.parent === 'string' ? raw.parent : undefined;
  const inPile = Boolean(
    parentId && rawWidgets[parentId] && String(rawWidgets[parentId].type).toLowerCase() === 'pile',
  );

  const width = Number(raw.width ?? cardTypeObj?.width ?? deckDefaults?.width) || 80;
  const height = Number(raw.height ?? cardTypeObj?.height ?? deckDefaults?.height) || 120;
  const clipPath = extractClipPath(deckObj?.faceTemplates);
  const defaultCardLayer = typeof deckDefaults?.layer === 'number' ? deckDefaults.layer : 0;
  const cardZ = resolveZIndex(raw, rawWidgets, defaultCardLayer);

  const cardTypeImg = cardTypeObj
    ? cardTypeObj.resource || cardTypeObj.image || cardTypeObj.face || cardTypeObj.background
    : undefined;

  const frontRaw =
    raw.frontImage || raw.image || raw.faceImage || raw.front || raw.face || cardTypeImg;
  const frontImg = resolveAssetUrl(frontRaw, assetFiles);
  const backRaw = raw.backImage || raw.back || deckObj?.backImage || deckObj?.image;
  const backImg = resolveAssetUrl(backRaw, assetFiles);

  const cardLabel = label || (cardTypeObj?.text as string) || cardTypeKey || 'Karte';

  const templates = deckObj?.faceTemplates as unknown[] | undefined;
  const numTemplates = Array.isArray(templates) ? templates.length : 0;
  const frontFaceIdx = numTemplates > 1 ? 1 : 0;
  const backFaceIdx = numTemplates > 1 ? 0 : -1;

  const faceObjects = parseFaceTemplateObjects(
    frontFaceIdx,
    deckObj?.faceTemplates,
    cardTypeObj as Record<string, unknown> | undefined,
    width,
    height,
    assetFiles,
    cardTypeKey,
  );

  const backFaceObjects =
    backFaceIdx >= 0
      ? parseFaceTemplateObjects(
          backFaceIdx,
          deckObj?.faceTemplates,
          cardTypeObj as Record<string, unknown> | undefined,
          width,
          height,
          assetFiles,
          cardTypeKey,
        )
      : undefined;

  const effectiveBackImg =
    backImg ||
    (backFaceObjects?.[0]?.value && backFaceObjects[0].type === 'image'
      ? backFaceObjects[0].value
      : undefined);

  let isFaceUp = true;
  if (raw.faceUp !== undefined) {
    isFaceUp = Boolean(raw.faceUp);
  } else if (raw.activeFace !== undefined) {
    isFaceUp = Number(raw.activeFace) > 0;
  } else if (inPile) {
    isFaceUp = false;
  }

  normalized[id] = {
    id,
    type: 'card',
    x: globalPos.x,
    y: globalPos.y,
    width,
    height,
    zIndex: cardZ,
    label: cardLabel,
    deckId,
    cardType: cardTypeKey || (raw.cardType as string) || undefined,
    clipPath,
    inPile,
    pileId: inPile ? parentId : undefined,
    frontContent: frontImg
      ? { type: 'image', value: frontImg }
      : {
          type: typeof raw.frontImage === 'string' ? 'image' : 'text',
          value: String(frontRaw || cardLabel),
        },
    backContent: effectiveBackImg
      ? { type: 'image', value: effectiveBackImg }
      : {
          type: typeof raw.backImage === 'string' ? 'image' : 'text',
          value: String(raw.backImage || '🂠'),
          color: '#1565c0',
        },
    faceUp: isFaceUp,
    activeFace: typeof raw.activeFace === 'number' ? raw.activeFace : isFaceUp ? frontFaceIdx : 0,
    faceObjects,
    backFaceObjects,
    rotation,
    movable: isMovable,
    pinned: !isMovable,
  } as CardWidget;
  return;
}
