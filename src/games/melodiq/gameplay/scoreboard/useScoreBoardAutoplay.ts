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
  const [countdown, setCountdown] = useState<number | null>(null);
  const [canceled, setCanceled] = useState(false);

  const onExitRef = useRef(onExit);
  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  useEffect(() => {
    if (isPassive || canceled) return;

    const delay = playerCount === 0 ? noPlayersDelay : withPlayersDelay;
    if (!delay || delay <= 0) return;

    setCountdown(delay);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          onExitRef.current(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [playerCount, noPlayersDelay, withPlayersDelay, isPassive, canceled]);

  const cancel = useCallback(() => {
    setCanceled(true);
    setCountdown(null);
  }, []);

  return { countdown, cancel };
};
