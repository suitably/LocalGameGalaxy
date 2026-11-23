import { describe, expect, it } from 'vitest';
import { playModesOf, routeFor, spieltischSection, tableModesOf } from './tableCatalog';

describe('table catalog', () => {
  it('maps tabletop modes to shared device / own devices', () => {
    expect(playModesOf(['local_pass_and_play', 'solo'])).toEqual(['shared_device']);
    expect(playModesOf(['party_multi_device'])).toEqual(['own_devices']);
    expect(playModesOf(undefined)).toEqual(['shared_device', 'own_devices']);
  });

  it('maps catalogue modes to Spieltisch play modes', () => {
    expect(tableModesOf(['solo', 'pass_and_play', 'party_room'])).toEqual([
      'shared_device',
      'own_devices',
    ]);
    expect(tableModesOf(['pass_and_play'])).toEqual(['shared_device']);
    expect(tableModesOf(['async'])).toEqual([]);
  });

  it('opens tabletop games locally or through the party lobby with the game kept', () => {
    const cards = spieltischSection('starters')[0];
    expect(routeFor(cards, 'shared_device')).toBe('/games/tabletop?local=1&gameId=standard-cards');
    expect(routeFor(cards, 'own_devices')).toBe('/party?launch=tabletop&gameId=standard-cards');
  });

  it('opens dice games on their own route', () => {
    expect(spieltischSection('dice').map((g) => routeFor(g, 'shared_device'))).toEqual([
      '/games/kniffel',
      '/games/knister',
      '/games/qwixx',
    ]);
  });

  it('lists the card score tracker on its own route, one device only', () => {
    expect(
      spieltischSection('trackers').map((g) => [routeFor(g, 'shared_device'), g.modes]),
    ).toEqual([['/games/cards', ['shared_device']]]);
  });

  it('starts a dice game with everyone on their own device through the party lobby', () => {
    const knister = spieltischSection('dice').find((g) => g.id === 'knister')!;
    expect(knister.modes).toEqual(['shared_device', 'own_devices']);
    expect(routeFor(knister, 'own_devices')).toBe('/party?launch=knister');
  });
});
