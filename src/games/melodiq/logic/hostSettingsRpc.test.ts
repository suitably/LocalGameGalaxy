import { describe, expect, it, vi } from 'vitest';
import { createMemoryTransport } from '../../../modules/room-game/roomTransport';
import {
  createHostPeerTransport,
  stampSender,
  type PeerHostLike,
} from '../../../modules/room-game/peerTransport';
import {
  canEditHostSettings,
  handleHostSettingsEvent,
  HOST_SETTING_KEYS,
  parseHostSettingsRequest,
  parseHostSettingsState,
  pickHostSettings,
  sanitizeHostSettingsPatch,
  type HostSettingsHostDeps,
  type HostSettingsStateEvent,
} from './hostSettingsRpc';
import { DEFAULT_SETTINGS } from '../hooks/settingsStorage';
import type { HostSettings } from '../types';

describe('sanitizeHostSettingsPatch', () => {
  it('keeps valid values and clamps ranges', () => {
    expect(
      sanitizeHostSettingsPatch({
        songVolume: 1.7,
        vocalsVolume: -2,
        lyricsScale: 9,
        lyricsLines: 3,
      }),
    ).toEqual({ songVolume: 1, vocalsVolume: 0, lyricsScale: 3, lyricsLines: 3 });
  });

  it('drops unknown keys and invalid values', () => {
    expect(
      sanitizeHostSettingsPatch({
        helperUrl: 'http://evil',
        audioPlaybackMode: 'x',
        lyricsPosition: 'center',
        lyricsLines: 1.5,
        showNoteLabels: 'yes',
        masterVolume: NaN,
      }),
    ).toEqual({ lyricsPosition: 'center' });
  });

  it('drops values of the wrong primitive type', () => {
    expect(
      sanitizeHostSettingsPatch({
        songVolume: '0.5',
        enableLyricsZoom: 1,
        lyricsPosition: true,
        lyricsScale: '2',
        showScoreboardQrCode: false,
      }),
    ).toEqual({ showScoreboardQrCode: false });
  });

  it('returns an empty patch for non-objects', () => {
    expect(sanitizeHostSettingsPatch(null)).toEqual({});
    expect(sanitizeHostSettingsPatch('a')).toEqual({});
  });
});

describe('host settings helpers', () => {
  it('picks only the editable keys', () => {
    const picked = pickHostSettings(DEFAULT_SETTINGS);
    expect(picked).not.toHaveProperty('helperUrl');
    expect(picked.songVolume).toBe(DEFAULT_SETTINGS.songVolume);
  });

  it('allows admins only', () => {
    expect(canEditHostSettings('admin')).toBe(true);
    expect(canEditHostSettings('queue_manager')).toBe(false);
    expect(canEditHostSettings(undefined)).toBe(false);
  });

  it('accepts only 1 or 2 lyric rows', () => {
    expect(sanitizeHostSettingsPatch({ lyricsRows: 1 })).toEqual({ lyricsRows: 1 });
    expect(sanitizeHostSettingsPatch({ lyricsRows: 2 })).toEqual({ lyricsRows: 2 });
    expect(sanitizeHostSettingsPatch({ lyricsRows: 3 })).toEqual({});
    expect(sanitizeHostSettingsPatch({ lyricsRows: '2' })).toEqual({});
  });

  it('accepts only the offered minimum lyric sizes', () => {
    expect(sanitizeHostSettingsPatch({ lyricsMinFit: 0.8 })).toEqual({ lyricsMinFit: 0.8 });
    expect(sanitizeHostSettingsPatch({ lyricsMinFit: 0.1 })).toEqual({});
  });
});

describe('parseHostSettingsRequest', () => {
  it('parses get and guarded set requests', () => {
    expect(parseHostSettingsRequest({ type: 'settings.get', from: 'dev_a' })).toEqual({
      type: 'settings.get',
      from: 'dev_a',
    });
    expect(
      parseHostSettingsRequest({
        type: 'settings.set',
        from: 'dev_a',
        patch: { songVolume: 0.5, helperUrl: 'x', showNoteLabels: 'yes' },
      }),
    ).toEqual({ type: 'settings.set', from: 'dev_a', patch: { songVolume: 0.5 } });
  });

  it('rejects other messages and requests without a sender', () => {
    expect(parseHostSettingsRequest({ type: 'host.settings.get', from: 'dev_a' })).toBeNull();
    expect(parseHostSettingsRequest({ type: 'settings.state', from: 'host' })).toBeNull();
    expect(parseHostSettingsRequest({ type: 'settings.get' })).toBeNull();
    expect(parseHostSettingsRequest({ type: 'settings.get', from: '' })).toBeNull();
    expect(parseHostSettingsRequest(undefined)).toBeNull();
  });
});

describe('parseHostSettingsState', () => {
  const settings = pickHostSettings(DEFAULT_SETTINGS);

  it('accepts a complete reply', () => {
    expect(
      parseHostSettingsState({ type: 'settings.state', from: 'host', to: 'dev_a', settings }),
    ).toEqual({ type: 'settings.state', from: 'host', to: 'dev_a', settings });
  });

  it('rejects incomplete or unaddressed replies', () => {
    const partial: Partial<HostSettings> = { ...settings };
    delete partial.songVolume;
    expect(
      parseHostSettingsState({ type: 'settings.state', to: 'dev_a', settings: partial }),
    ).toBeNull();
    expect(parseHostSettingsState({ type: 'settings.state', settings })).toBeNull();
    expect(parseHostSettingsState({ type: 'settings.get', to: 'dev_a', settings })).toBeNull();
  });
});

const ROLES: Record<string, string> = { dev_admin: 'admin', dev_guest: 'singer' };
const CHANNEL = 'melodiq_room_live';

