/**
 * Keeps a running scripted game across reloads [ID: LOGIC-TABLETOP-SCRIPT-STORE]
 *
 * One entry per game id on the device that owns the state: the local table (`scope` `local`)
 * or the party room it hosts (`scope` = room id).
 */
import { storage, STORAGE_PREFIXES } from '../../../../lib/storage';
import { emptySession, type SessionState } from './session';

interface Saved {
  scope: string;
  state: SessionState;
}

const keyOf = (scriptId: string) => `${STORAGE_PREFIXES.TABLETOP_SCRIPTED}${scriptId}`;

export function loadSession(scriptId: string, scope: string): SessionState {
  const saved = storage.getJson<Saved | null>(keyOf(scriptId), null);
  const state = saved?.scope === scope ? saved.state : null;
  const valid =
    state && state.scriptId === scriptId && Array.isArray(state.players) && state.game !== null;
  return valid ? state : emptySession(scriptId);
}

export function saveSession(scope: string, state: SessionState): void {
  if (state.game === null) storage.remove(keyOf(state.scriptId));
  else storage.setJson<Saved>(keyOf(state.scriptId), { scope, state });
}
