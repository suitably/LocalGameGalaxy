import { useEffect, useRef } from 'react';
import {
  correctDrift,
  isPastVideoEnd,
  type DriftDirection,
  smoothDrift,
  STEM_DRIFT_POLICY,
  VIDEO_DRIFT_POLICY,
  COARSE_RATE_VIDEO_DRIFT_POLICY,
} from '../logic/mediaDrift';
import { startSteadyTicker } from '../../../../lib/utils/steadyTicker';

/** Shortest time between two corrective seeks of the vocal stem. */
const STEM_SEEK_COOLDOWN_MS = 1000;
/** Shortest time between two corrective seeks (or start attempts) of the background video. */
const VIDEO_SEEK_COOLDOWN_MS = 2000;
/** After a start, how long the loop leaves a video start already under way alone. */
const VIDEO_START_GRACE_MS = 300;
/**
 * Pace of the loop while the window gets no animation frames (hidden, minimized or covered, e.g.
 * a TV window behind the host): the followers must still follow seeks, pauses and rate changes.
 */
const BACKGROUND_TICK_MS = 33;

interface UseLocalMediaSyncProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  vocalsRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
}

/**
 * Keeps the vocal stem and the background video on the instrumental `<audio>` (the song clock).
 * This loop is the only place that plays, pauses, seeks or re-rates them while a song runs;
 * callers move only the instrumental. It reads the elements every frame, so it also covers
 * elements that mount late (their `src` loads asynchronously). Without animation frames a worker
 * ticker runs it (`startSteadyTicker`), or the stem would stay where it was after a seek.
 */
