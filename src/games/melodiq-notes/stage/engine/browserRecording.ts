import {
  ALIGN_SAMPLE_RATE,
  alignRecording,
  createAudioMap,
  type AlignProgress,
  type AlignResult,
  type BarMark,
  type ScoreSong,
} from '../../../../modules/music-score';
import type { StageRecording } from './types';

/**
 * A recording played through an <audio> element, which keeps the pitch when the
 * tempo is slowed down. Mapped to the score by bar marks (or score tempo + offset).
 */
export function createElementRecording(
  url: string,
  song: ScoreSong,
  marks: BarMark[] | null,
  offsetSec: number,
) {
  const el = new Audio();
  el.preload = 'auto';
  el.crossOrigin = 'anonymous';
  el.src = url;
  el.preservesPitch = true;
  let playing = false;
  const recording: StageRecording & { element: HTMLAudioElement } = {
    element: el,
    map: createAudioMap(song, marks, offsetSec),
    get duration() {
      return Number.isFinite(el.duration) ? el.duration : Infinity;
    },
    time: () => el.currentTime,
    isPlaying: () => playing,
    play(fromSec, rate) {
      el.currentTime = Math.max(0, fromSec);
      el.playbackRate = rate;
      playing = true;
      el.play().catch(() => {
        playing = false;
      });
    },
    pause() {
      if (!playing) return;
      playing = false;
      el.pause();
    },
    setRate: (rate) => {
      el.playbackRate = rate;
    },
    setVolume: (volume) => {
      el.volume = volume;
    },
  };
  return recording;
}

/** Decodes the recording, resamples it to mono at ALIGN_SAMPLE_RATE and aligns it to the score. */
export async function alignRecordingInBrowser(
  data: ArrayBuffer,
  song: ScoreSong,
  onProgress?: AlignProgress,
): Promise<AlignResult> {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  try {
    const decoded = await ctx.decodeAudioData(data);
    const offline = new OfflineAudioContext(
      1,
      Math.ceil(decoded.duration * ALIGN_SAMPLE_RATE),
      ALIGN_SAMPLE_RATE,
    );
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start();
    const mono = (await offline.startRendering()).getChannelData(0);
    return await alignRecording(song, mono, async (stage, fraction) => {
      onProgress?.(stage, fraction);
      await new Promise((r) => setTimeout(r, 0));
    });
  } finally {
    void ctx.close();
  }
}
