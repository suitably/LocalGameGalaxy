import { describe, it, expect } from 'vitest';
import { midiNoteFromPitchObject, extractMetadataFromXml } from '../musicXmlParser';

describe('midiNoteFromPitchObject', () => {
    it('computes MIDI note from FundamentalNote and Octave', () => {
        // C4 = octave 4, fundamental 0 -> (4 + 1) * 12 + 0 = 60
        expect(midiNoteFromPitchObject({ FundamentalNote: 0, Octave: 4 })).toBe(60);
        // A4 = octave 4, fundamental 5 -> (4 + 1) * 12 + 9 = 69
        expect(midiNoteFromPitchObject({ FundamentalNote: 5, Octave: 4 })).toBe(69);
        // C#4 with accidental
        expect(midiNoteFromPitchObject({ FundamentalNote: 0, Octave: 4, AccidentalHalfTones: 1 })).toBe(61);
    });

    it('uses getHalfTone if available', () => {
        expect(midiNoteFromPitchObject({ getHalfTone: () => 48 })).toBe(60);
    });

    it('returns null for null/undefined pitch (rests)', () => {
        expect(midiNoteFromPitchObject(null)).toBeNull();
        expect(midiNoteFromPitchObject(undefined)).toBeNull();
    });
});

describe('extractMetadataFromXml', () => {
    it('extracts work-title, creator, and per-minute sound tempo', () => {
        const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
        <score-partwise version="3.1">
            <work><work-title>Nothing Else Matters</work-title></work>
            <identification><creator type="composer">Metallica</creator></identification>
            <part id="P1">
                <measure number="1">
                    <direction>
                        <sound tempo="142"/>
                    </direction>
                </measure>
            </part>
        </score-partwise>`;

        const meta = extractMetadataFromXml(sampleXml, 'test.xml');
        expect(meta.title).toBe('Nothing Else Matters');
        expect(meta.artist).toBe('Metallica');
        expect(meta.baseBpm).toBe(142);
    });

    it('falls back to filename and splits title and artist on -by-', () => {
        const minimalXml = `<score-partwise></score-partwise>`;
        const meta = extractMetadataFromXml(minimalXml, 'nothing-else-matters-by-metallica.mxl');
        expect(meta.title).toBe('Nothing Else Matters');
        expect(meta.artist).toBe('Metallica');
        expect(meta.baseBpm).toBe(100);
    });
});
