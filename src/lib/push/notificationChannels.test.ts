import { describe, expect, it } from 'vitest';
import {
  getDeviceChannelStatus,
  methodForChoice,
  recommendedChoice,
  shouldAskForChannel,
} from './notificationChannels';

describe('getDeviceChannelStatus', () => {
  it('is available while the browser has not been asked yet', () => {
    expect(getDeviceChannelStatus('prompt', false)).toBe('available');
    expect(getDeviceChannelStatus('default', false)).toBe('available');
  });

  it('is active once permission is granted, even if install detection says otherwise', () => {
    expect(getDeviceChannelStatus('granted', false)).toBe('active');
    expect(getDeviceChannelStatus('granted', true)).toBe('active');
  });

  it('asks for the home-screen install before anything else on iOS Safari', () => {
    expect(getDeviceChannelStatus('unsupported', true)).toBe('install-first');
    expect(getDeviceChannelStatus('default', true)).toBe('install-first');
  });

  it('reports a denied permission as blocked', () => {
    expect(getDeviceChannelStatus('denied', false)).toBe('blocked');
  });

  it('reports a missing notification API as unsupported', () => {
    expect(getDeviceChannelStatus('unsupported', false)).toBe('unsupported');
  });
});

describe('recommendedChoice', () => {
  it('recommends the device when it can be enabled or already is', () => {
    expect(recommendedChoice('available')).toBe('device');
    expect(recommendedChoice('active')).toBe('device');
  });

  it('recommends ntfy when the device channel cannot be turned on with one tap', () => {
    expect(recommendedChoice('install-first')).toBe('ntfy');
    expect(recommendedChoice('blocked')).toBe('ntfy');
    expect(recommendedChoice('unsupported')).toBe('ntfy');
  });
});

describe('methodForChoice', () => {
  it('makes ntfy the only channel when chosen', () => {
    expect(methodForChoice('ntfy', 'auto')).toBe('ntfy');
    expect(methodForChoice('ntfy', 'both')).toBe('ntfy');
  });

  it('undoes an ntfy-only choice when the device is chosen', () => {
    expect(methodForChoice('device', 'ntfy')).toBe('auto');
  });

  it('keeps any other stored method when the device is chosen', () => {
    expect(methodForChoice('device', 'auto')).toBe('auto');
    expect(methodForChoice('device', 'webpush')).toBe('webpush');
    expect(methodForChoice('device', 'both')).toBe('both');
  });
});

describe('shouldAskForChannel', () => {
  it('asks while nothing is decided', () => {
    expect(shouldAskForChannel('available', 'auto', false)).toBe(true);
    expect(shouldAskForChannel('blocked', 'auto', false)).toBe(true);
    expect(shouldAskForChannel('install-first', 'both', false)).toBe(true);
  });

  it('stays quiet once the device channel is on', () => {
    expect(shouldAskForChannel('active', 'auto', false)).toBe(false);
  });

  it('stays quiet once ntfy was chosen', () => {
    expect(shouldAskForChannel('available', 'ntfy', false)).toBe(false);
  });

  it('stays quiet after "Not now"', () => {
    expect(shouldAskForChannel('available', 'auto', true)).toBe(false);
  });
});
