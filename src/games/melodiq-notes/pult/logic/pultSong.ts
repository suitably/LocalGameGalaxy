/**
 * What a pult needs to know of the stage's song [ID: GAME-MELODIQ-NOTES-PULT-SONG]
 *
 * Only the playable parts with their instrument and keyboard octave; the score itself stays on
 * the stage, which judges.
 */
import type { ScoreSong } from '../../../../modules/music-score';
import { buildChart, pitchRange } from '../../stage/logic/charts';
import type { PultSong } from './protocol';

export function pultSongOf(song: ScoreSong): PultSong {
  return {
    title: song.title,
    parts: song.parts
      .filter((p) => p.notes.length)
      .map((p) => ({
        id: p.id,
        name: p.name,
        inst: p.guess,
        octaveBase: 12 * Math.floor(pitchRange(buildChart(p, p.guess)).median / 12),
      })),
  };
}

/** Link a player opens on their own device; `part` is the part offered to them. */
export function pultJoinUrl(base: string, roomId: string, partId?: string): string {
  const url = `${base}#/games/melodiq-notes?pult=${encodeURIComponent(roomId)}`;
  return partId ? `${url}&part=${encodeURIComponent(partId)}` : url;
}
