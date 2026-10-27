/**
 * UltraStar `.txt` → `ScoreSong`: each singer track becomes a vocal part, so Melodiq Notes plays
 * karaoke songs with the song's mix (#566). The `.txt` is timed to its recording, so the bar marks
 * come straight from `#BPM` and `#GAP`; no alignment is needed.
 */
import type { BarMark, ScoreNote, ScorePart, ScoreSong, UltraStarKind } from './types';
import type { UltraStarNote, UltraStarSong } from './ultrastar';

/** UltraStar pitch 0 is C4 (MIDI 60). */
export const ULTRASTAR_PITCH_OFFSET = 60;
/** An UltraStar beat is a quarter of a beat at `#BPM`. */
const US_BEATS_PER_QUARTER = 4;
const BAR_BEATS = 4;

const KINDS: Record<string, UltraStarKind | undefined> = {
  '*': 'golden',
  F: 'freestyle',
  R: 'rap',
  G: 'goldenRap',
};

const isSung = (n: UltraStarNote) => n.type !== '-';

/** Syllable in the score convention: trimmed, with a trailing '-' when the word continues. */
function syllable(note: UltraStarNote, next: UltraStarNote | undefined): string {
  const text = note.text.trim();
  // the next syllable continues this word when it does not start with a space (UltraStar rule)
  const continues = !!next && isSung(next) && !/^\s/.test(next.text) && next.text.trim() !== '';
  return continues && text ? `${text}-` : text;
}

function toPart(track: { name: string; notes: UltraStarNote[] }, index: number): ScorePart {
  const notes: ScoreNote[] = [];
  const phraseBreaks: number[] = [];
  track.notes.forEach((n, i) => {
    const t = n.start / US_BEATS_PER_QUARTER;
    if (!isSung(n)) {
      phraseBreaks.push(t);
      return;
    }
    const note: ScoreNote = {
      t,
      dur: n.duration / US_BEATS_PER_QUARTER,
      pitch: n.pitch + ULTRASTAR_PITCH_OFFSET,
      syl: syllable(n, track.notes[i + 1]),
    };
    const kind = KINDS[n.type];
    if (kind) note.ultrastar = kind;
    notes.push(note);
  });
  return {
    id: `P${index + 1}`,
    name: track.name,
    notes,
    isDrum: false,
    program: null,
    guess: 'vocals',
    phraseBreaks,
  };
}

/**
 * The song as a score (one vocal part per singer, synthesized 4/4 bars from beat 0) and its bar
 * marks against the recording: bar 1 starts at `#GAP`, every quarter lasts 60 / `#BPM` seconds.
 */
export function ultraStarToScore(
  parsed: UltraStarSong,
  source = 'song.txt',
): { song: ScoreSong; marks: BarMark[] } {
  const parts = parsed.tracks.map(toPart).filter((p) => p.notes.length > 0);
  const lastEnd = Math.max(0, ...parts.flatMap((p) => p.notes.map((n) => n.t + n.dur)));
  const bars = Math.max(1, Math.ceil(lastEnd / BAR_BEATS));
  const measureStarts = Array.from({ length: bars }, (_, i) => i * BAR_BEATS);
  const end = bars * BAR_BEATS;
  const secPerBeat = 60 / parsed.bpm;
  const gapSec = parsed.gap / 1000;
  const marks: BarMark[] = [...measureStarts, end].map((beat) => ({
    beat,
    sec: gapSec + beat * secPerBeat,
  }));
  return {
    song: {
      title: parsed.headers.TITLE ?? '',
      artist: parsed.headers.ARTIST ?? '',
      source,
      tempoMap: [{ beat: 0, bpm: parsed.bpm }],
      measureStarts,
      measureLengths: measureStarts.map(() => BAR_BEATS),
      measureNumbers: measureStarts.map((_, i) => i + 1),
      end,
      parts,
    },
    marks,
  };
}
