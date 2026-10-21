/**
 * Player name shared by the party lobby and party games [ID: LOGIC-PARTY-PLAYER-NAME]
 */
import { storage, STORAGE_KEYS } from '../../../lib/storage';

const FUN_NAME_PREFIXES = [
  'Fuchs',
  'Pinguin',
  'Panda',
  'Koala',
  'Drache',
  'Tiger',
  'Ninja',
  'Zauberer',
  'Astronaut',
  'Delfin',
  'Löwe',
  'Falke',
  'Bär',
  'Otter',
];

/** Stored player name, or a generated fun name (e.g. "Panda 42") if none or only a placeholder is stored. */
export const getOrCreatePlayerName = (): string => {
  const existing = storage.get(STORAGE_KEYS.PARTY_PLAYER_NAME, '');
  if (existing && existing.trim() && existing !== 'Spieler' && existing !== 'Host') {
    return existing.trim();
  }
  const idx = Math.floor(Math.random() * FUN_NAME_PREFIXES.length);
  const num = Math.floor(10 + Math.random() * 90);
  const generated = `${FUN_NAME_PREFIXES[idx]} ${num}`;
  storage.set(STORAGE_KEYS.PARTY_PLAYER_NAME, generated);
  return generated;
};

export const savePlayerName = (name: string): void =>
  storage.set(STORAGE_KEYS.PARTY_PLAYER_NAME, name);