export function useLocalMediaSync({
  audioRef,
  videoRef,
  vocalsRef,
  isPlaying,
}: UseLocalMediaSyncProps) {
  const rAFRef = useRef<number | null>(null);
  const lastStepRef = useRef(0);
  const lastSnapTimeRef = useRef<number>(0);
  const smoothedDriftRef = useRef<number | null>(null);
  // Running rate corrections (hysteresis state of `correctDrift`)
  const stemDirectionRef = useRef<DriftDirection>(0);
  const videoDirectionRef = useRef<DriftDirection>(0);
  // The video follows the audio and never the other way round; its corrections are rate limited
  // so a slow decoder is not kept busy with seeks (which can starve the audio on weak devices).
  const smoothedVideoDriftRef = useRef<number | null>(null);
  const lastVideoSeekRef = useRef(0);
  const videoPlayPendingRef = useRef(false);

  useEffect(() => {
    if (!isPlaying) {
      if (rAFRef.current !== null) {
        cancelAnimationFrame(rAFRef.current);
        rAFRef.current = null;
      }
      if (vocalsRef.current && !vocalsRef.current.paused) {
        vocalsRef.current.pause();
      }
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      smoothedDriftRef.current = null;
      smoothedVideoDriftRef.current = null;
      stemDirectionRef.current = 0;
      videoDirectionRef.current = 0;
      return;
    }

    const step = () => {
      const audio = audioRef.current;
      const video = videoRef.current;
      const vocals = vocalsRef.current;
      const now = performance.now();

      if (audio) {
        const masterTime = audio.currentTime;
        const baseRate = audio.playbackRate || 1.0;
        // While the instrumental buffers its clock stands still: the followers must wait too
        const isAudioPlaying = !audio.paused && !audio.ended && audio.readyState >= 3;

        // Sync Video Play/Pause & Timing (the video follows; audio and lyrics never wait for it).
        // A video shorter than the song is left to end: seeking it past its end only ends it again.
        if (video && !isPastVideoEnd(masterTime, video.duration)) {
          if (
            isAudioPlaying &&
            video.paused &&
            video.readyState >= 2 &&
            !videoPlayPendingRef.current &&
            now - lastVideoSeekRef.current > VIDEO_SEEK_COOLDOWN_MS
          ) {
            // One start attempt at a time: re-seeking every frame while play() is pending
            // would restart the decoder again and again
            lastVideoSeekRef.current = now;
            videoPlayPendingRef.current = true;
            smoothedVideoDriftRef.current = null;
            video.currentTime = masterTime;
            video
              .play()
              .catch(() => {})
              .finally(() => {
                videoPlayPendingRef.current = false;
              });
          } else if (!isAudioPlaying && !video.paused) {
            video.pause();
          }

          if (video.readyState >= 2 && isAudioPlaying && !video.paused && !video.seeking) {
            // YouTube takes only 0.25 rate steps: corrected by short 1.25× / 0.75× runs
            const policy = (video as { coarseRate?: boolean }).coarseRate
              ? COARSE_RATE_VIDEO_DRIFT_POLICY
              : VIDEO_DRIFT_POLICY;
            const rawDrift = masterTime - video.currentTime;
            // A video's clock moves in frame steps: smooth it, or the rate flips every frame
            const jumped = Math.abs(rawDrift) > policy.seekAboveSec;
            const drift = jumped ? rawDrift : smoothDrift(smoothedVideoDriftRef.current, rawDrift);
            smoothedVideoDriftRef.current = drift;
            const correction = correctDrift(drift, baseRate, policy, videoDirectionRef.current);
            if (correction.kind === 'seek') {
              if (now - lastVideoSeekRef.current > VIDEO_SEEK_COOLDOWN_MS) {
                lastVideoSeekRef.current = now;
                videoDirectionRef.current = 0;
                smoothedVideoDriftRef.current = null;
                video.currentTime = masterTime;
                if (video.playbackRate !== baseRate) video.playbackRate = baseRate;
              }
            } else {
              videoDirectionRef.current = correction.direction;
              if (video.playbackRate !== correction.rate) video.playbackRate = correction.rate;
            }
          }
        }

        // Sync Vocals Play/Pause & Precision Fluid Audio Timing
        if (vocals) {
          const targetVocalsTime = masterTime;

          if (isAudioPlaying && vocals.paused && vocals.readyState >= 2) {
            vocals.preservesPitch = true; // rate corrections must not change the pitch
            vocals.currentTime = targetVocalsTime;
            vocals.play().catch(() => {});
          } else if (!isAudioPlaying && !vocals.paused) {
            vocals.pause();
          }

          if (vocals.readyState >= 2 && isAudioPlaying && !vocals.seeking) {
            const rawDrift = targetVocalsTime - vocals.currentTime;
            // Smoothing filters the read jitter of two `currentTime`s; a real jump shows at once
            const jumped = Math.abs(rawDrift) > STEM_DRIFT_POLICY.seekAboveSec;
            const drift = jumped ? rawDrift : smoothDrift(smoothedDriftRef.current, rawDrift);
            smoothedDriftRef.current = drift;
            const correction = correctDrift(
              drift,
              baseRate,
              STEM_DRIFT_POLICY,
              stemDirectionRef.current,
            );

            if (correction.kind === 'seek') {
              // A seek needs a moment to land; do not stack them
              if (now - lastSnapTimeRef.current > STEM_SEEK_COOLDOWN_MS) {
                vocals.currentTime = targetVocalsTime;
                lastSnapTimeRef.current = now;
                smoothedDriftRef.current = null;
                stemDirectionRef.current = 0;
                if (vocals.playbackRate !== baseRate) vocals.playbackRate = baseRate;
              }
            } else {
              stemDirectionRef.current = correction.direction;
              if (vocals.playbackRate !== correction.rate) vocals.playbackRate = correction.rate;
            }
          }
        }
      }

      lastStepRef.current = now;
    };

    const frame = () => {
      step();
      rAFRef.current = requestAnimationFrame(frame);
    };

    // Playback was just started and safePlay may be starting the video: give it a moment
    lastVideoSeekRef.current = performance.now() - VIDEO_SEEK_COOLDOWN_MS + VIDEO_START_GRACE_MS;
    rAFRef.current = requestAnimationFrame(frame);
    // Idles while frames come; takes over when they stop
    const stopTicker = startSteadyTicker(BACKGROUND_TICK_MS, () => {
      if (performance.now() - lastStepRef.current > BACKGROUND_TICK_MS * 1.5) step();
    });

    return () => {
      stopTicker();
      if (rAFRef.current !== null) {
        cancelAnimationFrame(rAFRef.current);
        rAFRef.current = null;
      }
    };
  }, [isPlaying, audioRef, videoRef, vocalsRef]);
}
