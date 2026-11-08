/**
 * Decks to shuffle when a fresh game starts [ID: LOGIC-TABLETOP-START-SHUFFLE]
 *
 * A deck with `shuffleOnStart` is shuffled when the game is started from its original or a
 * local template; a resumed session keeps its order.
 */
import type { DeckWidget, TabletopGameDefinition } from './types';
import type { ResolvedTable } from './gameSource';

export function decksToShuffleOnStart(
  game: TabletopGameDefinition,
  startedFrom: ResolvedTable['startedFrom'],
): string[] {
  if (startedFrom === 'session') return [];
  return Object.values(game.widgets)
    .filter((w): w is DeckWidget => w.type === 'deck' && (w as DeckWidget).shuffleOnStart === true)
    .filter((deck) => deck.cardIds.length > 1)
    .map((deck) => deck.id);
}
