/**
 * Tap-along calibration wired to a stage engine [ID: GAME-MELODIQ-NOTES-TAP-CALIBRATION]
 *
 * `schedule` has the clicks played and returns their times (null when nobody played them);
 * `toClock` turns a local time into the clock the click times use (stage time on a pult).
 * Taps are the engine's hits and sung onsets (keys, MIDI, microphone) plus `tapNow` for the
 * on-screen pad.
 */
import { useCallback, useEffect } from 'react';
import { useTapAlong } from '../../../modules/audio/latency';
import type { StageEngine } from './engine/StageEngine';

export function useTapCalibration(
  engine: StageEngine,
  schedule: () => Promise<number[] | null>,
  toClock: (localMs: number) => number,
  onLatency: (ms: number) => void,
) {
  const tapAlong = useTapAlong(onLatency);
  const { tap, begin, play } = tapAlong;
  useEffect(() => {
    engine.configureInput({ onTap: (local) => tap(toClock(local)) });
    return () => engine.configureInput({ onTap: null });
  }, [engine, tap, toClock]);

  const start = useCallback(async () => {
    begin();
    const clicks = await schedule();
    play(clicks, toClock(performance.now()));
  }, [begin, play, schedule, toClock]);

  const tapNow = useCallback(() => tap(toClock(performance.now())), [tap, toClock]);
  return { state: tapAlong.state, start, tapNow };
}
