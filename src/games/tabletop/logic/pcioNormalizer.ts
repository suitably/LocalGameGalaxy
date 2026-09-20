/** PlayingCards.io and VirtualTabletop widget normalization [ID: GAME-TABLETOP-NORMALIZER] */
import type {
  TabletopWidget,
  CardWidget,
  DeckWidget,
  HolderWidget,
  DieWidget,
  TokenWidget,
} from './types';
import { resolveAssetUrl } from './pcioAssetUtils';

function isWidgetHidden(
  id: string,
  rawWidgets: Record<string, Record<string, unknown>>,
  visited = new Set<string>(),
): boolean {
  if (visited.has(id)) return false;
  visited.add(id);
  const w = rawWidgets[id];
  if (!w || typeof w !== 'object') return false;
  if (w.display === false) return true;
  const parent = typeof w.parent === 'string' ? w.parent : undefined;
  if (parent && rawWidgets[parent]) {
    return isWidgetHidden(parent, rawWidgets, visited);
  }
  return false;
}

function resolveInheritedProperty(
  widget: Record<string, unknown>,
  prop: string,
  rawWidgets: Record<string, Record<string, unknown>>,
  visited = new Set<string>(),
): unknown {
  if (widget[prop] !== undefined && widget[prop] !== null) {
    return widget[prop];
  }
  const inh = widget.inheritFrom;
  if (!inh) return undefined;
  const wid = String(widget.id || '');
  if (wid && visited.has(wid)) return undefined;
  if (wid) visited.add(wid);

  if (typeof inh === 'string') {
    const target = rawWidgets[inh];
    if (target) return resolveInheritedProperty(target, prop, rawWidgets, visited);
  } else if (typeof inh === 'object' && !Array.isArray(inh)) {
    for (const [targetId, props] of Object.entries(inh as Record<string, unknown>)) {
      const target = rawWidgets[targetId];
      if (!target) continue;
      const propList = Array.isArray(props) ? (props as string[]) : [String(props)];
      const hasWildcard = propList.includes('*');
      const hasExplicit = propList.includes(prop);
      const isNegated = propList.includes('!' + prop);
      const hasAnyNegated = propList.some((p) => p.startsWith('!'));

      if (hasWildcard || hasExplicit || (hasAnyNegated && !isNegated)) {
        const val = resolveInheritedProperty(target, prop, rawWidgets, visited);
        if (val !== undefined && val !== null) return val;
      }
    }
  }
  return undefined;
}

function resolveRotation(
  id: string,
  rawWidgets: Record<string, Record<string, unknown>>,
  visited = new Set<string>(),
): number {
  if (visited.has(id)) return 0;
  visited.add(id);
  const w = rawWidgets[id];
  if (!w || typeof w !== 'object') return 0;
  const selfRot = typeof w.rotation === 'number' ? w.rotation : 0;
  const parent = typeof w.parent === 'string' ? w.parent : undefined;
  if (parent && rawWidgets[parent]) {
    return selfRot + resolveRotation(parent, rawWidgets, visited);
  }
  return selfRot;
}

function resolveGlobalPosition(
  id: string,
  rawWidgets: Record<string, Record<string, unknown>>,
  visited = new Set<string>(),
): { x: number; y: number } {
  if (visited.has(id)) return { x: 0, y: 0 };
  visited.add(id);
  const w = rawWidgets[id];
  if (!w || typeof w !== 'object') return { x: 0, y: 0 };

  const rawX = typeof w.x === 'number' ? w.x : 0;
  const rawY = typeof w.y === 'number' ? w.y : 0;
  const parent = typeof w.parent === 'string' ? w.parent : undefined;

  if (parent && rawWidgets[parent]) {
    const parentPos = resolveGlobalPosition(parent, rawWidgets, visited);
    const parentRot = resolveRotation(parent, rawWidgets, new Set());
    if (parentRot !== 0) {
      const rad = (parentRot * Math.PI) / 180;
      const rotX = rawX * Math.cos(rad) - rawY * Math.sin(rad);
      const rotY = rawX * Math.sin(rad) + rawY * Math.cos(rad);
      return { x: parentPos.x + rotX, y: parentPos.y + rotY };
    }
    return { x: parentPos.x + rawX, y: parentPos.y + rawY };
  }
  return { x: rawX, y: rawY };
}

function resolveZIndex(
  raw: Record<string, unknown>,
  rawWidgets: Record<string, Record<string, unknown>>,
  defaultLayer = 0,
): number {
  const layerVal = resolveInheritedProperty(raw, 'layer', rawWidgets);
  const layer = typeof raw.layer === 'number' ? raw.layer : (typeof layerVal === 'number' ? layerVal : defaultLayer);
  const rawZ = typeof raw.zIndex === 'number' ? raw.zIndex : (typeof raw.z === 'number' ? raw.z : 1);
  return (layer + 10) * 100000 + rawZ;
}

