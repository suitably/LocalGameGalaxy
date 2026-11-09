/** Small tables for routine tests (#694). */
import type { TabletopAction, TabletopGameState } from '../tabletopReducer';
import type { HiddenZone, TabletopWidget } from '../types';

export const wid = (id: string, extra: Record<string, unknown>) =>
  ({ id, x: 0, y: 0, width: 10, height: 10, zIndex: 1, ...extra }) as unknown as TabletopWidget;

export const hand = (id: string, seat: number, childIds: string[] = []) =>
  wid(id, { type: 'holder', isHand: true, ownerSeat: seat, childIds, layout: 'grid' });

export const button = (id: string, routine: unknown[], triggers?: unknown[]) =>
  wid(id, { type: 'button', text: id, routine, triggers });

export function table(
  widgets: TabletopWidget[],
  hiddenZones?: Record<string, HiddenZone>,
): TabletopGameState {
  return {
    game: {
      id: 'g',
      name: 'G',
      version: '1',
      minPlayers: 1,
      maxPlayers: 4,
      supportedModes: ['party_multi_device'],
      table: { width: 1000, height: 1000 },
      widgets: Object.fromEntries(widgets.map((w) => [w.id, w])),
      hiddenZones,
    },
    flyingCards: [],
  };
}

/** The action as a host stamps it, with a fixed seed. */
export const stamped = (action: TabletopAction, seat: number | null = 0, seed = 42) =>
  ({ ...action, host: { seed, seat, now: 1 } }) as TabletopAction;

export const run = (buttonId: string, seat: number | null = 0, seed = 42) =>
  stamped({ type: 'RUN_ROUTINE', payload: { buttonId, now: 1 } }, seat, seed);
