import { describe, it, expect } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { extractGpif, parseGuitarPro } from '../guitarPro';
import { ScoreImportError } from '../musicXml';
import { parseXml } from './fixtures';

const props = (...p: string[]) => `<Properties>${p.join('')}</Properties>`;
const fret = (string: number, f: number) =>
  `<Property name="String"><String>${string}</String></Property><Property name="Fret"><Fret>${f}</Fret></Property>`;
const midi = (n: number) => `<Property name="Midi"><Number>${n}</Number></Property>`;
const tie = (origin: boolean, destination: boolean) =>
  `<Tie origin="${origin}" destination="${destination}" />`;
const beat = (id: number, rhythm: number, notes: string, extra = '') =>
  `<Beat id="${id}">${extra}<Rhythm ref="${rhythm}" />${notes ? `<Notes>${notes}</Notes>` : ''}</Beat>`;
const art = (name: string, key: number) =>
  `<Articulation><Name>${name}</Name><OutputMidiNumber>${key}</OutputMidiNumber></Articulation>`;

/**
 * Three written bars: |: bar 1 | [1. bar 2 :| [2. bar 3 |
 * Guitar: a dotted half tied to a quarter (a grace note between them is skipped), a note given
 * only by its MIDI number next to a dead note, and C# triplets. Drums in bar 1 only.
 * Tempo 120 per quarter, then 60 per eighth halfway through bar 3.
 */
const GPIF = `<?xml version="1.0" encoding="utf-8"?>
<GPIF>
<Score><Title>Test Song</Title><Artist>Tester</Artist></Score>
<MasterTrack><Tracks>0 1</Tracks><Automations>
<Automation><Type>Tempo</Type><Bar>0</Bar><Position>0</Position><Value>120 2</Value></Automation>
<Automation><Type>Tempo</Type><Bar>2</Bar><Position>0.5</Position><Value>60 1</Value></Automation>
</Automations></MasterTrack>
<Tracks>
<Track id="0"><Name>Overdriven Guitar</Name>
<InstrumentSet><Type>electricGuitar</Type></InstrumentSet>
<MidiConnection><PrimaryChannel>0</PrimaryChannel></MidiConnection>
<Staves><Staff>${props(
  '<Property name="CapoFret"><Fret>0</Fret></Property>',
  '<Property name="Tuning"><Pitches>40 45 50 55 59 64</Pitches></Property>',
)}</Staff></Staves>
<Sounds><Sound><MIDI><Program>29</Program></MIDI></Sound></Sounds></Track>
<Track id="1"><Name>Drums</Name>
<InstrumentSet><Type>drumKit</Type><Elements><Element><Articulations>${art('Snare (hit)', 38)}${art('Hi-Hat (open)', 46)}</Articulations></Element>
<Element><Articulations>${art('Kick (hit)', 36)}</Articulations></Element></Elements></InstrumentSet>
<MidiConnection><PrimaryChannel>9</PrimaryChannel></MidiConnection>
<Sounds><Sound><MIDI><Program>0</Program></MIDI></Sound></Sounds></Track>
</Tracks>
<MasterBars>
<MasterBar><Time>4/4</Time><Repeat start="true" end="false" count="0" /><Bars>0 10</Bars></MasterBar>
<MasterBar><Time>4/4</Time><AlternateEndings>1</AlternateEndings><Repeat start="false" end="true" count="2" /><Bars>1 11</Bars></MasterBar>
<MasterBar><Time>4/4</Time><AlternateEndings>2</AlternateEndings><Bars>2 11</Bars></MasterBar>
</MasterBars>
<Bars>
<Bar id="0"><Voices>0 -1 -1 -1</Voices></Bar>
<Bar id="1"><Voices>1 -1 -1 -1</Voices></Bar>
<Bar id="2"><Voices>2 -1 -1 -1</Voices></Bar>
<Bar id="10"><Voices>10 -1 -1 -1</Voices></Bar>
<Bar id="11"><Voices>-1 -1 -1 -1</Voices></Bar>
</Bars>
<Voices>
<Voice id="0"><Beats>0 1 2</Beats></Voice>
<Voice id="1"><Beats>3</Beats></Voice>
<Voice id="2"><Beats>4 5 6 7</Beats></Voice>
<Voice id="10"><Beats>10 11</Beats></Voice>
</Voices>
<Beats>
${beat(0, 1, '0')}
${beat(1, 2, '1', '<GraceNotes>BeforeBeat</GraceNotes>')}
${beat(2, 0, '2')}
${beat(3, 0, '3 4')}
${beat(4, 3, '5')}
${beat(5, 3, '5')}
${beat(6, 3, '5')}
${beat(7, 1, '')}
${beat(10, 0, '10 11')}
${beat(11, 0, '12')}
</Beats>
<Notes>
<Note id="0">${props(fret(0, 3))}${tie(true, false)}</Note>
<Note id="1">${props(fret(1, 0))}</Note>
<Note id="2">${props(fret(0, 3))}${tie(false, true)}</Note>
<Note id="3">${props(midi(76))}</Note>
<Note id="4">${props(fret(2, 0), '<Property name="Muted"><Enable /></Property>')}</Note>
<Note id="5">${props('<Property name="ConcertPitch"><Pitch><Step>C</Step><Accidental>#</Accidental><Octave>4</Octave></Pitch></Property>')}</Note>
<Note id="10">${props(midi(38))}<InstrumentArticulation>0</InstrumentArticulation></Note>
<Note id="11">${props(midi(36))}<InstrumentArticulation>2</InstrumentArticulation></Note>
<Note id="12">${props(midi(46))}<InstrumentArticulation>1</InstrumentArticulation></Note>
</Notes>
<Rhythms>
<Rhythm id="0"><NoteValue>Quarter</NoteValue></Rhythm>
<Rhythm id="1"><AugmentationDot count="1" /><NoteValue>Half</NoteValue></Rhythm>
<Rhythm id="2"><NoteValue>Eighth</NoteValue></Rhythm>
<Rhythm id="3"><NoteValue>Eighth</NoteValue><PrimaryTuplet num="3" den="2" /></Rhythm>
</Rhythms>
</GPIF>`;

