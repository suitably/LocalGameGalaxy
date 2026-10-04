import * as fflate from 'fflate';

import type { ScorePartInfo, InstrumentCategory } from '../types';

export interface ParsedSheetMusic {
    title: string;
    artist: string;
    baseBpm: number;
    xmlContent: string;
    parts: ScorePartInfo[];
}

/**
 * Extracts MusicXML from a compressed .mxl (ZIP) buffer using fflate.
 * Evaluates META-INF/container.xml to find the rootfile or falls back to the first .xml file.
 */
export function extractMusicXmlFromMxl(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const unzipped = fflate.unzipSync(bytes);

    let xmlString = '';

    // Check META-INF/container.xml
    const containerKey = Object.keys(unzipped).find(k => k.toLowerCase() === 'meta-inf/container.xml');
    if (containerKey) {
        const containerStr = fflate.strFromU8(unzipped[containerKey]);
        const match = containerStr.match(/full-path=["']([^"']+)["']/);
        if (match && match[1]) {
            const rootPath = match[1];
            if (unzipped[rootPath]) {
                xmlString = fflate.strFromU8(unzipped[rootPath]);
            }
        }
    }

    // Fallback: search for any .xml file not in META-INF
    if (!xmlString) {
        for (const [filename, fileBytes] of Object.entries(unzipped)) {
            if (filename.toLowerCase().endsWith('.xml') && !filename.toLowerCase().startsWith('meta-inf/')) {
                xmlString = fflate.strFromU8(fileBytes);
                break;
            }
        }
    }

    if (!xmlString) {
        throw new Error('No valid MusicXML file found inside .mxl archive');
    }

    return xmlString;
}

/**
 * Parses title, composer/artist, and tempo from MusicXML content.
 * If metadata is missing in XML, infers from file name (e.g. "nothing-else-matters-by-metallica.mxl").
 */
