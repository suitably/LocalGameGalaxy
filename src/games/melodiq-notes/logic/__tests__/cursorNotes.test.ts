import { describe, it, expect, vi } from 'vitest';
import { extractCursorData } from '../cursorNotes';
import type { Cursor } from 'opensheetmusicdisplay';

describe('extractCursorData', () => {
    it('returns empty notes and default stepDuration when cursor is null or undefined', () => {
        expect(extractCursorData(null)).toEqual({ targetNotes: [], stepDuration: 0.25 });
        expect(extractCursorData(undefined)).toEqual({ targetNotes: [], stepDuration: 0.25 });
    });

    it('returns empty notes when iterator has EndReached = true', () => {
        const mockCursor = {
            iterator: {
                EndReached: true
            }
        } as unknown as Cursor;

        expect(extractCursorData(mockCursor)).toEqual({ targetNotes: [], stepDuration: 0.25 });
    });

    it('extracts multiple voices with independent durations and computes stepDuration from iterator clone', () => {
        // Staff 1 (voice 1): Dotted quarter note (duration: 0.375, pitch MIDI 67 = G4)
        // Staff 2 (voice 2): Eighth note (duration: 0.125, pitch MIDI 48 = C3)
        const mockVoiceEntries = [
            {
                Notes: [
                    {
                        Pitch: { getHalfTone: () => 55 }, // 55 + 12 = 67
                        Length: { RealValue: 0.375 }
                    }
                ]
            },
            {
                Notes: [
                    {
                        Pitch: { getHalfTone: () => 36 }, // 36 + 12 = 48
                        Length: { RealValue: 0.125 }
                    }
                ]
            }
        ];

        const mockCloneIterator = {
            EndReached: false,
            CurrentSourceTimestamp: { RealValue: 0.125 },
            moveToNext: vi.fn()
        };

        const mockIterator = {
            EndReached: false,
            CurrentSourceTimestamp: { RealValue: 0.0 },
            clone: vi.fn(() => mockCloneIterator)
        };

        const mockCursor = {
            iterator: mockIterator,
            VoicesUnderCursor: vi.fn(() => mockVoiceEntries)
        } as unknown as Cursor;

        const result = extractCursorData(mockCursor);

        expect(mockIterator.clone).toHaveBeenCalled();
        expect(mockCloneIterator.moveToNext).toHaveBeenCalled();
        expect(result.stepDuration).toBe(0.125);
        expect(result.targetNotes).toHaveLength(2);

        // First note preserves dotted quarter duration 0.375
        expect(result.targetNotes[0]).toMatchObject({
            pitch: 67,
            duration: 0.375,
            stepDuration: 0.125,
            isRest: false
        });

        // Second note preserves eighth note duration 0.125
        expect(result.targetNotes[1]).toMatchObject({
            pitch: 48,
            duration: 0.125,
            stepDuration: 0.125,
            isRest: false
        });
    });

    it('handles rest cursor position correctly', () => {
        const mockVoiceEntries = [
            {
                Notes: [
                    {
                        Pitch: null,
                        Length: { RealValue: 0.25 }
                    }
                ]
            }
        ];

        const mockCloneIterator = {
            EndReached: false,
            CurrentSourceTimestamp: { RealValue: 0.25 },
            moveToNext: vi.fn()
        };

        const mockIterator = {
            EndReached: false,
            CurrentSourceTimestamp: { RealValue: 0.0 },
            clone: vi.fn(() => mockCloneIterator)
        };

        const mockCursor = {
            iterator: mockIterator,
            VoicesUnderCursor: vi.fn(() => mockVoiceEntries)
        } as unknown as Cursor;

        const result = extractCursorData(mockCursor);

        expect(result.stepDuration).toBe(0.25);
        expect(result.targetNotes).toHaveLength(1);
        expect(result.targetNotes[0]).toMatchObject({
            pitch: 0,
            duration: 0.25,
            stepDuration: 0.25,
            isRest: true
        });
    });

    it('falls back to note duration when clone.EndReached is true (end of score)', () => {
        const mockVoiceEntries = [
            {
                Notes: [
                    {
                        Pitch: { getHalfTone: () => 60 },
                        Length: { RealValue: 1.0 } // Whole note at end
                    }
                ]
            }
        ];

        const mockCloneIterator = {
            EndReached: true,
            CurrentSourceTimestamp: { RealValue: 99999 },
            moveToNext: vi.fn()
        };

        const mockIterator = {
            EndReached: false,
            CurrentSourceTimestamp: { RealValue: 16.0 },
            clone: vi.fn(() => mockCloneIterator)
        };

        const mockCursor = {
            iterator: mockIterator,
            VoicesUnderCursor: vi.fn(() => mockVoiceEntries)
        } as unknown as Cursor;

        const result = extractCursorData(mockCursor);

        expect(result.stepDuration).toBe(1.0);
        expect(result.targetNotes[0]).toMatchObject({
            pitch: 72,
            duration: 1.0,
            stepDuration: 1.0,
            isRest: false
        });
    });

    it('processes real two-staff simultaneous voices MusicXML correctly', async () => {
        const { MusicSheetReader, TemposCalculator, IXmlElement } = await import('opensheetmusicdisplay');
        const { DOMParser } = await import('@xmldom/xmldom');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>6</beats><beat-type>8</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
      <!-- Staff 1: Dotted quarter note (duration 6 = 3 eighths = 0.375) -->
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>6</duration>
        <voice>1</voice>
        <type>quarter</type>
        <dot/>
        <staff>1</staff>
      </note>
      <note>
        <chord/>
        <pitch><step>E</step><octave>5</octave></pitch>
        <duration>6</duration>
        <voice>1</voice>
        <type>quarter</type>
        <dot/>
        <staff>1</staff>
      </note>
      <backup><duration>6</duration></backup>
      <!-- Staff 2: 3 consecutive eighth notes (duration 2 each = 0.125) -->
      <note>
        <pitch><step>C</step><octave>3</octave></pitch>
        <duration>2</duration>
        <voice>5</voice>
        <type>eighth</type>
        <staff>2</staff>
      </note>
      <note>
        <pitch><step>G</step><octave>3</octave></pitch>
        <duration>2</duration>
        <voice>5</voice>
        <type>eighth</type>
        <staff>2</staff>
      </note>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>2</duration>
        <voice>5</voice>
        <type>eighth</type>
        <staff>2</staff>
      </note>
    </measure>
  </part>
</score-partwise>`;

        // Setup global Node constant if missing in test environment
        if (typeof globalThis.Node === 'undefined') {
            (globalThis as unknown as { Node: Record<string, number> }).Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 };
        }

        const doc = new DOMParser().parseFromString(xml, 'application/xml');
        let rootNode: Element | undefined;
        for (let i = 0; i < doc.childNodes.length; i++) {
            const child = doc.childNodes[i] as unknown as Element;
            if (child.nodeType === 1 && child.nodeName.toLowerCase() === 'score-partwise') {
                rootNode = child;
                break;
            }
        }

        expect(rootNode).toBeDefined();
        const xmlElem = new IXmlElement(rootNode as unknown as Element);
        const reader = new MusicSheetReader([new TemposCalculator()]);
        const sheet = reader.createMusicSheet(xmlElem, 'TestScore');
        expect(sheet).toBeDefined();

        const iterator = sheet.MusicPartManager.getIterator();
        const cursorMock = {
            iterator,
            VoicesUnderCursor() {
                return iterator.CurrentVisibleVoiceEntries();
            }
        } as unknown as Cursor;

        // Step 0: t=0. Staff 1 has G4 & E5 (0.375), Staff 2 has C3 (0.125).
        // Step duration should be 0.125 (distance to the next 8th note).
        const step0 = extractCursorData(cursorMock);
        expect(step0.stepDuration).toBe(0.125);
        expect(step0.targetNotes).toHaveLength(3);
        expect(step0.targetNotes.map(n => n.pitch)).toEqual([67, 76, 48]);
        expect(step0.targetNotes[0].duration).toBe(0.375); // G4 dotted quarter
        expect(step0.targetNotes[1].duration).toBe(0.375); // E5 dotted quarter
        expect(step0.targetNotes[2].duration).toBe(0.125); // C3 eighth note

        // Step 1: t=0.125. Upper line is still sounding. Lower line has G3 (0.125).
        iterator.moveToNext();
        const step1 = extractCursorData(cursorMock);
        expect(step1.stepDuration).toBe(0.125);
        expect(step1.targetNotes).toHaveLength(1);
        expect(step1.targetNotes[0].pitch).toBe(55); // G3
        expect(step1.targetNotes[0].duration).toBe(0.125);

        // Step 2: t=0.25. Upper line is still sounding. Lower line has C4 (0.125).
        iterator.moveToNext();
        const step2 = extractCursorData(cursorMock);
        expect(step2.targetNotes).toHaveLength(1);
        expect(step2.targetNotes[0].pitch).toBe(60); // C4
        expect(step2.targetNotes[0].duration).toBe(0.125);
    });

    it('correctly tags tie start notes and tied continuation notes', () => {
        const mockStartNote = {
            Pitch: { getHalfTone: () => 57 }, // MIDI 69
            Length: { RealValue: 0.125 },
            NoteTie: null as unknown
        };
        const mockTie = {
            StartNote: mockStartNote,
            Duration: { RealValue: 0.375 },
            Notes: [mockStartNote]
        };
        mockStartNote.NoteTie = mockTie;

        const mockContinuationNote = {
            Pitch: { getHalfTone: () => 57 }, // MIDI 69
            Length: { RealValue: 0.25 },
            NoteTie: mockTie
        };

        const mockIterator = {
            EndReached: false,
            CurrentSourceTimestamp: { RealValue: 0.0 },
            clone: vi.fn(() => ({
                EndReached: false,
                CurrentSourceTimestamp: { RealValue: 0.125 },
                moveToNext: vi.fn()
            }))
        };

        // 1. Cursor at tie start note
        const cursorAtStart = {
            iterator: mockIterator,
            VoicesUnderCursor: vi.fn(() => [{ Notes: [mockStartNote] }])
        } as unknown as Cursor;

        const startResult = extractCursorData(cursorAtStart);
        expect(startResult.targetNotes).toHaveLength(1);
        expect(startResult.targetNotes[0].isTieStart).toBe(true);
        expect(startResult.targetNotes[0].isTiedContinuation).toBe(false);
        // Receives combined tie duration so it sounds continuously across both notes
        expect(startResult.targetNotes[0].duration).toBe(0.375);

        // 2. Cursor at tied continuation note
        const cursorAtContinuation = {
            iterator: mockIterator,
            VoicesUnderCursor: vi.fn(() => [{ Notes: [mockContinuationNote] }])
        } as unknown as Cursor;

        const contResult = extractCursorData(cursorAtContinuation);
        expect(contResult.targetNotes).toHaveLength(1);
        expect(contResult.targetNotes[0].isTieStart).toBe(false);
        expect(contResult.targetNotes[0].isTiedContinuation).toBe(true);
        expect(contResult.targetNotes[0].duration).toBe(0.25);
    });
});
