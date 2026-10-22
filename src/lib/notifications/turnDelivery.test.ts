import { describe, expect, it } from 'vitest';
import {
  deliveryAfterOwnMove,
  deliveryForIncomingMove,
  type TurnDeliveryInput,
} from './turnDelivery';

const input = (over: Partial<TurnDeliveryInput> = {}): TurnDeliveryInput => ({
  targetIsLocal: false,
  allPlayersLocal: false,
  targetIsActor: false,
  temporaryClaim: false,
  appVisible: true,
  ...over,
});

describe('turn delivery', () => {
  it('pushes a remote next player after an own move', () => {
    expect(deliveryAfterOwnMove(input())).toEqual({ kind: 'push' });
  });

  it('stays quiet for pass and play, temporary claims and the same player', () => {
    expect(
      deliveryAfterOwnMove(input({ targetIsLocal: true, allPlayersLocal: true, appVisible: false }))
        .kind,
    ).toBe('none');
    expect(deliveryAfterOwnMove(input({ temporaryClaim: true }))).toEqual({
      kind: 'none',
      reason: 'temporary_claim',
    });
    expect(deliveryAfterOwnMove(input({ targetIsActor: true }))).toEqual({
      kind: 'none',
      reason: 'same_player',
    });
  });

  it('notifies on this device only when the next player is here and the app is hidden', () => {
    expect(deliveryAfterOwnMove(input({ targetIsLocal: true, appVisible: false }))).toEqual({
      kind: 'local',
    });
    expect(deliveryAfterOwnMove(input({ targetIsLocal: true }))).toEqual({
      kind: 'none',
      reason: 'visible',
    });
    expect(deliveryForIncomingMove(input({ targetIsLocal: true, appVisible: false }))).toEqual({
      kind: 'local',
    });
    expect(deliveryForIncomingMove(input({ targetIsLocal: true }))).toEqual({
      kind: 'none',
      reason: 'visible',
    });
  });

  it('ignores incoming moves for players of other devices', () => {
    expect(deliveryForIncomingMove(input({ appVisible: false }))).toEqual({
      kind: 'none',
      reason: 'not_on_this_device',
    });
  });
});