describe('parseGuitarPro', () => {
  const song = parseGuitarPro(GPIF, 'test.gp', parseXml);
  const notesOf = (i: number) =>
    song.parts[i].notes.map((n) => [n.t, Math.round(n.dur * 1000) / 1000, n.pitch]);

  it('reads metadata, repeats with endings and tempo in quarter notes', () => {
    expect([song.title, song.artist]).toEqual(['Test Song', 'Tester']);
    expect(song.measureNumbers).toEqual([1, 2, 1, 3]);
    expect(song.measureStarts).toEqual([0, 4, 8, 12]);
    expect(song.end).toBe(16);
    expect(song.tempoMap).toEqual([
      { beat: 0, bpm: 120 },
      { beat: 14, bpm: 30 },
    ]);
  });

  it('turns every track into a part', () => {
    expect(song.parts.map((p) => [p.name, p.guess, p.isDrum, p.program])).toEqual([
      ['Overdriven Guitar', 'guitar', false, 29],
      ['Drums', 'drums', true, 0],
    ]);
  });

  it('reads string and fret, merges ties, skips grace and dead notes, handles tuplets', () => {
    expect(notesOf(0).map(([t, d, p]) => [Math.round(Number(t) * 1000) / 1000, d, p])).toEqual([
      [0, 4, 43],
      [4, 1, 76],
      [8, 4, 43],
      [12, 0.333, 61],
      [12.333, 0.333, 61],
      [12.667, 0.333, 61],
    ]);
  });

  it('names drum voices from the kit articulations', () => {
    expect(notesOf(1)).toEqual([
      [0, 1, 36],
      [0, 1, 38],
      [1, 1, 46],
      [8, 1, 36],
      [8, 1, 38],
      [9, 1, 46],
    ]);
    expect(song.parts[1].notes.map((n) => n.drum)).toEqual([
      'kick',
      'snare',
      'hihatOpen',
      'kick',
      'snare',
      'hihatOpen',
    ]);
  });

  it('rejects other XML', () => {
    expect(() => parseGuitarPro('<score-partwise/>', 'x.gp', parseXml)).toThrow(ScoreImportError);
  });
});

describe('extractGpif', () => {
  it('reads score.gpif from the archive', () => {
    const zip = zipSync({ VERSION: strToU8('7.0'), 'Content/score.gpif': strToU8(GPIF) });
    expect(extractGpif(zip)).toBe(GPIF);
  });

  it('rejects older Guitar Pro files and archives without a score', () => {
    expect(() => extractGpif(strToU8('\x18FICHIER GUITAR PRO v5.00'))).toThrow(ScoreImportError);
    expect(() => extractGpif(zipSync({ VERSION: strToU8('7.0') }))).toThrow(ScoreImportError);
  });
});
