import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useWakeLock } from '../../../hooks/useWakeLock';
import { registerBackHandler } from '../../../lib/backButton';
import type { StageEngine } from './engine/StageEngine';

interface Options {
  /** Leaves the stage (navigates back). */
  leave: () => void;
  /** Full-screen/immersive view that the back button closes before anything else. */
  immersive: { requested: boolean; exit: () => void };
}

/**
 * Stage lifecycle on the device (#690): the screen stays awake while a song plays and the Android
 * back button steps out in order: immersive view, then (song running or paused) pause and leave
 * the stage. Open dialogs are closed earlier by the app-level listener; with an idle stage the
 * press falls through to the app default.
 */
export function useStageLifecycle(engine: StageEngine, { leave, immersive }: Options) {
  const state = useSyncExternalStore(engine.subscribe, () => engine.state);
  useWakeLock(state === 'playing');

  const latest = useRef({ leave, immersive });
  useEffect(() => {
    latest.current = { leave, immersive };
  });
  useEffect(
    () =>
      registerBackHandler(() => {
        const { leave: leaveStage, immersive: view } = latest.current;
        if (view.requested) {
          view.exit();
          return true;
        }
        if (engine.state === 'playing' || engine.state === 'paused') {
          engine.pause();
          leaveStage();
          return true;
        }
        return false;
      }),
    [engine],
  );
}
