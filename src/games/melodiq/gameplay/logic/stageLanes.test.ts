import { describe, expect, it } from 'vitest';
import { isPhoneScreen, laneScope, playersInScope } from './stageLanes';

const base = { isClient: false, isPhone: false, hasTv: false, isMirror: false };
const player = (id: string, deviceId: string, isRemote: boolean) => ({
  config: { id, deviceId, isRemote },
});

describe('laneScope', () => {
  it('shows every lane on a laptop or tablet host', () => {
    expect(laneScope(base)).toEqual({ kind: 'all' });
  });

  it('shows only the own-microphone singers on a hosting phone without a TV', () => {
    expect(laneScope({ ...base, isPhone: true })).toEqual({ kind: 'local' });
  });

  it('keeps every lane on a hosting phone that streams to a TV', () => {
    expect(laneScope({ ...base, isPhone: true, hasTv: true })).toEqual({ kind: 'all' });
  });

  it('keeps every lane on the TV itself, whatever its screen reports', () => {
    expect(laneScope({ ...base, isPhone: true, isMirror: true })).toEqual({ kind: 'all' });
  });

  it('shows a phone client its own singer', () => {
    expect(laneScope({ ...base, isClient: true, isPhone: true, clientDeviceId: 'd1' })).toEqual({
      kind: 'device',
      deviceId: 'd1',
    });
  });
});

describe('playersInScope', () => {
  const players = [
    player('host-profile', 'mic-1', false),
    player('p-anna', 'phone-anna', true),
    player('phone-ben', 'phone-ben', true),
  ];

  it('returns everyone for the shared screen', () => {
    expect(playersInScope(players, { kind: 'all' })).toHaveLength(3);
  });

  it('returns the local-microphone singers for a hosting phone', () => {
    expect(playersInScope(players, { kind: 'local' }).map((p) => p.config.id)).toEqual([
      'host-profile',
    ]);
  });

  it('finds a phone by its device id, or by its id when it joined as a guest', () => {
    expect(
      playersInScope(players, { kind: 'device', deviceId: 'phone-anna' }).map((p) => p.config.id),
    ).toEqual(['p-anna']);
    expect(
      playersInScope(players, { kind: 'device', deviceId: 'phone-ben' }).map((p) => p.config.id),
    ).toEqual(['phone-ben']);
  });

  it('returns nobody for a phone that only watches', () => {
    expect(playersInScope(players, { kind: 'device', deviceId: 'other' })).toEqual([]);
  });
});

describe('isPhoneScreen', () => {
  it('is a touch device with a short side of at most 600 px', () => {
    expect(isPhoneScreen(true, 390, 844)).toBe(true);
    expect(isPhoneScreen(true, 844, 390)).toBe(true);
  });

  it('is not a tablet, a touch laptop or a desktop', () => {
    expect(isPhoneScreen(true, 820, 1180)).toBe(false);
    expect(isPhoneScreen(false, 390, 844)).toBe(false);
    expect(isPhoneScreen(true, 0, 0)).toBe(false);
  });
});
