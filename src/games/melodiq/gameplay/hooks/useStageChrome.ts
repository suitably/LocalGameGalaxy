import { useCallback, useEffect, useRef, useState } from 'react';
import { STAGE_CHROME_HIDE_MS, stageTapAction } from '../logic/stageChrome';

const INTERACTIVE = 'button, a, input, [role="button"], [role="slider"]';

/**
 * Auto-hiding stage chrome (header, transport buttons) so the video and lyrics own the screen.
 * Shown while paused; while playing it hides after `hideMs`. A tap on the stage
 * toggles it, mouse movement or a tap on a control shows it again.
 */
export function useStageChrome(isPlaying: boolean, hideMs = STAGE_CHROME_HIDE_MS) {
  const [hidden, setHidden] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Play/pause from anywhere (button, keyboard, remote) shows the chrome again
  const [wasPlaying, setWasPlaying] = useState(isPlaying);
  if (wasPlaying !== isPlaying) {
    setWasPlaying(isPlaying);
    setHidden(false);
  }

  const disarm = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const arm = useCallback(() => {
    disarm();
    timerRef.current = setTimeout(() => setHidden(true), hideMs);
  }, [disarm, hideMs]);

  useEffect(() => {
    if (isPlaying) arm();
    return disarm;
  }, [isPlaying, arm, disarm]);

  const visible = !isPlaying || !hidden;

  const show = useCallback(() => {
    setHidden(false);
    if (isPlaying) arm();
  }, [isPlaying, arm]);

  const onClick = useCallback(
    (event: React.MouseEvent) => {
      const action = stageTapAction({
        visible,
        isPlaying,
        onControl: !!(event.target as Element).closest?.(INTERACTIVE),
        byMouse: (event.nativeEvent as PointerEvent).pointerType === 'mouse',
      });
      if (action === 'show') {
        show();
      } else {
        disarm();
        setHidden(true);
      }
    },
    [visible, isPlaying, show, disarm],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (event.pointerType === 'mouse') show();
    },
    [show],
  );

  return { visible, stageHandlers: { onClick, onPointerMove } };
}
