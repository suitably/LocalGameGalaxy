import type { InstrumentCategory, InstrumentMixerChannel, ScorePartInfo } from '../types';
import type { TargetNote } from '../useNoteVerifier';
import { noteDurationSeconds } from './playbackTiming';

export type MixerChannels = Record<string, InstrumentMixerChannel>;

export interface EnsembleMixState {
  channels: MixerChannels;
  playerPartId: string;
  mutePlayerPart: boolean;
  masterVolume: number;
  parts: ScorePartInfo[];
  bpm: number;
}

export interface ScheduledEnsembleNote {
  midiPitch: number;
  durationSeconds: number;
  velocity: number;
  partId: string;
  midiProgram?: number;
  category: InstrumentCategory;
  volume: number;
}

const DEFAULT_PART_ID = 'P1';
const ENSEMBLE_VELOCITY = 0.8;

export function applyChannelUpdate(
  channels: MixerChannels,
  partId: string,
  updates: Partial<InstrumentMixerChannel>,
): MixerChannels {
  const prev = channels[partId];
  return {
    ...channels,
    [partId]: {
      partId,
      volume: prev?.volume ?? 1.0,
      muted: prev?.muted ?? false,
      solo: prev?.solo ?? false,
      ...updates,
    },
  };
}

/**
 * Decides which cursor notes are audible for the backing ensemble, honouring
 * mute, solo, the player's own part and per-channel / master volume.
 */
export function selectAudibleEnsembleNotes(
  notes: TargetNote[],
  mix: EnsembleMixState,
): ScheduledEnsembleNote[] {
  const anySolo = Object.values(mix.channels).some((c) => c.solo);
  const result: ScheduledEnsembleNote[] = [];

  for (const note of notes) {
    if (note.isRest || note.isTiedContinuation || note.pitch <= 0) continue;

    const partId = note.partId || DEFAULT_PART_ID;
    if (partId === mix.playerPartId && mix.mutePlayerPart) continue;

    const channel = mix.channels[partId];
    if (channel?.muted) continue;
    if (anySolo && !channel?.solo) continue;

    const part = mix.parts.find((p) => p.id === partId);
    result.push({
      midiPitch: note.pitch,
      durationSeconds: noteDurationSeconds(note.duration ?? 0.25, mix.bpm),
      velocity: ENSEMBLE_VELOCITY,
      partId,
      midiProgram: note.midiProgram || part?.midiProgram,
      category: part?.category || 'piano',
      volume: (channel?.volume ?? 1.0) * mix.masterVolume,
    });
  }

  return result;
}

/** Default part the player practises: the first guitar, else the first part. */
export function pickDefaultPartId(parts: ScorePartInfo[]): string | undefined {
  return (parts.find((p) => p.category === 'guitar') ?? parts[0])?.id;
}
