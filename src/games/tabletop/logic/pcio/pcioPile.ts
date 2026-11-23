/** Pile widget normalization [ID: GAME-TABLETOP-NORMALIZER] */
import type { DeckWidget, FaceObject } from '../types';
import { resolveAssetUrl } from '../pcioAssetUtils';
import { resolveZIndex, parseFaceTemplateObjects } from './pcioHelpers';
import type { PcioWidgetContext } from './pcioContext';

export function normalizePile(ctx: PcioWidgetContext): void {
  const { id, raw, rawWidgets, assetFiles, globalPos, rotation, label, normalized, pileCardMap } =
    ctx;
  const childCardIds = pileCardMap.get(id) || [];
  const parentId = typeof raw.parent === 'string' ? raw.parent : undefined;
  const parentObj = parentId ? rawWidgets[parentId] : undefined;
  const width =
    typeof raw.width === 'number' && raw.width > 0
      ? raw.width
      : typeof parentObj?.width === 'number'
        ? parentObj.width
        : 80;
  const height =
    typeof raw.height === 'number' && raw.height > 0
      ? raw.height
      : typeof parentObj?.height === 'number'
        ? parentObj.height
        : 120;

  // Resolve top card face if any and inherit child Z
  let topFrontContent: { type: 'text' | 'image'; value: string } | undefined;
  let topBackContent: { type: 'text' | 'image'; value: string; color?: string } | undefined;
  let topFaceObjects: FaceObject[] | undefined;
  let topBackFaceObjects: FaceObject[] | undefined;
  let pileZ = resolveZIndex(raw, rawWidgets, 0);

  let pileFaceUp = false;
  if (raw.faceUp !== undefined) {
    pileFaceUp = Boolean(raw.faceUp);
  } else if (raw.activeFace !== undefined) {
    pileFaceUp = Number(raw.activeFace) > 0;
  }

  if (childCardIds.length > 0) {
    const topCardId = childCardIds[childCardIds.length - 1];
    const topCardRaw = rawWidgets[topCardId];
    if (topCardRaw) {
      const deckId =
        (typeof topCardRaw.deck === 'string' ? topCardRaw.deck : undefined) ||
        (typeof raw.deck === 'string' ? raw.deck : undefined) ||
        parentId;
      const deckObj = deckId
        ? (rawWidgets[deckId] as Record<string, unknown> | undefined)
        : undefined;
      const deckDefaults = deckObj?.cardDefaults as Record<string, unknown> | undefined;
      const cardTypeKey = typeof topCardRaw.cardType === 'string' ? topCardRaw.cardType : undefined;
      const cardTypeObj =
        deckObj?.cardTypes && typeof deckObj.cardTypes === 'object' && cardTypeKey
          ? (deckObj.cardTypes as Record<string, Record<string, unknown>>)[cardTypeKey]
          : undefined;
      const cardTypeImg = cardTypeObj
        ? cardTypeObj.resource || cardTypeObj.image || cardTypeObj.face || cardTypeObj.background
        : undefined;
      const frontRaw = topCardRaw.frontImage || topCardRaw.image || cardTypeImg;
      const frontImg = resolveAssetUrl(frontRaw, assetFiles);
      if (frontImg) {
        topFrontContent = { type: 'image', value: frontImg };
      }

      let backRaw = topCardRaw.backImage || topCardRaw.back || deckObj?.backImage || deckObj?.image;
      if (!backRaw && Array.isArray(deckObj?.faceTemplates) && deckObj.faceTemplates.length > 1) {
        const t0 = deckObj.faceTemplates[0] as
          { objects?: Array<{ type?: string; value?: string }> } | undefined;
        if (Array.isArray(t0?.objects)) {
          const imgObj = t0.objects.find(
            (o) => o.type === 'image' && typeof o.value === 'string' && o.value,
          );
          if (imgObj?.value) {
            backRaw = imgObj.value;
          }
        }
      }
      const backImg = resolveAssetUrl(backRaw, assetFiles);
      if (backImg) {
        topBackContent = { type: 'image', value: backImg };
      }

      // Parse multi-layer face templates for top card preview
      const templates = deckObj?.faceTemplates as unknown[] | undefined;
      const numTemplates = Array.isArray(templates) ? templates.length : 0;
      const frontFaceIdx = numTemplates > 1 ? 1 : 0;
      const backFaceIdx = numTemplates > 1 ? 0 : -1;

      topFaceObjects = parseFaceTemplateObjects(
        frontFaceIdx,
        deckObj?.faceTemplates,
        cardTypeObj as Record<string, unknown> | undefined,
        width,
        height,
        assetFiles,
        cardTypeKey,
      );

      topBackFaceObjects =
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

      // Check if deck has a distinct card back
      const hasDistinctBack =
        Array.isArray(deckObj?.faceTemplates) &&
        deckObj.faceTemplates.length > 1 &&
        JSON.stringify(deckObj.faceTemplates[0]) !== JSON.stringify(deckObj.faceTemplates[1]);

      const combinedNames = [
        id,
        label,
        parentId,
        parentObj?.id,
        typeof parentObj?.label === 'string' ? parentObj.label : '',
        typeof parentObj?.text === 'string' ? parentObj.text : '',
        deckId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const isDiscard =
        combinedNames.includes('discard') ||
        combinedNames.includes('ablage') ||
        combinedNames.includes('waste');
      const isDrawPile =
        !isDiscard &&
        (combinedNames.includes('draw') ||
          combinedNames.includes('zieh') ||
          combinedNames.includes('deck') ||
          combinedNames.includes('talon') ||
          combinedNames.includes('stock') ||
          hasDistinctBack);

      if (raw.faceUp === undefined && raw.activeFace === undefined) {
        if (topCardRaw.faceUp !== undefined) {
          pileFaceUp = Boolean(topCardRaw.faceUp);
        } else if (topCardRaw.activeFace !== undefined) {
          pileFaceUp = Number(topCardRaw.activeFace) > 0;
        } else if (deckDefaults?.faceUp !== undefined) {
          pileFaceUp = Boolean(deckDefaults.faceUp);
        } else if (deckDefaults?.activeFace !== undefined) {
          pileFaceUp = Number(deckDefaults.activeFace) > 0;
        } else if (isDiscard) {
          pileFaceUp = true;
        } else if (isDrawPile) {
          pileFaceUp = false;
        } else {
          pileFaceUp = Boolean(frontImg || (topFaceObjects && topFaceObjects.length > 0));
        }
      }

      const defaultCardLayer = typeof deckDefaults?.layer === 'number' ? deckDefaults.layer : 4;
      const topZ = resolveZIndex(topCardRaw, rawWidgets, defaultCardLayer);
      pileZ = Math.max(pileZ, topZ);
    }
  }

  normalized[id] = {
    id,
    type: 'deck',
    x: globalPos.x,
    y: globalPos.y,
    width,
    height,
    zIndex: pileZ,
    label: label || id,
    cardIds: childCardIds,
    isPile: true,
    cardCount: childCardIds.length,
    frontContent: topFrontContent,
    backContent: topBackContent || { type: 'text', value: '🂠', color: '#1565c0' },
    rotation,
    movable: true,
    pinned: false,
    faceUp: pileFaceUp,
    activeFace: pileFaceUp ? 1 : 0,
    faceObjects: topFaceObjects,
    backFaceObjects: topBackFaceObjects,
  } as DeckWidget;
  return;
}
