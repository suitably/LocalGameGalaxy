/** Deck, hand, seat and holder widget normalization [ID: GAME-TABLETOP-NORMALIZER] */
import type { DeckWidget, HolderWidget, SeatWidget } from '../types';
import { resolveAssetUrl } from '../pcioAssetUtils';
import { DEFAULT_SEAT_COLORS } from '../seatLogic';
import { resolveInheritedProperty, resolveZIndex } from './pcioHelpers';
import type { PcioWidgetContext } from './pcioContext';

export function normalizeDeck(ctx: PcioWidgetContext): void {
  const { id, raw, rawWidgets, assetFiles, globalPos, rotation, label, normalized, pileCardMap } =
    ctx;
  const cardDefaults = raw.cardDefaults as Record<string, unknown> | undefined;
  const isMovable =
    resolveInheritedProperty(raw, 'movable', rawWidgets) ?? raw.movable ?? cardDefaults?.movable;
  const layerVal = cardDefaults?.layer ?? raw.layer;
  const isBackgroundLayer = typeof layerVal === 'number' && layerVal < 0;
  const onPileCreation = cardDefaults?.onPileCreation as Record<string, unknown> | undefined;
  const preventsPile = Boolean(
    onPileCreation && Object.keys(onPileCreation).some((k) => k.toLowerCase().startsWith('no ')),
  );

  // Skip background, immovable, or template decks (e.g. Frontiers tiles, chips, harbors)
  if (
    isMovable === false ||
    isBackgroundLayer ||
    preventsPile ||
    (pileCardMap.size > 0 && !Array.isArray(raw.cardIds))
  ) {
    return;
  }

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
    faceUp: false,
    activeFace: 0,
  } as DeckWidget;
  return;
}

export function normalizeHand(ctx: PcioWidgetContext): void {
  const { id, raw, rawWidgets, globalPos, label, normalized } = ctx;
  let seat = 0;
  if (typeof raw.seat === 'number') seat = raw.seat;
  else if (typeof raw.player === 'number') seat = raw.player > 0 ? raw.player - 1 : 0;
  else if (typeof id === 'string' && /\d+/.test(id)) {
    const num = parseInt(id.replace(/\D/g, ''), 10);
    seat = num > 0 ? num - 1 : 0;
  }
  const rawWidth = Number(resolveInheritedProperty(raw, 'width', rawWidgets)) || raw.width;
  const rawHeight = Number(resolveInheritedProperty(raw, 'height', rawWidgets)) || raw.height;
  const width = typeof rawWidth === 'number' && rawWidth > 0 ? rawWidth : 240;
  const height = typeof rawHeight === 'number' && rawHeight > 0 ? rawHeight : 140;
  const handZ = resolveZIndex(raw, rawWidgets, 10);

  normalized[id] = {
    id,
    type: 'holder',
    x: globalPos.x,
    y: globalPos.y,
    width,
    height,
    zIndex: handZ,
    label: label || 'Hand',
    dropTargetTypes: ['card'],
    childIds: Array.isArray(raw.childIds) ? (raw.childIds as string[]) : [],
    layout: 'fan',
    isHand: true,
    ownerSeat: seat,
    movable: false,
    pinned: true,
  } as HolderWidget;
  return;
}

export function normalizeSeat(ctx: PcioWidgetContext): void {
  const { id, raw, rawWidgets, globalPos, label, normalized } = ctx;
  const width = Number(resolveInheritedProperty(raw, 'width', rawWidgets)) || 150;
  const height = Number(resolveInheritedProperty(raw, 'height', rawWidgets)) || 40;
  const seatZ = resolveZIndex(raw, rawWidgets, -1);
  let seatIndex = 1;
  if (typeof raw.index === 'number') seatIndex = raw.index;
  else if (typeof raw.player === 'number') seatIndex = raw.player;
  else if (typeof id === 'string' && /\d+/.test(id)) {
    seatIndex = parseInt(id.replace(/\D/g, ''), 10) || 1;
  }

  const color = String(raw.color || DEFAULT_SEAT_COLORS[seatIndex] || '#dc2626');

  normalized[id] = {
    id,
    type: 'seat',
    index: seatIndex,
    x: globalPos.x,
    y: globalPos.y,
    width,
    height,
    zIndex: seatZ,
    label: label || id,
    color,
    player: typeof raw.player === 'string' && raw.player ? raw.player : undefined,
    hand: typeof raw.hand === 'string' ? raw.hand : undefined,
    turn: Boolean(raw.turn),
    movable: false,
    pinned: true,
  } as SeatWidget;
  return;
}

export function normalizeHolder(ctx: PcioWidgetContext): void {
  const {
    id,
    raw,
    rawWidgets,
    globalPos,
    rotation,
    label,
    resolvedImage,
    normalized,
    holderHasPileChild,
  } = ctx;
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
  return;
}
