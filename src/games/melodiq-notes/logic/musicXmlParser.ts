import * as fflate from 'fflate';

export interface ParsedSheetMusic {
    title: string;
    artist: string;
    baseBpm: number;
    xmlContent: string;
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

    return {
        title,
        artist,
        baseBpm,
        xmlContent
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
