import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { XmlParser } from '../types';

export const parseXml: XmlParser = (text) =>
  new DOMParser().parseFromString(text, 'application/xml') as unknown as Document;
export const serializeXml = (doc: Document) => new XMLSerializer().serializeToString(doc as never);

const note = (step: string, octave: number, duration: number, extra = '') =>
  `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration><voice>1</voice>${extra}</note>`;

/**
 * Three written bars: |: bar 1 | [1. bar 2 :| [2. bar 3 |
 * Piano with tempo 90 then 120, a lyric, and a tie from bar 1 into bar 2;
 * drums via unpitched instruments; a guitar written an octave above sounding pitch.
 */
export const REPEAT_SCORE = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>Test Song</work-title></work>
  <identification><creator type="composer">Tester</creator></identification>
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name><midi-instrument id="P1-I1"><midi-channel>1</midi-channel><midi-program>1</midi-program></midi-instrument></score-part>
    <score-part id="P2"><part-name>Drumset</part-name>
      <score-instrument id="P2-I36"><instrument-name>Bass Drum</instrument-name></score-instrument>
      <midi-instrument id="P2-I36"><midi-channel>10</midi-channel><midi-unpitched>37</midi-unpitched></midi-instrument>
      <midi-instrument id="P2-I39"><midi-channel>10</midi-channel><midi-unpitched>39</midi-unpitched></midi-instrument>
    </score-part>
    <score-part id="P3"><part-name>Electric Guitar</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <barline location="left"><repeat direction="forward"/></barline>
      <direction><sound tempo="90"/></direction>
      ${note('C', 4, 4, '<lyric><syllabic>begin</syllabic><text>Hal</text></lyric>')}
      ${note('E', 4, 4, '<tie type="start"/>')}
    </measure>
    <measure number="2">
      <barline location="left"><ending number="1" type="start"/></barline>
      ${note('E', 4, 4, '<tie type="stop"/>')}
      <note><rest/><duration>4</duration></note>
      <barline location="right"><ending number="1" type="stop"/><repeat direction="backward"/></barline>
    </measure>
    <measure number="3">
      <barline location="left"><ending number="2" type="start"/></barline>
      <direction><sound tempo="120"/></direction>
      ${note('G', 4, 8)}
      ${'<note><chord/><pitch><step>B</step><alter>-1</alter><octave>4</octave></pitch><duration>8</duration><voice>1</voice></note>'}
      <barline location="right"><ending number="2" type="stop"/></barline>
    </measure>
  </part>
  <part id="P2">
    <measure number="1"><attributes><divisions>1</divisions></attributes>
      <note><unpitched><display-step>F</display-step><display-octave>4</display-octave></unpitched><duration>2</duration><instrument id="P2-I36"/><voice>1</voice></note>
      <note><unpitched><display-step>C</display-step><display-octave>5</display-octave></unpitched><duration>2</duration><instrument id="P2-I39"/><voice>1</voice></note>
    </measure>
    <measure number="2"><note><rest/><duration>4</duration></note></measure>
    <measure number="3"><note><rest/><duration>4</duration></note></measure>
  </part>
  <part id="P3">
    <measure number="1"><attributes><divisions>1</divisions><transpose><diatonic>0</diatonic><chromatic>0</chromatic><octave-change>-1</octave-change></transpose></attributes>
      ${note('E', 4, 4)}
    </measure>
    <measure number="2"><note><rest/><duration>4</duration></note></measure>
    <measure number="3"><note><rest/><duration>4</duration></note></measure>
  </part>
</score-partwise>`;

/** Builds a Standard MIDI File (format 1) from raw track event bytes. */
export function buildMidi(ppq: number, tracks: number[][]): Uint8Array {
  const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  const u16 = (n: number) => [(n >>> 8) & 255, n & 255];
  const bytes = [0x4d, 0x54, 0x68, 0x64, ...u32(6), ...u16(1), ...u16(tracks.length), ...u16(ppq)];
  for (const t of tracks) bytes.push(0x4d, 0x54, 0x72, 0x6b, ...u32(t.length), ...t);
  return Uint8Array.from(bytes);
}

/** Variable-length quantity as used for MIDI delta times. */
export function vlq(n: number): number[] {
  const out = [n & 0x7f];
  for (let v = n >> 7; v > 0; v >>= 7) out.unshift((v & 0x7f) | 0x80);
  return out;
}

export const textMeta = (type: number, text: string) => {
  const b = Array.from(new TextEncoder().encode(text));
  return [0xff, type, ...vlq(b.length), ...b];
};
