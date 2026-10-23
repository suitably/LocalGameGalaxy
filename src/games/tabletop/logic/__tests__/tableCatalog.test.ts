import { describe, expect, it } from 'vitest';
import { DICE_GAMES, TABLETOP_STARTERS, playModesOf, routeFor } from '../tableCatalog';

describe('table catalog', () => {
  it('maps tabletop modes to shared device / own devices', () => {
    expect(playModesOf(['local_pass_and_play', 'solo'])).toEqual(['shared_device']);
    expect(playModesOf(['party_multi_device'])).toEqual(['own_devices']);
    expect(playModesOf(undefined)).toEqual(['shared_device', 'own_devices']);
  });

  it('opens tabletop games locally or through the party lobby with the game kept', () => {
    const cards = TABLETOP_STARTERS[0];
    expect(routeFor(cards, 'shared_device')).toBe('/games/tabletop?local=1&gameId=standard-cards');
    expect(routeFor(cards, 'own_devices')).toBe('/party?launch=tabletop&gameId=standard-cards');
  });

  it('opens dice games on their own route', () => {
    expect(DICE_GAMES.map((g) => routeFor(g, 'shared_device'))).toEqual([
      '/games/kniffel',
      '/games/knister',
      '/games/qwixx',
    ]);
  });
});
