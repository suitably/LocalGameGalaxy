import { describe, expect, it } from 'vitest';
import { isVirtualMidiPort, midiInstrument, pickMidiInput, lostMidiInstrument } from '../midiPorts';

const through = { id: 'through', name: 'Midi Through Port-0', state: 'connected' };
const drums = { id: 'td11', name: 'TD-11 MIDI 1', state: 'connected' };
const piano = { id: 'piano', name: 'Digital Piano', state: 'connected' };

describe('pickMidiInput', () => {
  it('skips the ALSA loopback port in favour of a real instrument', () => {
    expect(pickMidiInput([through, drums], null)).toBe('td11');
  });

  it('switches away from the loopback port once an instrument is plugged in', () => {
    expect(pickMidiInput([through, drums], 'through')).toBe('td11');
  });

  it('keeps a connected instrument the player already uses', () => {
    expect(pickMidiInput([through, drums, piano], 'piano')).toBe('piano');
  });

  it('moves on when the current instrument is disconnected', () => {
    expect(pickMidiInput([through, { ...drums, state: 'disconnected' }, piano], 'td11')).toBe(
      'piano',
    );
  });

  it('falls back to the loopback port, then to none', () => {
    expect(pickMidiInput([through], null)).toBe('through');
    expect(pickMidiInput([], 'td11')).toBeNull();
  });
});

describe('isVirtualMidiPort', () => {
  it('matches only loopback names', () => {
    expect(isVirtualMidiPort('Midi Through Port-0')).toBe(true);
    expect(isVirtualMidiPort('TD-11 MIDI 1')).toBe(false);
  });
});

describe('midiInstrument', () => {
  it('returns the selected connected instrument', () => {
    expect(midiInstrument([through, piano], 'piano')).toBe(piano);
  });

  it('ignores the loopback port, a disconnected device and no selection', () => {
    expect(midiInstrument([through], 'through')).toBeNull();
    expect(midiInstrument([{ ...piano, state: 'disconnected' }], 'piano')).toBeNull();
    expect(midiInstrument([piano], null)).toBeNull();
  });
});

describe('lostMidiInstrument (#599)', () => {
  it('remembers an instrument that went away', () => {
    expect(lostMidiInstrument(null, 'TD-11', null)).toBe('TD-11');
    // listed again but silent: the hint stays (a note clears it in useStageInput)
    expect(lostMidiInstrument('TD-11', null, 'TD-11')).toBe('TD-11');
    expect(lostMidiInstrument(null, null, 'TD-11')).toBeNull();
    expect(lostMidiInstrument(null, 'TD-11', 'TD-11')).toBeNull();
  });
});
