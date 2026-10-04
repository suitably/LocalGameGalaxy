import { useMemo } from 'react';
import type { ScorePartInfo, TimelineTrack, TimelineNote } from '../types';

const STEP_OFFSETS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * Extracts note events with absolute beat timestamps for all parts from MusicXML.
 * Powers the Modern Note Highway / Piano Roll visualizer.
 */
export function extractTimelineTracks(xml: string, parts: ScorePartInfo[]): TimelineTrack[] {
    const tracks: TimelineTrack[] = [];
    if (!xml) return tracks;

    let doc: Document;
    try {
        const parser = new DOMParser();
        doc = parser.parseFromString(xml, 'text/xml');
    } catch {
        return tracks;
    }

    const partsMap = new Map(parts.map(p => [p.id, p]));
    const partNodes = doc.getElementsByTagName('part');

    for (let i = 0; i < partNodes.length; i++) {
        const partEl = partNodes[i];
        const partId = partEl.getAttribute('id') || '';
        const part = partsMap.get(partId);
        if (!part) continue;

        const measureNodes = partEl.getElementsByTagName('measure');
        const notes: TimelineNote[] = [];
        let accumulatedBeats = 0;
        let currentDivisions = 1;

        for (let m = 0; m < measureNodes.length; m++) {
            const mEl = measureNodes[m];

            const divEl = mEl.getElementsByTagName('divisions')[0];
            if (divEl?.textContent) {
                const parsedDiv = parseInt(divEl.textContent.trim(), 10);
                if (parsedDiv > 0) currentDivisions = parsedDiv;
            }

            let measureLengthBeats = 4;
            const beatsEl = mEl.getElementsByTagName('beats')[0];
            const beatTypeEl = mEl.getElementsByTagName('beat-type')[0];
            if (beatsEl?.textContent && beatTypeEl?.textContent) {
                const beats = parseInt(beatsEl.textContent.trim(), 10);
                const beatType = parseInt(beatTypeEl.textContent.trim(), 10);
                if (beats > 0 && beatType > 0) measureLengthBeats = beats * (4 / beatType);
            }

            let measureBeats = 0;
            let prevNoteStart = 0;
            let maxMeasureBeats = 0;

            const children = mEl.children;
            for (let c = 0; c < children.length; c++) {
                const child = children[c];
                const tag = child.tagName.toLowerCase();

                if (tag === 'backup') {
                    const durEl = child.getElementsByTagName('duration')[0];
                    const dur = durEl ? parseInt(durEl.textContent || '0', 10) / currentDivisions : 0;
                    measureBeats = Math.max(0, measureBeats - dur);
                } else if (tag === 'forward') {
                    const durEl = child.getElementsByTagName('duration')[0];
                    const dur = durEl ? parseInt(durEl.textContent || '0', 10) / currentDivisions : 0;
                    measureBeats += dur;
                    if (measureBeats > maxMeasureBeats) maxMeasureBeats = measureBeats;
                } else if (tag === 'note') {
                    const durEl = child.getElementsByTagName('duration')[0];
                    const dur = durEl ? parseInt(durEl.textContent || '0', 10) / currentDivisions : 0;
                    const isChord = child.getElementsByTagName('chord').length > 0;
                    const isRest = child.getElementsByTagName('rest').length > 0;

                    const noteStartInMeasure = isChord ? prevNoteStart : measureBeats;
                    if (!isChord) {
                        prevNoteStart = measureBeats;
                        measureBeats += dur;
                        if (measureBeats > maxMeasureBeats) maxMeasureBeats = measureBeats;
                    }

                    const pitchEl = child.getElementsByTagName('pitch')[0];
                    if (pitchEl && !isRest) {
                        const step = pitchEl.getElementsByTagName('step')[0]?.textContent?.trim().toUpperCase();
                        const octaveStr = pitchEl.getElementsByTagName('octave')[0]?.textContent?.trim();
                        const alterStr = pitchEl.getElementsByTagName('alter')[0]?.textContent?.trim();

                        if (step && octaveStr) {
                            const octave = parseInt(octaveStr, 10);
                            const alter = alterStr ? parseInt(alterStr, 10) : 0;
                            const pitch = (octave + 1) * 12 + (STEP_OFFSETS[step] ?? 0) + alter;
                            const noteName = `${step}${alter > 0 ? '#' : alter < 0 ? 'b' : ''}${octave}`;

                            notes.push({
                                id: `${part.id}_${notes.length}`,
                                pitch,
                                noteName,
                                startBeats: accumulatedBeats + noteStartInMeasure,
                                durationBeats: Math.max(0.1, dur),
                                isRest: false,
                                partId: part.id,
                                color: part.color,
                            });
                        }
                    }
                }
            }

            accumulatedBeats += Math.max(measureLengthBeats, maxMeasureBeats);
        }

        notes.sort((a, b) => a.startBeats - b.startBeats);
        tracks.push({ part, notes });
    }

    return tracks;
}

export const useScoreTimeline = (xmlContent: string, parts: ScorePartInfo[]) => {
    const partsKey = parts.map(p => `${p.id}_${p.color}`).join(',');
    return useMemo(() => {
        if (!xmlContent || !parts || parts.length === 0) return [];
        try {
            return extractTimelineTracks(xmlContent, parts);
        } catch (err) {
            console.error('[useScoreTimeline] Error parsing timeline:', err);
            return [];
        }
    }, [xmlContent, partsKey]);
};
