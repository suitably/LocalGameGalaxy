import type { Theme } from '@mui/material/styles';
import { motion } from '../themeTokens';

/**
 * Explicit-property transition for `sx` (never `transition: all`), built on the theme motion
 * tokens: `short` = 150 ms hover/press, `standard` = 250 ms enter/exit (DESIGN.md §6).
 * `bounce` is the single overshoot easing for celebrations.
 */
export const transitionOf =
  (props: string[], speed: 'short' | 'standard' = 'short', easing?: 'bounce') =>
  (theme: Theme): string =>
    theme.transitions.create(props, {
      duration: theme.transitions.duration[speed],
      ...(easing ? { easing: motion.easing.bounce } : {}),
    });
