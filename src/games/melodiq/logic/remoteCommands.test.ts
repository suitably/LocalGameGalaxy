import { describe, expect, it, vi } from 'vitest';
import { createMemoryTransport } from '../../../modules/room-game/roomTransport';
import {
  commandValue,
  handleRemoteCommandEvent,
  joinModeOf,
  parseRemoteCommand,
  profileLatencyOf,
  REMOTE_COMMANDS,
  type RemoteCommandEvent,
  type RemoteCommandHostDeps,
} from './remoteCommands';

const cmd = (command: string, extra: Record<string, unknown> = {}) => ({
  type: 'remote.command',
  from: 'phone-1',
  command,
  ...extra,
});

describe('parseRemoteCommand', () => {
  it('accepts every known command', () => {
    for (const command of REMOTE_COMMANDS) {
      expect(parseRemoteCommand(cmd(command))?.command).toBe(command);
    }
  });

  it('rejects unknown commands, other types and a missing from', () => {
    expect(parseRemoteCommand(cmd('format_disk'))).toBeNull();
    expect(parseRemoteCommand(cmd('Play'))).toBeNull();
    expect(parseRemoteCommand({ ...cmd('play'), type: 'api_request' })).toBeNull();
    expect(parseRemoteCommand({ ...cmd('play'), from: '' })).toBeNull();
    expect(parseRemoteCommand({ type: 'remote.command', command: 'play' })).toBeNull();
    expect(parseRemoteCommand(null)).toBeNull();
  });

  it('keeps value and to only when present', () => {
    expect(parseRemoteCommand(cmd('play'))).toEqual({
      type: 'remote.command',
      from: 'phone-1',
      command: 'play',
    });
    expect(parseRemoteCommand(cmd('PONG', { value: 5, to: 'x' }))).toMatchObject({
      value: 5,
      to: 'x',
    });
  });
});

describe('value helpers', () => {
  it('reads latency and join mode', () => {
    const profile = parseRemoteCommand(cmd('UPDATE_PROFILE', { value: { latency: 42 } }))!;
    expect(profileLatencyOf(profile)).toBe(42);
    expect(profileLatencyOf(parseRemoteCommand(cmd('UPDATE_PROFILE'))!)).toBeUndefined();
    const join = parseRemoteCommand(cmd('session.join_mode', { value: { mode: 'spectator' } }))!;
    expect(joinModeOf(join)).toBe('spectator');
  });

  it('commandValue drops empty payloads', () => {
    expect(commandValue({})).toBeUndefined();
    expect(commandValue({ mode: 'singer' })).toEqual({ mode: 'singer' });
  });
});

describe('handleRemoteCommandEvent', () => {
  const setup = () => {
    const transport = createMemoryTransport();
    const received: RemoteCommandEvent[] = [];
    transport.subscribe('ch', (msg) => received.push(msg as RemoteCommandEvent));
    const deps: RemoteCommandHostDeps = {
      forward: vi.fn(),
      playCalibrationBeep: vi.fn(),
      send: (event) => transport.publish('ch', event),
      now: () => 1234,
      selfId: 'host',
    };
    return { deps, received };
  };

  it('forwards playback commands with their value', () => {
    const { deps } = setup();
    handleRemoteCommandEvent(cmd('next'), deps);
    handleRemoteCommandEvent(cmd('CALIBRATE_PLAY_BEEP'), deps);
    expect(deps.forward).toHaveBeenNthCalledWith(1, 'next', undefined);
    expect(deps.forward).toHaveBeenNthCalledWith(2, 'CALIBRATE_PLAY_BEEP', undefined);
  });

  it('answers PING with a PONG addressed to the pinging phone', () => {
    const { deps, received } = setup();
    handleRemoteCommandEvent(cmd('PING'), deps);
    expect(received).toEqual([
      { type: 'remote.command', from: 'host', to: 'phone-1', command: 'PONG', value: 1234 },
    ]);
    expect(deps.forward).not.toHaveBeenCalled();
  });

  it('plays the calibration beep locally', () => {
    const { deps } = setup();
    handleRemoteCommandEvent(cmd('CALIBRATE_BEEP'), deps);
    expect(deps.playCalibrationBeep).toHaveBeenCalledOnce();
    expect(deps.forward).not.toHaveBeenCalled();
  });

  it('ignores unknown commands, replies and its own events', () => {
    const { deps, received } = setup();
    handleRemoteCommandEvent(cmd('rm_rf'), deps);
    handleRemoteCommandEvent(cmd('PONG'), deps);
    handleRemoteCommandEvent(cmd('next', { to: 'other' }), deps);
    handleRemoteCommandEvent({ ...cmd('next'), from: 'host' }, deps);
    expect(deps.forward).not.toHaveBeenCalled();
    expect(received).toEqual([]);
  });
});
