import path from 'node:path';
import type { PartSetting, ScorePartSettings } from '../../../core/types';
import type { SongMeta } from './songFolder';

/**
 * Hidden and renamed parts per score file in `song.json` (#564): checked on the way in and out,
 * with only the values that differ from the default kept.
 */
const MAX_PARTS = 64;
const MAX_ID = 64;
const MAX_NAME = 100;

/** A part id as score parsers make them ("P1", "track-2"): short, without control characters. */
const validId = (id: string) =>
  id.length > 0 && id.length <= MAX_ID && [...id].every((ch) => ch.charCodeAt(0) >= 32);
const text = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, MAX_NAME) : '');

/**
 * Checks the part settings of one score (`{ <part id>: { hidden?, playback?, name? } }`, #564)
 * and keeps only what differs from the default: `hidden: true`, `playback: 'synth'` (only for a
 * hidden part) and a non-empty `name`. Returns the settings or an error message.
 */
export function parsePartSettings(raw: unknown): ScorePartSettings | string {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'parts must be an object';
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length > MAX_PARTS) return 'too many parts';
  const out: ScorePartSettings = {};
  for (const [id, value] of entries) {
    if (!validId(id)) return 'invalid part id';
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return 'every part setting must be an object';
    }
    const v = value as Record<string, unknown>;
    if (v.hidden !== undefined && typeof v.hidden !== 'boolean') return 'hidden must be a boolean';
    if (v.playback !== undefined && v.playback !== 'muted' && v.playback !== 'synth') {
      return "playback must be 'muted' or 'synth'";
    }
    if (v.name !== undefined && typeof v.name !== 'string') return 'name must be a string';
    const setting: PartSetting = {};
    if (v.hidden === true) setting.hidden = true;
    if (v.hidden === true && v.playback === 'synth') setting.playback = 'synth';
    const name = text(v.name);
    if (name) setting.name = name;
    if (Object.keys(setting).length) out[id] = setting;
  }
  return out;
}

/** Part settings of every score in a stored `song.json`; broken entries are dropped. */
export function readParts(raw: unknown): Record<string, ScorePartSettings> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, ScorePartSettings> = {};
  for (const [file, value] of Object.entries(raw as Record<string, unknown>)) {
    const parts = parsePartSettings(value);
    if (typeof parts !== 'string' && Object.keys(parts).length) out[path.basename(file)] = parts;
  }
  return out;
}

/** The meta with one score's part settings replaced; empty settings remove the entry. */
export function withScoreParts(meta: SongMeta, file: string, parts: ScorePartSettings): SongMeta {
  const next = { ...meta.parts, [file]: parts };
  if (!Object.keys(parts).length) delete next[file];
  return { ...meta, parts: next };
}
