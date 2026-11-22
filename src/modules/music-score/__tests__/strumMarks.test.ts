import { describe, expect, it } from 'vitest';
import { parseGuitarPro } from '../guitarPro';
import { parseMusicXml } from '../musicXml';
import { gpStrum, xmlStrum } from '../strumMarks';
import { parseXml } from './fixtures';

const el = (xml: string) => parseXml(xml).documentElement as unknown as Element;

const chordNote = (step: string, chord: boolean, tech = '') =>
  `<note>${chord ? '<chord/>' : ''}<pitch><step>${step}</step><octave>3</octave></pitch><duration>2</duration><voice>1</voice>${
    tech ? `<notations><technical>${tech}</technical></notations>` : ''
  }</note>`;

/** One bar of guitar: a down-bow chord, an up-bow chord, then an unmarked chord (half notes). */
const SCORE = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Guitar</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      ${chordNote('E', false, '<down-bow/>')}${chordNote('B', true, '<down-bow/>')}
      ${chordNote('A', false, '<up-bow/>')}${chordNote('E', true, '<up-bow/>')}
    </measure>
    <measure number="2">
      ${chordNote('D', false)}${chordNote('A', true)}
    </measure>
  </part>
</score-partwise>`;

describe('strum marks (#634)', () => {
  it('reads MusicXML bowing as stroke direction', () => {
    expect(
      xmlStrum(el('<note><notations><technical><down-bow/></technical></notations></note>')),
    ).toBe('down');
    expect(
      xmlStrum(el('<note><notations><technical><up-bow/></technical></notations></note>')),
    ).toBe('up');
    expect(
      xmlStrum(el('<note><notations><arpeggiate direction="up"/></notations></note>')),
    ).toBeUndefined();
  });

  it('reads Guitar Pro pick stroke and brush directions', () => {
    expect(gpStrum(el('<Property name="PickStroke"><Direction>Down</Direction></Property>'))).toBe(
      'down',
    );
    expect(gpStrum(el('<Property name="Brush"><Direction>Up</Direction></Property>'))).toBe('up');
    expect(gpStrum(null)).toBeUndefined();
  });

  it('carries the marks onto the parsed notes, unmarked notes get none', () => {
    const song = parseMusicXml(SCORE, 'strum.musicxml', parseXml);
    const notes = song.parts[0].notes;
    expect(notes.filter((n) => n.t === 0).map((n) => n.strum)).toEqual(['down', 'down']);
    expect(notes.filter((n) => n.t === 1).map((n) => n.strum)).toEqual(['up', 'up']);
    expect(notes.filter((n) => n.t === 4).every((n) => n.strum === undefined)).toBe(true);
  });

  it('carries a Guitar Pro beat stroke onto its notes', () => {
    const gpif = `<GPIF>
      <Score><Title>S</Title></Score>
      <MasterTrack><Tracks>0</Tracks></MasterTrack>
      <Tracks><Track id="0"><Name>Guitar</Name></Track></Tracks>
      <MasterBars><MasterBar><Time>4/4</Time><Bars>0</Bars></MasterBar></MasterBars>
      <Bars><Bar id="0"><Voices>0 -1 -1 -1</Voices></Bar></Bars>
      <Voices><Voice id="0"><Beats>0</Beats></Voice></Voices>
      <Beats><Beat id="0"><Rhythm ref="0" /><Notes>0 1</Notes>
        <Properties><Property name="PickStroke"><Direction>Up</Direction></Property></Properties>
      </Beat></Beats>
      <Notes>
        <Note id="0"><Properties><Property name="Midi"><Number>52</Number></Property></Properties></Note>
        <Note id="1"><Properties><Property name="Midi"><Number>59</Number></Property></Properties></Note>
      </Notes>
      <Rhythms><Rhythm id="0"><NoteValue>Whole</NoteValue></Rhythm></Rhythms>
    </GPIF>`;
    const song = parseGuitarPro(gpif, 'strum.gp', parseXml);
    expect(song.parts[0].notes.map((n) => n.strum)).toEqual(['up', 'up']);
  });
});
