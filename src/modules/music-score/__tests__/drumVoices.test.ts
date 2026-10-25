import { describe, expect, it } from 'vitest';
import {
  DRUM_VOICE_KEY,
  DRUM_VOICES,
  drumMatchRank,
  drumVoiceOfKey,
  drumVoiceOfName,
  parseSticking,
  resolveDrumVoice,
} from '../drumVoices';
import { parseMusicXml } from '../musicXml';
import { parseXml } from './fixtures';

describe('drum voices', () => {
  it('maps General MIDI keys 35-81', () => {
    expect(drumVoiceOfKey(36)).toBe('kick');
    expect(drumVoiceOfKey(37)).toBe('snareCrossStick');
    expect(drumVoiceOfKey(42)).toBe('hihatClosed');
    expect(drumVoiceOfKey(44)).toBe('hihatPedal');
    expect(drumVoiceOfKey(46)).toBe('hihatOpen');
    expect(drumVoiceOfKey(50)).toBe('tom1');
    expect(drumVoiceOfKey(47)).toBe('tom2');
    expect(drumVoiceOfKey(45)).toBe('tom3');
    expect(drumVoiceOfKey(41)).toBe('floorTom');
    expect(drumVoiceOfKey(53)).toBe('rideBell');
    expect(drumVoiceOfKey(52)).toBe('china');
    expect(drumVoiceOfKey(55)).toBe('splash');
    expect(drumVoiceOfKey(56)).toBe('cowbell');
    expect(drumVoiceOfKey(70)).toBe('other');
    expect(drumVoiceOfKey(10)).toBe('other');
  });

  it('round-trips every voice through its canonical key (except shared keys)', () => {
    for (const v of DRUM_VOICES) {
      if (v === 'snareRimshot' || v === 'snareGhost' || v === 'other') continue;
      expect(drumVoiceOfKey(DRUM_VOICE_KEY[v])).toBe(v);
    }
  });

  it('reads instrument names', () => {
    expect(drumVoiceOfName('Hi-Hat (open)')).toBe('hihatOpen');
    expect(drumVoiceOfName('Hi-Hat')).toBe('hihatClosed');
    expect(drumVoiceOfName('Pedal Hi-Hat')).toBe('hihatPedal');
    expect(drumVoiceOfName('Ride Bell')).toBe('rideBell');
    expect(drumVoiceOfName('Floor Tom')).toBe('floorTom');
    expect(drumVoiceOfName('Tom 3')).toBe('tom3');
    expect(drumVoiceOfName('High Tom')).toBe('tom1');
    expect(drumVoiceOfName('Side Stick')).toBe('snareCrossStick');
    expect(drumVoiceOfName('Bass Drum')).toBe('kick');
    expect(drumVoiceOfName('Piano')).toBeNull();
  });

  it('resolves articulation and notehead', () => {
    expect(resolveDrumVoice({ key: 42, open: true })).toBe('hihatOpen');
    expect(resolveDrumVoice({ key: 42, notehead: 'circle-x' })).toBe('hihatOpen');
    expect(resolveDrumVoice({ key: 46, stopped: true })).toBe('hihatClosed');
    expect(resolveDrumVoice({ key: 38, notehead: 'x' })).toBe('snareCrossStick');
    expect(resolveDrumVoice({ key: 38, parenthesized: true })).toBe('snareGhost');
    expect(resolveDrumVoice({ key: 38, mark: 'Rimshot' })).toBe('snareRimshot');
    expect(resolveDrumVoice({ key: 51, notehead: 'diamond' })).toBe('rideBell');
    expect(resolveDrumVoice({ name: 'Floor Tom' })).toBe('floorTom');
    expect(resolveDrumVoice({})).toBeNull();
  });

  it('ranks matches with family fallback', () => {
    expect(drumMatchRank('hihatOpen', 'hihatOpen')).toBe(0);
    expect(drumMatchRank('hihatClosed', 'hihatOpen')).toBe(1);
    expect(drumMatchRank('tom1', 'floorTom')).toBe(1);
    expect(drumMatchRank('snare', 'hihatClosed')).toBe(2);
    expect(drumMatchRank('other', 'other')).toBe(0);
    expect(drumMatchRank('other', 'cowbell')).toBe(2);
  });

  it('accepts only R and L as sticking', () => {
    expect(parseSticking(' r ')).toBe('R');
    expect(parseSticking('L')).toBe('L');
    expect(parseSticking('1')).toBeNull();
    expect(parseSticking(undefined)).toBeNull();
  });
});

const drumXml = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Drumset</part-name>
    <score-instrument id="I1"><instrument-name>Hi-Hat</instrument-name></score-instrument>
    <score-instrument id="I2"><instrument-name>Snare</instrument-name></score-instrument>
    <score-instrument id="I3"><instrument-name>Floor Tom</instrument-name></score-instrument>
    <midi-instrument id="I1"><midi-channel>10</midi-channel><midi-unpitched>43</midi-unpitched></midi-instrument>
    <midi-instrument id="I2"><midi-channel>10</midi-channel><midi-unpitched>39</midi-unpitched></midi-instrument>
  </score-part></part-list>
  <part id="P1"><measure number="1"><attributes><divisions>1</divisions></attributes>
    <note><unpitched><display-step>G</display-step><display-octave>5</display-octave></unpitched><duration>1</duration><instrument id="I1"/><notehead>x</notehead>
      <notations><technical><open/><fingering>R</fingering></technical></notations></note>
    <note><unpitched><display-step>C</display-step><display-octave>5</display-octave></unpitched><duration>1</duration><instrument id="I2"/>
      <lyric><text>L</text></lyric></note>
    <note><unpitched><display-step>A</display-step><display-octave>4</display-octave></unpitched><duration>1</duration><instrument id="I3"/></note>
    <note><unpitched><display-step>C</display-step><display-octave>5</display-octave></unpitched><duration>1</duration><instrument id="I2"/><notehead parentheses="yes">normal</notehead></note>
  </measure></part>
</score-partwise>`;

describe('MusicXML drum import', () => {
  const part = parseMusicXml(drumXml, 'd.musicxml', parseXml).parts[0];

  it('keeps voice, canonical key and sticking', () => {
    expect(part.isDrum).toBe(true);
    expect(part.notes.map((n) => n.drum)).toEqual(['hihatOpen', 'snare', 'floorTom', 'snareGhost']);
    expect(part.notes.map((n) => n.pitch)).toEqual([46, 38, 43, 38]);
    expect(part.notes.map((n) => n.hand)).toEqual(['R', 'L', undefined, undefined]);
    expect(part.notes[1].syl).toBeUndefined();
  });
});
