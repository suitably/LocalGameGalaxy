/**
 * Hub entries whose definition lives in their game folder, appended after the registry's own
 * list so `gameRegistry.tsx` stays in budget [ID: REGISTRY-EXTRA-ENTRIES]
 */
import type { GameDefinition } from '../lib/gameRegistry';
import { caboDefinition } from '../games/cabo/definition';
import { drawPotDefinition } from '../games/drawpot/definition';
import { golfDefinition } from '../games/golf/definition';
import { maumauDefinition } from '../games/maumau/definition';
import { schwarzerPeterDefinition } from '../games/schwarzer-peter/definition';

export const extraEntries: GameDefinition[] = [
  drawPotDefinition,
  caboDefinition,
  golfDefinition,
  maumauDefinition,
  schwarzerPeterDefinition,
];
