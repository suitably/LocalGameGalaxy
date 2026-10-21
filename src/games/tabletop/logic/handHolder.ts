/**
 * The single "is this holder a player's hand?" rule [ID: LOGIC-HAND-HOLDER]
 *
 * A hand is a seat's private holder (fanned, shown in the hand dock, hidden from the table).
 * Being a hand is data: `isHand` (+ `ownerSeat` for the owner). Imports set it explicitly
 * (`pcioNormalizer.ts`); games without the flag are classified once on load by
 * `normalizeHandHolders()`. Seat-owned *public* areas ("player area", "Spielerbereich",
 * bare `ownerSeat`) are not hands — see `isSeatArea()` in `boardFilter.ts`.
 */
import type { HolderWidget, TabletopGameDefinition, TabletopWidget } from './types';

type HolderLike = Partial<Pick<HolderWidget, 'id' | 'isHand' | 'label'>>;

/** Legacy naming heuristics for holders that carry no `isHand` flag. */
export function looksLikeHandHolder(holder: HolderLike): boolean {
  const id = (holder.id || '').toLowerCase();
  const label = (holder.label || '').toLowerCase();
  return (
    id === 'hand' ||
    id.endsWith('hand') ||
    id.includes('_hand') ||
    id.includes('hand_') ||
    id.includes('- hand') ||
    /(player|spieler) \d+.*hand/.test(id) ||
    label.includes('hand')
  );
}

/** Canonical predicate: an explicit `isHand` wins; otherwise the legacy heuristics apply. */
export function isHandHolder(holder: HolderLike): boolean {
  return holder.isHand ?? looksLikeHandHolder(holder);
}

/** Widget-level variant for call sites that iterate over all widgets. */
export function isHandHolderWidget(widget: { type: string } & HolderLike): boolean {
  return widget.type === 'holder' && isHandHolder(widget);
}

/**
 * Writes the classification into every holder that has no `isHand` flag yet, so the state
 * (and everything synced from it) carries explicit data. Returns the input when nothing changes.
 */
export function normalizeHandHolders(game: TabletopGameDefinition): TabletopGameDefinition {
  let widgets: Record<string, TabletopWidget> | null = null;
  for (const [id, widget] of Object.entries(game.widgets)) {
    if (widget.type !== 'holder' || (widget as HolderWidget).isHand !== undefined) continue;
    widgets ??= { ...game.widgets };
    widgets[id] = {
      ...widget,
      isHand: looksLikeHandHolder(widget as HolderWidget),
    } as HolderWidget;
  }
  return widgets ? { ...game, widgets } : game;
}
