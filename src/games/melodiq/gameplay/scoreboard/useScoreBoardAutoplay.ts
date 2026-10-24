import { useCallback, useEffect, useRef, useState } from 'react';

interface AutoplayOptions {
  playerCount: number;
  noPlayersDelay?: number;
  withPlayersDelay?: number;
  /** Passive (remote) viewers never advance the queue. */
  isPassive?: boolean;
  onExit: (forceHome?: boolean) => void;
}

/** Countdown to the next song on the host; `cancel` stops it for this screen. */
export const useScoreBoardAutoplay = ({
  playerCount,
  noPlayersDelay,
  withPlayersDelay,
  isPassive,
  onExit,
}: AutoplayOptions) => {
  const [elapsed, setElapsed] = useState(0);
  const [canceled, setCanceled] = useState(false);

  const onExitRef = useRef(onExit);
  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  const delay = playerCount === 0 ? noPlayersDelay : withPlayersDelay;
  const active = !isPassive && !canceled && !!delay && delay > 0;

  useEffect(() => {
    if (!active || !delay) return;

    let seconds = 0;
    const timer = setInterval(() => {
      seconds += 1;
      setElapsed(seconds);
      if (seconds >= delay) {
        clearInterval(timer);
        onExitRef.current(false);
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      setElapsed(0);
    };
  }, [active, delay]);

  const cancel = useCallback(() => setCanceled(true), []);

  return { countdown: active && delay ? Math.max(0, delay - elapsed) : null, cancel };
};
