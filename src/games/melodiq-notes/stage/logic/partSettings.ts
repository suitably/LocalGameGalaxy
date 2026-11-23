import type { ScorePart, ScoreSong } from '../../../../modules/music-score';
import type { PartSetting, ScorePartSettings } from '../../../../lib/companion/songScoresApi';
import type { StageScoreSong } from '../engine/players';
import type { PlayerSeat } from '../engine/types';
import { withStrums, type StrumSetting } from './strumDirection';

/**
 * Hidden and renamed parts of the score on stage (#564), stored per score file in the song
 * folder's `song.json`. A hidden part is left out of seats, the pult part list and the part
 * count; the synth plays it as backing only when the user chose so (default: muted).
 */
export type { PartSetting, ScorePartSettings };

export type PartPlayback = 'muted' | 'synth';

/** One edit of a part in the parts dialog. */
export interface PartChange {
  hidden?: boolean;
  playback?: PartPlayback;
  name?: string;
  /** Strum overrides (#634); undefined clears them. */
  strum?: StrumSetting | undefined;
}

/**
 * What the stage shows: the song without hidden parts; the hidden parts the synth plays ride
 * along as `song.backing` (what `buildBandEvents` reads) and as `backing`.
 */
export interface StageView {
  song: StageScoreSong;
  backing: ScorePart[];
}

const hasNotes = (p: ScorePart) => p.notes.length > 0;

/** Display name of a part: its stored name, else the score's. */
export const partName = (part: ScorePart, settings: ScorePartSettings) =>
  settings[part.id]?.name || part.name;

/**
 * The song as the stage plays it. Without settings (or when they would hide every part with
 * notes) it is the song itself, so a stage never ends up without a part to play. Guitar parts
 * carry their strum directions (#634).
 */
export function stageView(score: ScoreSong, settings: ScorePartSettings): StageView {
  const song = withStrums(score, settings);
  const applies = song.parts.some((p) => settings[p.id]?.hidden || settings[p.id]?.name);
  if (!applies) return { song, backing: [] };
  const named = song.parts.map((p) =>
    settings[p.id]?.name ? { ...p, name: partName(p, settings) } : p,
  );
  const visible = named.filter((p) => !settings[p.id]?.hidden);
  if (!visible.some(hasNotes) && named.some(hasNotes))
    return { song: { ...song, parts: named }, backing: [] };
  const backing = named.filter(
    (p) => settings[p.id]?.hidden && settings[p.id]?.playback === 'synth',
  );
  return { song: { ...song, parts: visible, backing }, backing };
}

/** Whether a part may be hidden: at least one other visible part with notes stays. */
export function canHide(song: ScoreSong, settings: ScorePartSettings, partId: string): boolean {
  return song.parts.some((p) => p.id !== partId && !settings[p.id]?.hidden && hasNotes(p));
}

/**
 * Applies one edit and keeps only what differs from the default (as the server stores it): a
 * name equal to the score's or empty is dropped, and the playback choice only counts while hidden.
 */
export function updatePartSettings(
  settings: ScorePartSettings,
  part: ScorePart,
  change: PartChange,
): ScorePartSettings {
  const current = settings[part.id] ?? {};
  const hidden = change.hidden ?? !!current.hidden;
  const playback = change.playback ?? (current.playback === 'synth' ? 'synth' : 'muted');
  const name = (change.name ?? current.name ?? '').trim();
  const next: PartSetting = {};
  if (hidden) next.hidden = true;
  if (hidden && playback === 'synth') next.playback = 'synth';
  if (name && name !== part.name) next.name = name;
  const strum = 'strum' in change ? change.strum : current.strum;
  if (strum) next.strum = strum;
  const out = { ...settings };
  if (Object.keys(next).length) out[part.id] = next;
  else delete out[part.id];
  return out;
}

/** The seats that still have their part after parts were hidden; null when none is left. */
export function keptSeats(seats: PlayerSeat[], song: ScoreSong): PlayerSeat[] | null {
  const ids = new Set(song.parts.map((p) => p.id));
  const kept = seats.filter((s) => ids.has(s.partId));
  return kept.length ? kept : null;
}

/** How many parts are hidden (for the parts dialog's summary). */
export const hiddenCount = (song: ScoreSong, settings: ScorePartSettings) =>
  song.parts.filter((p) => settings[p.id]?.hidden).length;
