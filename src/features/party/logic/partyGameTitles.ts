/**
 * Title of the game a party room plays, from the catalogue (ADR-0011) [ID: LOGIC-PARTY-GAME-TITLE]
 */
import type { TFunction } from 'i18next';
import { partyEntry } from '../../../lib/catalog/views';
import type { PartyGameType } from './universalPartyManager';

export function partyGameTitle(
  t: TFunction,
  gameType: PartyGameType | null | undefined,
  gameId?: string | null,
): string {
  const entry = partyEntry(gameType, gameId);
  if (entry) return t(entry.titleKey, entry.title);
  return gameType === 'tabletop' ? t('games.tabletop.title', 'Spieltisch') : (gameType ?? '');
}
