import { type PlayerRuntime } from './PlayerRuntime';
import { type ScoreDisplayHandle } from '../ScoreDisplay';
import { type Note, type ParsedSong } from '../../parser';
import { type SongWithNotes } from '../PitchVisualizer';
import { type PassiveGameState, type PassivePlayerState } from '../../types';

export interface PlaybackUpdateState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  players?: Array<Partial<PassivePlayerState> & { config?: unknown }>;
}

/**
 * Props for `useScoringEngine`. Separate from the component signature to allow
 * clear documentation of each timing and mode control surface.
 */
export interface UseScoringEngineProps {
  /** All connected players (local + remote) with their `MicrophoneManager` / `WebRTCMicManager` references. */
  players: PlayerRuntime[];
  /** Set to `true` once audio is loaded and playback can begin. Gates the rAF loop. */
  ready: boolean;
  /** Ref to the main mixed audio element (used for `currentTime` as the timing source of truth). */
  audioRef: React.RefObject<HTMLAudioElement | null>;
  /** Ref to the optional vocals-only audio element (played/muted alongside the main track). */
  vocalsRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  scoreDisplayRef: React.RefObject<ScoreDisplayHandle | null>;
  progressLineRef: React.RefObject<HTMLDivElement | null>;
  /** Ref flag indicating whether audio is actively playing (used to skip scoring when paused). */
  isPlayingRef: React.RefObject<boolean>;
  /** The fully parsed UltraStar song data (tracks, notes, BPM, GAP). */
  parsedSong: ParsedSong | SongWithNotes | null;
  /** Multiplier applied to BPM for slower/faster lyric scroll (default 1.0). */
  bpmMultiplier: number;
  /** Per-track score weights: `[1.0]` for single singer, `[0.5, 0.5]` for duets. */
  trackScoreWeights: number[];
  /** Score multiplier for golden notes (`*` type). Typically 2.0. */
  goldenNoteMultiplier: number;
  /** Dev-only: Override all pitch detection with a fixed MIDI note number for testing. */
  devPitchOverride: number | null;
  /** If `true`, this instance is in TV/passive mode — reads pitch from `passiveState` rather than mic. */
  isPassive: boolean;
  /** State object received from the host via `GAME_STATE` BroadcastChannel message (TV mode). */
  passiveState?: PassiveGameState | null;
  /** If `true`, this instance is a remote phone client — runs a reduced local loop. */
  isClient: boolean;
  _duration: number;
  micLatency?: number;
  onPlaybackUpdate?: (state: PlaybackUpdateState) => void;
  setScores?: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  /** Ref to the current virtual audio time in seconds (used for lyric sync when audioRef is unavailable). */
  virtualTimeRef: React.RefObject<number>;
}

export function notesOfTrack(
  song: NonNullable<UseScoringEngineProps['parsedSong']>,
  trackIndex: number,
): Note[] {
  if (song.tracks && song.tracks.length > 0 && song.tracks[trackIndex]) {
    return song.tracks[trackIndex].notes ?? [];
  }
  return trackIndex === 0 ? song.notes || [] : [];
}