export function extractMetadataFromXml(xml: string, fileName?: string): { title: string; artist: string; baseBpm: number } {
    let title = '';
    let artist = '';
    let baseBpm = 100;

    // 1. Title from XML
    const workTitleMatch = xml.match(/<work-title>([\s\S]*?)<\/work-title>/i);
    const movementTitleMatch = xml.match(/<movement-title>([\s\S]*?)<\/movement-title>/i);
    if (workTitleMatch && workTitleMatch[1].trim()) {
        title = workTitleMatch[1].trim();
    } else if (movementTitleMatch && movementTitleMatch[1].trim()) {
        title = movementTitleMatch[1].trim();
    }

    // 2. Artist/Composer from XML
    const composerMatch = xml.match(/<creator[^>]*type=["']composer["'][^>]*>([\s\S]*?)<\/creator>/i) ||
        xml.match(/<creator[^>]*>([\s\S]*?)<\/creator>/i);
    if (composerMatch && composerMatch[1].trim()) {
        artist = composerMatch[1].trim();
    }

    // 3. Tempo / BPM from XML
    const tempoMatch = xml.match(/<sound[^>]*tempo=["'](\d+(?:\.\d+)?)["']/i) ||
        xml.match(/<per-minute>(\d+(?:\.\d+)?)<\/per-minute>/i);
    if (tempoMatch && tempoMatch[1]) {
        const parsedTempo = Math.round(Number(tempoMatch[1]));
        if (parsedTempo >= 20 && parsedTempo <= 300) {
            baseBpm = parsedTempo;
        }
    }

    // 4. Fallback from file name if title or artist is still empty
    if (fileName) {
        const cleanName = fileName.replace(/\.(mxl|xml|musicxml)$/i, '').trim();
        const byMatch = cleanName.match(/(.+?)[-_ ]+by[-_ ]+(.+)/i);
        const dashMatch = cleanName.match(/(.+?)[-_]+(.+)/);

        if (!title) {
            if (byMatch) {
                title = formatName(byMatch[1]);
            } else if (dashMatch) {
                title = formatName(dashMatch[1]);
            } else {
                title = formatName(cleanName);
            }
        }

        if (!artist) {
            if (byMatch) {
                artist = formatName(byMatch[2]);
            } else if (dashMatch) {
                artist = formatName(dashMatch[2]);
            } else {
                artist = 'Local';
            }
        }
    }

    if (!title) title = 'Untitled Sheet';
    if (!artist) artist = 'Unknown Artist';

    return { title, artist, baseBpm };
}

function formatName(str: string): string {
    return str
        .replace(/[-_]+/g, ' ')
        .trim()
        .replace(/\b\w/g, c => c.toUpperCase());
}

const INSTRUMENT_PALETTE = [
    '#f59e0b', // Amber / Gold (Guitar 1)
    '#3b82f6', // Blue (Flute / Vocals)
    '#10b981', // Emerald / Green (Guitar 2)
    '#8b5cf6', // Violet (Bass)
    '#ec4899', // Pink (Strings / Violins)
    '#ef4444', // Red (Drums)
    '#06b6d4', // Cyan (Alto Flute)
    '#f97316', // Orange (Guitar 3)
    '#a855f7', // Purple (Guitar 4)
    '#14b8a6', // Teal (Acoustic)
];

export function determineInstrumentCategory(name: string, midiProgram?: number): InstrumentCategory {
    const s = name.toLowerCase();
    if (s.includes('flute') || s.includes('pipe') || (midiProgram && midiProgram >= 73 && midiProgram <= 80)) return 'flute';
    if (s.includes('bass') || (midiProgram && midiProgram >= 33 && midiProgram <= 40)) return 'bass';
    if (s.includes('drum') || s.includes('percussion') || (midiProgram && midiProgram >= 113 && midiProgram <= 120)) return 'drums';
    if (s.includes('guitar') || (midiProgram && midiProgram >= 25 && midiProgram <= 32)) return 'guitar';
    if (s.includes('violin') || s.includes('string') || (midiProgram && midiProgram >= 41 && midiProgram <= 52)) return 'strings';
    if (s.includes('piano') || (midiProgram && midiProgram >= 1 && midiProgram <= 24)) return 'piano';
    return 'other';
}

export function extractPartsFromXml(xml: string): ScorePartInfo[] {
    const parts: ScorePartInfo[] = [];
    const partRegex = /<score-part\s+id="([^"]+)">([\s\S]*?)<\/score-part>/gi;
    let match: RegExpExecArray | null;
    let colorIdx = 0;

    while ((match = partRegex.exec(xml)) !== null) {
        const id = match[1];
        const content = match[2];
        const nameMatch = content.match(/<part-name>([\s\S]*?)<\/part-name>/i);
        const instNameMatch = content.match(/<instrument-name>([\s\S]*?)<\/instrument-name>/i);
        const midiProgramMatch = content.match(/<midi-program>(\d+)<\/midi-program>/i);
        const midiChannelMatch = content.match(/<midi-channel>(\d+)<\/midi-channel>/i);

        const name = nameMatch ? nameMatch[1].trim() : id;
        const instrumentName = instNameMatch ? instNameMatch[1].trim() : name;
        const midiProgram = midiProgramMatch ? parseInt(midiProgramMatch[1], 10) : undefined;
        const midiChannel = midiChannelMatch ? parseInt(midiChannelMatch[1], 10) : undefined;

        const category = determineInstrumentCategory(`${name} ${instrumentName}`, midiProgram);
        const color = INSTRUMENT_PALETTE[colorIdx % INSTRUMENT_PALETTE.length];
        colorIdx++;

        parts.push({
            id,
            name,
            instrumentName,
            midiProgram,
            midiChannel,
            color,
            category,
        });
    }

    if (parts.length === 0) {
        parts.push({
            id: 'P1',
            name: 'Lead',
            instrumentName: 'Lead Instrument',
            midiProgram: 1,
            color: INSTRUMENT_PALETTE[0],
            category: 'piano',
        });
    }

    return parts;
}

/**
 * Loads and parses a File object (.mxl, .xml, or .musicxml)
 */
export async function loadMusicXmlFile(file: File): Promise<ParsedSheetMusic> {
    const isMxl = file.name.toLowerCase().endsWith('.mxl');
    let xmlContent = '';

    if (isMxl) {
        const arrayBuffer = await file.arrayBuffer();
        xmlContent = extractMusicXmlFromMxl(arrayBuffer);
    } else {
        xmlContent = await file.text();
    }

    const { title, artist, baseBpm } = extractMetadataFromXml(xmlContent, file.name);
    const parts = extractPartsFromXml(xmlContent);

    return {
        title,
        artist,
        baseBpm,
        xmlContent,
        parts
    };
}

const STEP_MAP: Record<number, number> = { 0: 0, 1: 2, 2: 4, 3: 5, 4: 7, 5: 9, 6: 11 };

export function midiNoteFromPitchObject(pitch: { getHalfTone?: () => number; FundamentalNote?: number; Octave?: number; AccidentalHalfTones?: number } | null | undefined): number | null {
    if (!pitch) return null;
    if (typeof pitch.getHalfTone === 'function') {
        return pitch.getHalfTone() + 12;
    }
    const fundamental = pitch.FundamentalNote;
    const octave = pitch.Octave;
    const halfTone = pitch.AccidentalHalfTones ?? 0;
    if (fundamental !== undefined && octave !== undefined) {
        return (octave + 1) * 12 + (STEP_MAP[fundamental] ?? 0) + halfTone;
    }
    return null;
}
