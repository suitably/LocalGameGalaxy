/**
 * Short roll animation before dice values are revealed [ID: HOOK-DICE-ROLL-ANIMATION]
 *
 * Shared by the game dice rollers; pairs with `Die3D`'s `isRolling`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

export const DICE_ROLL_ANIMATION_MS = 350;

export function useDiceRollAnimation(durationMs = DICE_ROLL_ANIMATION_MS) {
  const reducedMotion = usePrefersReducedMotion();
  const [animating, setAnimating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  /** Shows the animation, then calls `reveal` (where the values are rolled and reported). With reduced motion it reveals at once. */
  const startRoll = useCallback(
    (reveal: () => void) => {
      if (reducedMotion) {
        reveal();
        return;
      }
      setAnimating(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setAnimating(false);
        timeoutRef.current = null;
        reveal();
      }, durationMs);
    },
    [durationMs, reducedMotion],
  );

  return { animating, startRoll };
}