function extractClipPath(faceTemplates: unknown, deckId?: string): string | undefined {
  if (deckId === 'Harbors') return undefined;
  if (!Array.isArray(faceTemplates)) return undefined;
  for (const face of faceTemplates) {
    if (!face || typeof face !== 'object') continue;
    const objects = (face as { objects?: unknown[] }).objects;
    if (Array.isArray(objects)) {
      const hasUnclippedImage = objects.some((obj) => {
        const o = obj as { type?: string; css?: string; dynamicProperties?: Record<string, string> };
        const css = String(o?.css || '');
        return o?.type === 'image' && o?.dynamicProperties?.value === 'image' && !css.includes('clip-path');
      });
      if (hasUnclippedImage) return undefined;

      for (const obj of objects) {
        if (!obj || typeof obj !== 'object') continue;
        const css = String((obj as { css?: string }).css || '');
        const match = css.match(/clip-path:\s*([^;]+)/i);
        if (match) return match[1].trim();
      }
    }
  }
  return undefined;
}

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

  for (const [id, raw] of Object.entries(rawWidgets)) {
    if (!raw || typeof raw !== 'object' || hiddenIds.has(id)) continue;
    if (id === 'Background') continue;

    const rawType = String(raw.type || '').toLowerCase();
    const globalPos = resolveGlobalPosition(id, rawWidgets);
    const rotation = resolveRotation(id, rawWidgets);
    const label = typeof raw.label === 'string' ? raw.label : (typeof raw.text === 'string' ? raw.text : undefined);
    const rawImage = (raw.image || raw.faceImage) as string | undefined;
    const resolvedImage = resolveAssetUrl(rawImage, assetFiles);

    // 1. Pile Widget -> Converts into a stacked DeckWidget with count badge & top card preview
    if (rawType === 'pile') {
      const childCardIds = pileCardMap.get(id) || [];
      const parentId = typeof raw.parent === 'string' ? raw.parent : undefined;
      const parentObj = parentId ? rawWidgets[parentId] : undefined;
      const width = typeof raw.width === 'number' && raw.width > 0 ? raw.width : (typeof parentObj?.width === 'number' ? parentObj.width : 80);
      const height = typeof raw.height === 'number' && raw.height > 0 ? raw.height : (typeof parentObj?.height === 'number' ? parentObj.height : 120);

      // Resolve top card face if any and inherit child Z
      let topFrontContent: { type: 'text' | 'image'; value: string } | undefined;
      let topBackContent: { type: 'text' | 'image'; value: string; color?: string } | undefined;
      let pileZ = resolveZIndex(raw, rawWidgets, 0);

      if (childCardIds.length > 0) {
        const topCardId = childCardIds[childCardIds.length - 1];
        const topCardRaw = rawWidgets[topCardId];
        if (topCardRaw) {
          const deckId = typeof topCardRaw.deck === 'string' ? topCardRaw.deck : undefined;
          const deckObj = deckId ? rawWidgets[deckId] : undefined;
          const deckDefaults = deckObj?.cardDefaults as Record<string, unknown> | undefined;
          const cardTypeKey = typeof topCardRaw.cardType === 'string' ? topCardRaw.cardType : undefined;
          const cardTypeObj = deckObj?.cardTypes && typeof deckObj.cardTypes === 'object' && cardTypeKey
            ? (deckObj.cardTypes as Record<string, Record<string, unknown>>)[cardTypeKey]
            : undefined;
          const cardTypeImg = cardTypeObj
            ? (cardTypeObj.resource || cardTypeObj.image || cardTypeObj.face || cardTypeObj.background)
            : undefined;
          const frontRaw = topCardRaw.frontImage || topCardRaw.image || cardTypeImg;
          const frontImg = resolveAssetUrl(frontRaw, assetFiles);
          if (frontImg) {
            topFrontContent = { type: 'image', value: frontImg };
          }
          const backRaw = topCardRaw.backImage || topCardRaw.back || deckObj?.backImage || deckObj?.image;
          const backImg = resolveAssetUrl(backRaw, assetFiles);
          if (backImg) {
            topBackContent = { type: 'image', value: backImg };
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
      } as DeckWidget;
      continue;
    }

    // 2. Deck Widget
    if (rawType.includes('deck') || rawType === 'carddeck') {
      const cardIds = Array.isArray(raw.cardIds) ? (raw.cardIds as string[]) : [];
      const deckBackImg = resolveAssetUrl(raw.backImage || raw.image || raw.back, assetFiles);
      const width = typeof raw.width === 'number' && raw.width > 0 ? raw.width : 80;
      const height = typeof raw.height === 'number' && raw.height > 0 ? raw.height : 120;
      const deckZ = resolveZIndex(raw, rawWidgets, 0);
      const deckMovable = resolveInheritedProperty(raw, 'movable', rawWidgets) ?? raw.movable ?? false;

      normalized[id] = {
        id,
        type: 'deck',
        x: globalPos.x,
        y: globalPos.y,
        width,
        height,
        zIndex: deckZ,
        label: label || id || 'Ziehstapel',
        cardIds,
        backContent: deckBackImg
          ? { type: 'image', value: deckBackImg }
          : { type: 'text', value: '🂠', color: '#1565c0' },
        rotation,
        movable: Boolean(deckMovable),
        pinned: !deckMovable,
      } as DeckWidget;
      continue;
    }

    // 3. Hand Widget
    if (rawType.includes('hand') || rawType === 'cardhand') {
      const seat = typeof raw.seat === 'number' ? raw.seat : (typeof raw.player === 'number' ? raw.player : 0);
      const width = typeof raw.width === 'number' && raw.width > 0 ? raw.width : 240;
      const height = typeof raw.height === 'number' && raw.height > 0 ? raw.height : 140;
      const handZ = resolveZIndex(raw, rawWidgets, 10);

      normalized[id] = {
        id,
        type: 'holder',
        x: globalPos.x,
        y: globalPos.y,
        width,
        height,
        zIndex: handZ,
        label: label || `Hand Spieler ${seat + 1}`,
        dropTargetTypes: ['card'],
        childIds: Array.isArray(raw.childIds) ? (raw.childIds as string[]) : [],
        layout: 'fan',
        isHand: true,
        ownerSeat: seat,
        movable: false,
        pinned: true,
      } as HolderWidget;
      continue;
    }

    // 4. Holder Widget
    if (rawType.includes('holder') || rawType === 'zone' || rawType === 'seat') {
      const width = Number(resolveInheritedProperty(raw, 'width', rawWidgets)) || 80;
      const height = Number(resolveInheritedProperty(raw, 'height', rawWidgets)) || 120;
      const holderZ = resolveZIndex(raw, rawWidgets, 0);
      const rawCss = String(resolveInheritedProperty(raw, 'css', rawWidgets) || raw.css || '');

      normalized[id] = {
        id,
        type: 'holder',
        x: globalPos.x,
        y: globalPos.y,
        width,
        height,
        zIndex: holderZ,
        label: label || id || 'Ablage',
        dropTargetTypes: ['card', 'token'],
        childIds: Array.isArray(raw.childIds) ? (raw.childIds as string[]) : [],
        layout: 'stack',
        dropTarget: true,
        image: resolvedImage,
        rotation,
        movable: false,
        pinned: true,
        hasPileChild: holderHasPileChild.has(id),
        customCss: rawCss || undefined,
      } as HolderWidget;
      continue;
    }

    // 5. Dice Widget
    if (rawType === 'dice' || rawType === 'die') {
      const width = typeof raw.width === 'number' && raw.width > 0 ? raw.width : 54;
      const height = typeof raw.height === 'number' && raw.height > 0 ? raw.height : 54;
      const dieZ = resolveZIndex(raw, rawWidgets, 5);

      normalized[id] = {
        id,
        type: 'die',
        x: globalPos.x,
        y: globalPos.y,
        width,
        height,
        zIndex: dieZ,
        label,
        currentValue: typeof raw.value === 'number' ? raw.value : 1,
        sides: typeof raw.sides === 'number' ? raw.sides : 6,
        color: typeof raw.color === 'string' ? raw.color : '#ffffff',
        pipColor: typeof raw.pipColor === 'string' ? raw.pipColor : '#dc2626',
        movable: false,
        pinned: true,
      } as DieWidget;
      continue;
    }

    // 6. Card Widget (or specialized Number Chip)
    if (rawType.includes('card') || raw.cardType || raw.deck) {
      const deckId = typeof raw.deck === 'string' ? raw.deck : (typeof raw.deckId === 'string' ? raw.deckId : undefined);
      const deckObj = deckId ? (rawWidgets[deckId] as Record<string, unknown> | undefined) : undefined;
      const deckDefaults = deckObj?.cardDefaults as Record<string, unknown> | undefined;
      const cardTypeKey = typeof raw.cardType === 'string' ? raw.cardType : undefined;
      const cardTypeObj = deckObj?.cardTypes && typeof deckObj.cardTypes === 'object' && cardTypeKey
        ? (deckObj.cardTypes as Record<string, Record<string, unknown>>)[cardTypeKey]
        : undefined;
      const cardMovable = raw.movable ?? cardTypeObj?.movable ?? deckDefaults?.movable ?? true;
      const isMovable = Boolean(cardMovable);

      // Special Case: Number Chips (e.g. Catan "Chips" deck with number & probability dots)
      if (deckId === 'Chips' || (cardTypeObj && (cardTypeObj.number !== undefined || cardTypeObj.dots !== undefined))) {
        const numberVal = cardTypeObj?.number !== undefined ? String(cardTypeObj.number) : String(cardTypeKey || '');
        const dotsVal = cardTypeObj?.dots !== undefined ? String(cardTypeObj.dots) : '';
        const chipWidth = Number(raw.width ?? deckDefaults?.width) || 60;
        const chipHeight = Number(raw.height ?? deckDefaults?.height) || 60;
        const isRed = String(cardTypeObj?.css || '').includes('red') || numberVal === '6' || numberVal === '8';
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
        continue;
      }

      // Check if card belongs to a pile
      const parentId = typeof raw.parent === 'string' ? raw.parent : undefined;
      const inPile = Boolean(parentId && rawWidgets[parentId] && String(rawWidgets[parentId].type).toLowerCase() === 'pile');

      const width = Number(raw.width ?? cardTypeObj?.width ?? deckDefaults?.width) || 80;
      const height = Number(raw.height ?? cardTypeObj?.height ?? deckDefaults?.height) || 120;
      const clipPath = extractClipPath(deckObj?.faceTemplates, deckId);
      const defaultCardLayer = typeof deckDefaults?.layer === 'number' ? deckDefaults.layer : 0;
      const cardZ = resolveZIndex(raw, rawWidgets, defaultCardLayer);

      const cardTypeImg = cardTypeObj
        ? (cardTypeObj.resource || cardTypeObj.image || cardTypeObj.face || cardTypeObj.background)
        : undefined;

      const frontRaw = raw.frontImage || raw.image || raw.faceImage || raw.front || raw.face || cardTypeImg;
      const frontImg = resolveAssetUrl(frontRaw, assetFiles);
      const backRaw = raw.backImage || raw.back || deckObj?.backImage || deckObj?.image;
      const backImg = resolveAssetUrl(backRaw, assetFiles);

      const cardLabel = label || (cardTypeObj?.text as string) || cardTypeKey || 'Karte';

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
        clipPath,
        inPile,
        pileId: inPile ? parentId : undefined,
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
        rotation,
        movable: isMovable,
        pinned: !isMovable,
      } as CardWidget;
      continue;
    }

    // 7. Generic Token or Piece (Roads, Settlements, Cities, Robber, etc.)
    const width = Number(resolveInheritedProperty(raw, 'width', rawWidgets)) || 40;
    const height = Number(resolveInheritedProperty(raw, 'height', rawWidgets)) || 40;
    const tokenColor = String(resolveInheritedProperty(raw, 'color', rawWidgets) || '#ffb300');
    const tokenImage = resolveAssetUrl(
      (resolveInheritedProperty(raw, 'image', rawWidgets) || rawImage) as string | undefined,
      assetFiles,
    );
    const tokenZ = resolveZIndex(raw, rawWidgets, 2);
    const tokenMovable = resolveInheritedProperty(raw, 'movable', rawWidgets) ?? raw.movable ?? true;
    const isMovable = Boolean(tokenMovable);
    const grid = resolveInheritedProperty(raw, 'grid', rawWidgets) ?? raw.grid;

    normalized[id] = {
      id,
      type: 'token',
      x: globalPos.x,
      y: globalPos.y,
      width,
      height,
      zIndex: tokenZ,
      label: label || id,
      color: tokenColor,
      shape: 'circle',
      image: tokenImage,
      rotation,
      movable: isMovable,
      pinned: !isMovable,
      grid,
    } as TokenWidget;
  }

  // Associate cardIds with decks
  for (const [id, raw] of Object.entries(rawWidgets)) {
    if (!raw || typeof raw !== 'object' || hiddenIds.has(id)) continue;
    const deckId = typeof raw.deck === 'string' ? raw.deck : (typeof raw.deckId === 'string' ? raw.deckId : undefined);
    if (deckId && normalized[deckId] && normalized[deckId].type === 'deck') {
      const d = normalized[deckId] as DeckWidget;
      if (!d.cardIds.includes(id)) {
        d.cardIds.push(id);
      }
    }
  }

  return normalized;
}
