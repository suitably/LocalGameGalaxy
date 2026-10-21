/**
 * Saves the running game shortly after each change [ID: HOOK-TABLETOP-AUTOSAVE]
 *
 * Only the device that owns the state saves (host or local play); phones resume via snapshot.
 */
import { useEffect } from 'react';
import { saveTabletopSession } from '../logic/tabletopStorage';
import type { TabletopGameDefinition } from '../logic/types';

export const AUTOSAVE_DELAY_MS = 1000;

export function useTabletopAutosave(
  key: string,
  game: TabletopGameDefinition,
  enabled: boolean,
  delayMs = AUTOSAVE_DELAY_MS,
) {
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => {
      saveTabletopSession(key, game).catch((err) =>
        console.warn('[Tabletop] Autosave failed:', err),
      );
    }, delayMs);
    return () => clearTimeout(timer);
  }, [key, game, enabled, delayMs]);
}
