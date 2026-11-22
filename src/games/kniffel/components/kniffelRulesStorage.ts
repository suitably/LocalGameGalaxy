/** The rules the host picked last for Kniffel in a party room (`STORAGE_KEYS.KNIFFEL_ROOM_RULES`). */
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import type { KniffelRules } from '../logic/types';

export const loadKniffelRoomRules = (): KniffelRules =>
  storage.get(STORAGE_KEYS.KNIFFEL_ROOM_RULES) === 'international' ? 'international' : 'kniffel';

export const saveKniffelRoomRules = (rules: KniffelRules): void =>
  storage.set(STORAGE_KEYS.KNIFFEL_ROOM_RULES, rules);
