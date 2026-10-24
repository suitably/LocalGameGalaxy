export interface LineBounds {
    startBeat: number;
    endBeat: number;
}

/** How long a finished line stays visible (seconds). */
export const LINGER_SECONDS = 0.8;
/** How long before the next line starts it replaces the finished one (seconds). */
export const NEXT_LINE_LEAD_SECONDS = 0.3;

/**
 * Beat after which line `index` is no longer the active line.
 * Normally the line lingers after its end, but it is replaced before the next
 * line starts (so the next line's first syllable is never sung while the old
 * line is still shown). Never earlier than the line's own end.
 */
export function getLineSwitchBeat(
    lines: readonly LineBounds[],
    index: number,
    lingerBeats: number,
    leadBeats: number
): number {
    const line = lines[index];
    const lingerEnd = line.endBeat + lingerBeats;
    const next = lines[index + 1];
    if (!next) return lingerEnd;
    const gap = Math.max(0, next.startBeat - line.endBeat);
    const lead = Math.min(leadBeats, gap / 2);
    return Math.min(lingerEnd, Math.max(line.endBeat, next.startBeat - lead));
}

/** Index of the line to display at `currentBeat`, or -1 when all lyrics are done. */
export function selectActiveLineIndex(
    lines: readonly LineBounds[],
    currentBeat: number,
    msPerBeat: number
): number {
    const lingerBeats = (LINGER_SECONDS * 1000) / msPerBeat;
    const leadBeats = (NEXT_LINE_LEAD_SECONDS * 1000) / msPerBeat;
    for (let i = 0; i < lines.length; i++) {
        if (currentBeat <= getLineSwitchBeat(lines, i, lingerBeats, leadBeats)) return i;
    }
    return -1;
}
