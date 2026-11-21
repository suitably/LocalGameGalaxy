/**
 * The scripted card games of the Spieltisch [ID: LOGIC-TABLETOP-SCRIPT-REGISTRY]
 */
import { arschloch } from './arschloch';
import { durak } from './durak';
import { maumau } from './maumau';
import { schwarzerPeter } from './schwarzerPeter';
import { schwimmen } from './schwimmen';
import { skat } from './skat';
import { eraseScript, type AnyGameScript } from './scriptTypes';

const SCRIPTS: Record<string, AnyGameScript> = {
  schwimmen: eraseScript(schwimmen),
  durak: eraseScript(durak),
  arschloch: eraseScript(arschloch),
  skat: eraseScript(skat),
  maumau: eraseScript(maumau),
  'schwarzer-peter': eraseScript(schwarzerPeter),
};

export const SCRIPTED_GAME_IDS: readonly string[] = Object.keys(SCRIPTS);

export const getScript = (id: string | null | undefined): AnyGameScript | null =>
  (id && Object.hasOwn(SCRIPTS, id) ? SCRIPTS[id] : null) ?? null;

export const isScriptedGame = (id: string | null | undefined): boolean => getScript(id) !== null;
