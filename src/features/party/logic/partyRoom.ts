import { storage, STORAGE_PREFIXES } from '../../../lib/storage';
import { universalPartyManager, type PartyRoomState } from './universalPartyManager';

/** True when `code` is a party-lobby room known to this browser (live or stored). */
export function isPartyRoomCode(code: string | null | undefined): boolean {
  if (!code) return false;
  if (universalPartyManager.getRoomState()?.roomId === code) return true;
  return Boolean(
    storage.getJson<PartyRoomState | null>(`${STORAGE_PREFIXES.PARTY_STATE}${code}`, null),
  );
}
