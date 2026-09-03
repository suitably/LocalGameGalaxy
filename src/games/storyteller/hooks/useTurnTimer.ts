import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTurnTimerProps {
  durationSeconds: number;
  isActive: boolean;
  onExpire?: () => void;
}

export interface UseTurnTimerReturn {
  timeLeft: number;
  percentRemaining: number;
  isExpiringSoon: boolean;
  isCritical: boolean;
  resetTimer: () => void;
}

export const useTurnTimer = ({
  durationSeconds,
  isActive,
  onExpire,
}: UseTurnTimerProps): UseTurnTimerReturn => {
  const [timeLeft, setTimeLeft] = useState<number>(durationSeconds);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const resetTimer = useCallback(() => {
    setTimeLeft(durationSeconds);
  }, [durationSeconds]);

  useEffect(() => {
    setTimeLeft(durationSeconds);
  }, [durationSeconds]);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onExpireRef.current) {
            onExpireRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const percentRemaining =
    durationSeconds > 0 ? Math.max(0, Math.min(100, (timeLeft / durationSeconds) * 100)) : 0;
  const isExpiringSoon = timeLeft > 0 && timeLeft <= 15;
  const isCritical = timeLeft > 0 && timeLeft <= 5;

  return {
    timeLeft,
    percentRemaining,
    isExpiringSoon,
    isCritical,
    resetTimer,
  };
};