/** Host handler on a transport with a fake role lookup and settings store. */
function hostHarness(transport = createMemoryTransport()) {
  let current: HostSettings = pickHostSettings(DEFAULT_SETTINGS);
  const apply = vi.fn((patch: Partial<HostSettings>) => {
    current = { ...current, ...patch };
  });
  const getRole = vi.fn((id: string) => ROLES[id] ?? 'singer');
  const replies: HostSettingsStateEvent[] = [];
  const deps: HostSettingsHostDeps = {
    getRole,
    getSettings: () => current,
    apply,
    send: (event) => transport.publish(CHANNEL, event),
    selfId: 'host',
    onDenied: vi.fn(),
  };
  transport.subscribe(CHANNEL, (event) => {
    const reply = parseHostSettingsState(event);
    if (reply) replies.push(reply);
    else handleHostSettingsEvent(event, deps);
  });
  return { transport, apply, getRole, replies, deps, settings: () => current };
}

describe('handleHostSettingsEvent', () => {
  it('applies an admin set and replies to the sender with the merged state', () => {
    const h = hostHarness();
    h.transport.publish(CHANNEL, {
      type: 'settings.set',
      from: 'dev_admin',
      patch: { songVolume: 0.25, helperUrl: 'http://evil' },
    });
    expect(h.apply).toHaveBeenCalledWith({ songVolume: 0.25 });
    expect(h.replies).toHaveLength(1);
    expect(h.replies[0]).toMatchObject({ from: 'host', to: 'dev_admin' });
    expect(h.replies[0].settings.songVolume).toBe(0.25);
    expect(Object.keys(h.replies[0].settings).sort()).toEqual([...HOST_SETTING_KEYS].sort());
  });

  it('answers an admin get without applying anything', () => {
    const h = hostHarness();
    h.transport.publish(CHANNEL, { type: 'settings.get', from: 'dev_admin' });
    expect(h.apply).not.toHaveBeenCalled();
    expect(h.replies).toEqual([
      { type: 'settings.state', from: 'host', to: 'dev_admin', settings: h.settings() },
    ]);
  });

  it('ignores a non-admin set: nothing applied, no reply', () => {
    const h = hostHarness();
    const before = h.settings();
    h.transport.publish(CHANNEL, {
      type: 'settings.set',
      from: 'dev_guest',
      patch: { songVolume: 0 },
    });
    h.transport.publish(CHANNEL, { type: 'settings.get', from: 'dev_unknown' });
    expect(h.apply).not.toHaveBeenCalled();
    expect(h.replies).toEqual([]);
    expect(h.settings()).toEqual(before);
    expect(h.deps.onDenied).toHaveBeenCalledTimes(2);
  });

  it('a payload claiming an admin `from` cannot escalate once the host stamps the sender', () => {
    const h = hostHarness();
    const forged = { type: 'settings.set', from: 'dev_admin', patch: { masterVolume: 0 } };
    // The host transport replaces `from` with the real sender's device id.
    h.transport.publish(CHANNEL, stampSender(forged, 'dev_guest'));
    expect(h.getRole).toHaveBeenCalledWith('dev_guest');
    expect(h.getRole).not.toHaveBeenCalledWith('dev_admin');
    expect(h.apply).not.toHaveBeenCalled();
    expect(h.replies).toEqual([]);
  });
});

describe('handleHostSettingsEvent over createHostPeerTransport', () => {
  function peerHost() {
    const peers = [
      { peerId: 'p_admin', deviceId: 'dev_admin' },
      { peerId: 'p_guest', deviceId: 'dev_guest' },
    ];
    const toPeer: Record<string, unknown[]> = { p_admin: [], p_guest: [] };
    const listeners = new Set<(peerId: string, data: unknown) => void>();
    const manager: PeerHostLike = {
      on: (_event, fn) => {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      sendToPeer: (peerId, data) => toPeer[peerId]?.push(data),
      broadcast: (data) => peers.forEach((p) => toPeer[p.peerId].push(data)),
      getConnectedPeers: () => peers,
    };
    const fromPhone = (peerId: string, msg: unknown) =>
      [...listeners].forEach((fn) => fn(peerId, { type: 'room', channel: CHANNEL, msg }));
    const h = hostHarness(createHostPeerTransport(manager, { selfId: 'host' }));
    return { h, toPeer, fromPhone };
  }

  it('denies a non-admin phone sending a forged admin `from`', () => {
    const { h, toPeer, fromPhone } = peerHost();
    fromPhone('p_guest', { type: 'settings.set', from: 'dev_admin', patch: { songVolume: 0 } });
    expect(h.getRole).toHaveBeenCalledWith('dev_guest');
    expect(h.apply).not.toHaveBeenCalled();
    expect(toPeer.p_guest).toEqual([]);
    expect(toPeer.p_admin).toEqual([]);
  });

  it('denies a phone that omits `from` (nothing to stamp)', () => {
    const { h, fromPhone } = peerHost();
    fromPhone('p_guest', { type: 'settings.set', patch: { songVolume: 0 } });
    expect(h.apply).not.toHaveBeenCalled();
  });

  it('applies an admin phone set and replies to that phone only', () => {
    const { h, toPeer, fromPhone } = peerHost();
    fromPhone('p_admin', { type: 'settings.set', from: 'whatever', patch: { songVolume: 0.3 } });
    expect(h.getRole).toHaveBeenCalledWith('dev_admin');
    expect(h.apply).toHaveBeenCalledWith({ songVolume: 0.3 });
    expect(toPeer.p_guest).toEqual([]);
    expect(toPeer.p_admin).toHaveLength(1);
    expect(toPeer.p_admin[0]).toMatchObject({
      type: 'room',
      msg: { type: 'settings.state', to: 'dev_admin' },
    });
  });
});
