/**
 * Hub entries whose definition lives in their game folder, appended after the registry's own
 * list so `gameRegistry.tsx` stays in budget [ID: REGISTRY-EXTRA-ENTRIES]
 */
import type { GameDefinition } from '../lib/gameRegistry';
import { caboDefinition } from '../games/cabo/definition';
import { drawPotDefinition } from '../games/drawpot/definition';

export const extraEntries: GameDefinition[] = [drawPotDefinition, caboDefinition];
