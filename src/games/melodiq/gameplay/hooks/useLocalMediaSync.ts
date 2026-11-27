import { useEffect, useRef } from 'react';
import {
  correctDrift,
  type DriftDirection,
  smoothDrift,
  STEM_DRIFT_POLICY,
  VIDEO_DRIFT_POLICY,
} from '../logic/mediaDrift';

/** Shortest time between two corrective seeks of the vocal stem. */
const STEM_SEEK_COOLDOWN_MS = 1000;
/** Shortest time between two corrective seeks (or start attempts) of the background video. */
const VIDEO_SEEK_COOLDOWN_MS = 2000;

interface UseLocalMediaSyncProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  vocalsRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
}

export function useLocalMediaSync({
  audioRef,
  videoRef,
  vocalsRef,
  isPlaying,
}: UseLocalMediaSyncProps) {
  const rAFRef = useRef<number | null>(null);
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
  // The instrumental is buffering: its clock stands still although it is not paused
  const masterStalledRef = useRef(false);

  // Transport event synchronization
  useEffect(() => {
    const audio = audioRef.current;
    const vocals = vocalsRef.current;
    if (!audio || !vocals) return;

    // Ensure pitch preservation is always enabled on vocal stem
    (vocals as any).preservesPitch = true;
    (vocals as any).mozPreservesPitch = true;
    (vocals as any).webkitPreservesPitch = true;

    const handleAudioSeeking = () => {
      if (vocals) {
        if (Math.abs(vocals.currentTime - audio.currentTime) > 0.002) {
          vocals.currentTime = audio.currentTime;
          smoothedDriftRef.current = null;
        }
      }
    };

    const handleRateChange = () => {
      if (vocals && !vocals.seeking) {
        vocals.playbackRate = audio.playbackRate;
      }
    };

    const handleAudioPause = () => {
      if (vocals && !vocals.paused) {
        vocals.pause();
      }
    };

    const handleAudioPlay = () => {
      if (vocals && vocals.paused && vocals.readyState >= 2) {
        vocals.currentTime = audio.currentTime;
        vocals.play().catch(() => {});
      }
    };

    // While the instrumental buffers, the stem must not run ahead on its own
    const handleAudioWaiting = () => {
      masterStalledRef.current = true;
      if (vocals && !vocals.paused) vocals.pause();
    };
    const handleAudioPlaying = () => {
      masterStalledRef.current = false;
      smoothedDriftRef.current = null;
      handleAudioPlay();
    };

    audio.addEventListener('waiting', handleAudioWaiting);
    audio.addEventListener('playing', handleAudioPlaying);
    audio.addEventListener('seeking', handleAudioSeeking);
    audio.addEventListener('ratechange', handleRateChange);
    audio.addEventListener('pause', handleAudioPause);
    audio.addEventListener('play', handleAudioPlay);

    return () => {
      audio.removeEventListener('waiting', handleAudioWaiting);
      audio.removeEventListener('playing', handleAudioPlaying);
      masterStalledRef.current = false;
      audio.removeEventListener('seeking', handleAudioSeeking);
      audio.removeEventListener('ratechange', handleRateChange);
      audio.removeEventListener('pause', handleAudioPause);
      audio.removeEventListener('play', handleAudioPlay);
    };
  }, [audioRef, vocalsRef]);

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

    const syncLoop = () => {
      const audio = audioRef.current;
      const video = videoRef.current;
      const vocals = vocalsRef.current;
      const now = performance.now();

      if (audio) {
        const masterTime = audio.currentTime;
        const baseRate = audio.playbackRate || 1.0;
        const isAudioPlaying = !audio.paused && !audio.ended && !masterStalledRef.current;

        // Sync Video Play/Pause & Timing (the video follows; audio and lyrics never wait for it)
        if (video) {
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
            const rawDrift = masterTime - video.currentTime;
            // A video's clock moves in frame steps: smooth it, or the rate flips every frame
            const jumped = Math.abs(rawDrift) > VIDEO_DRIFT_POLICY.seekAboveSec;
            const drift = jumped ? rawDrift : smoothDrift(smoothedVideoDriftRef.current, rawDrift);
            smoothedVideoDriftRef.current = drift;
            const correction = correctDrift(
              drift,
              baseRate,
              VIDEO_DRIFT_POLICY,
              videoDirectionRef.current,
            );
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

      rAFRef.current = requestAnimationFrame(syncLoop);
    };

    // Playback was just started (safePlay also starts the video): give that start a moment
    lastVideoSeekRef.current = performance.now();
    rAFRef.current = requestAnimationFrame(syncLoop);

    return () => {
      if (rAFRef.current !== null) {
        cancelAnimationFrame(rAFRef.current);
        rAFRef.current = null;
      }
    };
  }, [isPlaying, audioRef, videoRef, vocalsRef]);
}
