/**
 * Tabletop Game Validator & Sanitizer [ID: GAME-TABLETOP-VALIDATOR]
 */
import {
  HEX_CLIP_PATH,
  type TabletopGameDefinition,
  type TabletopWidget,
  type TabletopPlayMode,
  type TabletopTableConfig,
  type HolderWidget,
  type TokenWidget,
  type CardWidget,
  type DeckWidget,
} from './types';
import { isHandHolder, isSupplyReserveHolder } from './boardFilter';

export type RawTabletopGameInput = TabletopGameDefinition | (Partial<Omit<TabletopGameDefinition, 'widgets' | 'table' | 'version'>> & {
  version?: string | number;
  widgets?: Record<string, Partial<TabletopWidget> | Record<string, unknown>>;
  table?: Partial<TabletopTableConfig>;
  [key: string]: unknown;
});

export function sanitizeGameSlug(name: string): string {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base || `game-${Date.now()}`;
}

export function sanitizeLegacyUrl(url?: string): string | undefined {
  if (!url) return undefined;
  return url
    .replace(/^https?:\/\/cloud-\d+\.steamusercontent\.com\//i, 'https://steamusercontent-a.akamaihd.net/')
    .replace(/^http:\/\/steamusercontent-a\.akamaihd\.net\//i, 'https://steamusercontent-a.akamaihd.net/')
    .replace(/^http:\/\/steamuserimages-a\.akamaihd\.net\//i, 'https://steamuserimages-a.akamaihd.net/');
}

export function validateAndSanitizeGame(raw: RawTabletopGameInput): TabletopGameDefinition {
  const name = (raw.name || 'Unbenanntes Spiel').trim();
  const id = (raw.id || sanitizeGameSlug(name)).trim();

  const minPlayers = Math.max(1, typeof raw.minPlayers === 'number' ? raw.minPlayers : 1);
  const maxPlayers = Math.max(minPlayers, typeof raw.maxPlayers === 'number' ? raw.maxPlayers : 6);

  const rawWidgets = raw.widgets && typeof raw.widgets === 'object' ? raw.widgets : {};
  const cleanWidgets: Record<string, TabletopWidget> = {};

  let hasHands = false;

  for (const [wId, w] of Object.entries(rawWidgets)) {
    if (!w || typeof w !== 'object') continue;
    const wObj = w as Record<string, unknown>;
    const widgetId = String(wObj.id || wId).trim();
    if (!widgetId) continue;

    const base = {
      id: widgetId,
      type: w.type || 'card',
      x: typeof w.x === 'number' ? w.x : 0,
      y: typeof w.y === 'number' ? w.y : 0,
      width: typeof w.width === 'number' && w.width > 0 ? w.width : 80,
      height: typeof w.height === 'number' && w.height > 0 ? w.height : 120,
      zIndex: typeof w.zIndex === 'number' ? w.zIndex : 1,
      ownerSeat: typeof w.ownerSeat === 'number' ? w.ownerSeat : undefined,
      pinned: Boolean(w.pinned),
      label: typeof w.label === 'string' ? w.label : undefined,
    };

    if (w.type === 'holder') {
      const holderWidget = { id: widgetId, ...w } as HolderWidget;
      if (holderWidget.isHand || typeof holderWidget.ownerSeat === 'number' || isHandHolder(holderWidget)) {
        hasHands = true;
      }
      if (isHandHolder(holderWidget) || isSupplyReserveHolder(holderWidget)) {
        base.x = -99999;
        base.y = -99999;
      }
    }

    if (w.type === 'deck') {
      let deckFaceUp = false;
      if (w.faceUp !== undefined) {
        deckFaceUp = Boolean(w.faceUp);
      } else if (w.activeFace !== undefined) {
        deckFaceUp = Number(w.activeFace) > 0;
      }
      (base as Record<string, unknown>).faceUp = deckFaceUp;
      (base as Record<string, unknown>).activeFace = deckFaceUp ? 1 : 0;
    }

    const widgetCopy = { ...w, ...base } as Record<string, unknown>;
    if (typeof widgetCopy.image === 'string') {
      widgetCopy.image = sanitizeLegacyUrl(widgetCopy.image);
    }
    if (widgetCopy.type === 'card' && widgetCopy.frontContent && typeof widgetCopy.frontContent === 'object') {
      const fc = widgetCopy.frontContent as Record<string, unknown>;
      if (typeof fc.value === 'string') fc.value = sanitizeLegacyUrl(fc.value);
      if (fc.spriteSheet && typeof fc.spriteSheet === 'object') {
        const ss = fc.spriteSheet as Record<string, unknown>;
        if (typeof ss.url === 'string') ss.url = sanitizeLegacyUrl(ss.url);
      }
    }
    if (widgetCopy.type === 'card' && widgetCopy.backContent && typeof widgetCopy.backContent === 'object') {
      const bc = widgetCopy.backContent as Record<string, unknown>;
      if (typeof bc.value === 'string') bc.value = sanitizeLegacyUrl(bc.value);
      if (bc.spriteSheet && typeof bc.spriteSheet === 'object') {
        const ss = bc.spriteSheet as Record<string, unknown>;
        if (typeof ss.url === 'string') ss.url = sanitizeLegacyUrl(ss.url);
      }
    }
    if (widgetCopy.type === 'deck' && widgetCopy.backContent && typeof widgetCopy.backContent === 'object') {
      const bc = widgetCopy.backContent as Record<string, unknown>;
      if (typeof bc.value === 'string') bc.value = sanitizeLegacyUrl(bc.value);
    }

    // Suppress raw generic names from tokens
    if (widgetCopy.type === 'token' && typeof widgetCopy.label === 'string') {
      if (widgetCopy.label.startsWith('backgammon_piece') || widgetCopy.label.startsWith('PiecePack')) {
        widgetCopy.label = undefined;
      }
    }

    // Normalization for hex cards/decks
    const fcVal = typeof (widgetCopy.frontContent as Record<string, unknown> | undefined)?.value === 'string'
      ? ((widgetCopy.frontContent as Record<string, unknown>).value as string)
      : '';
    const bcVal = typeof (widgetCopy.backContent as Record<string, unknown> | undefined)?.value === 'string'
      ? ((widgetCopy.backContent as Record<string, unknown>).value as string)
      : '';

    const isHexCardOrDeck =
      (widgetCopy.type === 'card' || widgetCopy.type === 'deck') &&
      (fcVal.includes('B8E2540B64D0AA1B8ED447707E09019A07CFDA6A') ||
       bcVal.includes('B3D051B76921548648B589CF8A62585AE37116D0') ||
       widgetCopy.clipPath === HEX_CLIP_PATH ||
       (widgetCopy.width === 210 && widgetCopy.height === 182));

    if (isHexCardOrDeck) {
      widgetCopy.width = 210;
      widgetCopy.height = 182;
      widgetCopy.clipPath = HEX_CLIP_PATH;
    }

    cleanWidgets[widgetId] = widgetCopy as unknown as TabletopWidget;
  }

  const HEX_BACK_URL = 'https://steamusercontent-a.akamaihd.net/ugc/1752432457657319703/B3D051B76921548648B589CF8A62585AE37116D0/';

  // Pass 2: Ensure any deck that contains hex cards is also hex-shaped, has 210x182, and has the hex back image
  for (const w of Object.values(cleanWidgets)) {
    if (w.type === 'deck') {
      const deck = w as DeckWidget;
      const containsHexCards = deck.cardIds?.some((cId) => {
        const c = cleanWidgets[cId] as CardWidget | undefined;
        return c && (c.clipPath === HEX_CLIP_PATH || c.width === 210);
      });
      const isRickAndMortyHexDeck = containsHexCards || (
        typeof deck.backContent?.value === 'string' && deck.backContent.value.includes('B3D051B76921548648B589CF8A62585AE37116D0')
      );

      if (isRickAndMortyHexDeck) {
        deck.width = 210;
        deck.height = 182;
        deck.clipPath = HEX_CLIP_PATH;
        deck.backContent = { type: 'image', value: HEX_BACK_URL };
        if (deck.cardIds) {
          for (const cId of deck.cardIds) {
            const childCard = cleanWidgets[cId] as CardWidget | undefined;
            if (childCard) {
              childCard.width = 210;
              childCard.height = 182;
              childCard.clipPath = HEX_CLIP_PATH;
              childCard.backContent = { type: 'image', value: HEX_BACK_URL };
            }
          }
        }
      }
    }
  }

  // Pass 3: Ensure any standalone hex card (or card referencing a hex deck) is also 210x182 and has the hex back
  for (const w of Object.values(cleanWidgets)) {
    if (w.type === 'card') {
      const card = w as CardWidget;
      const isHexCard =
        card.clipPath === HEX_CLIP_PATH ||
        card.width === 210 ||
        (typeof card.frontContent?.value === 'string' && card.frontContent.value.includes('B8E2540B64D0AA1B8ED447707E09019A07CFDA6A')) ||
        (typeof card.backContent?.value === 'string' && card.backContent.value.includes('B3D051B76921548648B589CF8A62585AE37116D0')) ||
        (card.deckId && cleanWidgets[card.deckId]?.clipPath === HEX_CLIP_PATH);

      if (isHexCard) {
        card.width = 210;
        card.height = 182;
        card.clipPath = HEX_CLIP_PATH;
        card.backContent = { type: 'image', value: HEX_BACK_URL };
      }
    }
  }

  // Determine default supportedModes if not supplied
  const supportedModes: TabletopPlayMode[] = Array.isArray(raw.supportedModes) ? [...raw.supportedModes] : [];
  if (supportedModes.length === 0) {
    if (hasHands || maxPlayers > 1) {
      supportedModes.push('party_multi_device');
    }
    if (minPlayers === 1) {
      supportedModes.push('solo');
    }
    supportedModes.push('local_pass_and_play');
  }

  let rawBg = raw.table?.backgroundImageUrl || ((raw.table as Record<string, unknown> | undefined)?.background as string | undefined);

  // If a TTS game previously had its board mapped to table.backgroundImageUrl,
  // migrate it to a proper centered board TokenWidget.
  const hasBoardWidget = Object.values(cleanWidgets).some(
    (w) => w.type === 'token' && (w as TokenWidget).shape === 'rectangle' && (w.width >= 500 || w.height >= 500)
  );

  const isTtsBoardBg = Boolean(
    rawBg &&
    !hasBoardWidget &&
    (raw.author === 'Steam Workshop' ||
     rawBg.includes('steamusercontent') ||
     rawBg.includes('steamuserimages') ||
     rawBg.includes('akamaihd.net'))
  );

  if (isTtsBoardBg && rawBg) {
    const tableW = raw.table?.width && raw.table.width > 200 ? raw.table.width : 1600;
    const tableH = raw.table?.height && raw.table.height > 200 ? raw.table.height : 1000;
    const boardW = 1275;
    const boardH = 1225;
    const boardId = 'migrated_board';
    const boardWidget: TokenWidget = {
      id: boardId,
      type: 'token',
      shape: 'rectangle',
      x: Math.round((tableW - boardW) / 2),
      y: Math.round((tableH - boardH) / 2),
      width: boardW,
      height: boardH,
      zIndex: 0,
      label: 'Spielbrett',
      image: sanitizeLegacyUrl(rawBg),
      movable: false,
      pinned: true,
    };
    cleanWidgets[boardId] = boardWidget;
    rawBg = undefined;
  }

  // Generate snap holders for Rick and Morty board if not already present
  const boardWidget = Object.values(cleanWidgets).find(
    (w) => w.type === 'token' && (w as TokenWidget).shape === 'rectangle' && (w.width >= 500 || w.height >= 500)
  ) as TokenWidget | undefined;

  // Corrected snap offsets derived from pixel analysis of the board image (4CA2BC0...).
  // Each entry is the (dx,dy) offset from board center to the visual hex-field center.
  // Order matches the 6 TTS AttachedSnapPoints after their 180° rotY correction:
  //   [0]=bottom-left  [1]=bottom  [2]=bottom-right  [3]=top-right  [4]=top  [5]=top-left
  const RM_SNAP_OFFSETS = [
    { dx: -341, dy:  179 },  // 0: bottom-left
    { dx:    0, dy:  390 },  // 1: bottom
    { dx:  341, dy:  179 },  // 2: bottom-right
    { dx:  341, dy: -179 },  // 3: top-right
    { dx:    0, dy: -390 },  // 4: top
    { dx: -341, dy: -179 },  // 5: top-left
  ] as const;
  const RM_SNAP_W = 210;
  const RM_SNAP_H = 182;

  const hasSnapHolders = Object.keys(cleanWidgets).some((wId) => wId.startsWith('snap_'));

  const isRickAndMorty = Boolean(
    boardWidget?.image &&
    (boardWidget.image.includes('4CA2BC0FD0D8483D003FC39203118B9C5B3A5A88') ||
     name.toLowerCase().includes('rick and morty') ||
     name.toLowerCase().includes('rick & morty'))
  );

  // Migrate existing saves that have snap holders at the OLD (wrong) positions,
  // and update any cards that are already snapped inside them.
  if (boardWidget && hasSnapHolders && isRickAndMorty) {
    const boardCenterX = boardWidget.x + Math.round(boardWidget.width / 2);
    const boardCenterY = boardWidget.y + Math.round(boardWidget.height / 2);
    RM_SNAP_OFFSETS.forEach((offset, idx) => {
      const hId = `snap_${boardWidget.id}_${idx}`;
      const holder = cleanWidgets[hId] as HolderWidget | undefined;
      if (holder) {
        const correctX = Math.round(boardCenterX + offset.dx - RM_SNAP_W / 2);
        const correctY = Math.round(boardCenterY + offset.dy - RM_SNAP_H / 2);
        cleanWidgets[hId] = { ...holder, x: correctX, y: correctY, width: RM_SNAP_W, height: RM_SNAP_H };
        if (holder.childIds && holder.childIds.length > 0) {
          holder.childIds.forEach((cId) => {
            const child = cleanWidgets[cId];
            if (child) {
              cleanWidgets[cId] = {
                ...child,
                x: Math.round(correctX + (RM_SNAP_W - (child.width || RM_SNAP_W)) / 2),
                y: Math.round(correctY + (RM_SNAP_H - (child.height || RM_SNAP_H)) / 2),
              };
            }
          });
        }
      }
    });
  }

  // Scale up undersized elements for Rick & Morty so they match the large 1275x1225 board
  if (isRickAndMorty) {
    for (const [wId, w] of Object.entries(cleanWidgets)) {
      if (w.type === 'card' && (w as CardWidget).clipPath !== HEX_CLIP_PATH && (w as CardWidget).width <= 85) {
        cleanWidgets[wId] = { ...w, width: 125, height: 175 };
      } else if (w.type === 'deck' && (w as DeckWidget).clipPath !== HEX_CLIP_PATH && (w as DeckWidget).width <= 85) {
        cleanWidgets[wId] = { ...w, width: 125, height: 175 };
      } else if (w.type === 'die' && (w.width <= 56 || w.height <= 56)) {
        cleanWidgets[wId] = { ...w, width: 72, height: 72 };
      } else if (w.type === 'token' && w.id !== boardWidget?.id && (w.width <= 55 && w.height <= 55)) {
        cleanWidgets[wId] = { ...w, width: Math.round(w.width * 1.5), height: Math.round(w.height * 1.5) };
      }
    }
  }

  if (boardWidget && !hasSnapHolders && isRickAndMorty) {
    const boardCenterX = boardWidget.x + Math.round(boardWidget.width / 2);
    const boardCenterY = boardWidget.y + Math.round(boardWidget.height / 2);
    const snapOffsets = RM_SNAP_OFFSETS;
    const snapW = RM_SNAP_W;
    const snapH = RM_SNAP_H;

    snapOffsets.forEach((offset, idx) => {
      const hId = `snap_${boardWidget.id}_${idx}`;
      cleanWidgets[hId] = {
        id: hId,
        type: 'holder',
        x: Math.round(boardCenterX + offset.dx - snapW / 2),
        y: Math.round(boardCenterY + offset.dy - snapH / 2),
        width: snapW,
        height: snapH,
        zIndex: (boardWidget.zIndex || 0) + 1,
        label: 'Feldkarten',
        dropTargetTypes: ['card', 'token'],
        childIds: [],
        layout: 'stack',
        dropTarget: true,
        pinned: true,
        movable: false,
        clipPath: HEX_CLIP_PATH,
        customCss: 'transparent',
      } as HolderWidget;
    });
  }

  return {
    id,
    name,
    description: raw.description?.trim() || '',
    author: raw.author?.trim() || 'Community',
    version: typeof raw.version === 'string' ? raw.version.trim() || '1.0.0' : typeof raw.version === 'number' ? String(raw.version) : '1.0.0',
    minPlayers,
    maxPlayers,
    supportedModes,
    table: {
      width: raw.table?.width && raw.table.width > 200 ? raw.table.width : 1600,
      height: raw.table?.height && raw.table.height > 200 ? raw.table.height : 1000,
      backgroundColor: raw.table?.backgroundColor || '#1e3d2f', // Classic green felt
      backgroundImageUrl: sanitizeLegacyUrl(rawBg) || undefined,
      gridSnap: raw.table?.gridSnap && raw.table.gridSnap > 0 ? raw.table.gridSnap : 20,
    },
    widgets: cleanWidgets,
    assetFiles: raw.assetFiles || {},
    updatedAt: raw.updatedAt || Date.now(),
    ruleText: typeof raw.ruleText === 'string' ? raw.ruleText : undefined,
  };
}
