/** Generic token / piece widget normalization [ID: GAME-TABLETOP-NORMALIZER] */
import type { GridSnapDef, TokenWidget } from '../types';
import { resolveAssetUrl } from '../pcioAssetUtils';
import { DEFAULT_SEAT_COLORS } from '../seatLogic';
import { vttFacesToStates } from '../vttWidgets';
import { resolveInheritedProperty, resolveZIndex } from './pcioHelpers';
import type { PcioWidgetContext } from './pcioContext';

export function normalizeToken(ctx: PcioWidgetContext): void {
  const {
    id,
    raw,
    rawWidgets,
    assetFiles,
    globalPos,
    rotation,
    label,
    rawImage,
    resolveImage,
    normalized,
  } = ctx;
  const width = Number(resolveInheritedProperty(raw, 'width', rawWidgets)) || 40;
  const height = Number(resolveInheritedProperty(raw, 'height', rawWidgets)) || 40;
  let tokenColor = String(resolveInheritedProperty(raw, 'color', rawWidgets) || '');
  let ownerSeat: number | undefined;

  const pidMatch = String(raw.parent || id).match(/Player\s*(\d+)/i);
  if (pidMatch) {
    ownerSeat = parseInt(pidMatch[1], 10);
    if (!tokenColor || tokenColor === '#ffb300' || tokenColor === 'undefined') {
      tokenColor = DEFAULT_SEAT_COLORS[ownerSeat] || '#ffb300';
    }
  } else if (!tokenColor || tokenColor === 'undefined') {
    tokenColor = '#ffb300';
  }

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
    image: tokenImage,
    shape: 'square',
    rotation,
    movable: isMovable,
    pinned: !isMovable,
    ownerSeat,
    parent: typeof raw.parent === 'string' ? raw.parent : undefined,
    grid: Array.isArray(grid) ? (grid as GridSnapDef[]) : undefined,
    ...vttFacesToStates(raw, resolveImage),
  } as TokenWidget;
}
