/**
 * Riffle animation played over a deck when it was shuffled (on every device, since the deck's
 * `shuffleCount` syncs like any other change) [ID: GAME-TABLETOP-DECK-SHUFFLE]
 */
import React, { useState } from 'react';
import { Box } from '@mui/material';
import { keyframes } from '@emotion/react';
import { usePrefersReducedMotion } from '../../../../hooks/usePrefersReducedMotion';

const SHUFFLE_MS = 650;

const riffle = (dir: 1 | -1) => keyframes`
  0%, 100% { transform: translateX(0) rotate(0deg); }
  25%, 65% { transform: translateX(${dir * 38}%) rotate(${dir * 8}deg); }
  45% { transform: translateX(${dir * 30}%) rotate(${dir * 4}deg); }
`;
const LEFT = riffle(-1);
const RIGHT = riffle(1);

const half = (animation: ReturnType<typeof keyframes>) => ({
  position: 'absolute',
  inset: 0,
  borderRadius: 'inherit',
  bgcolor: 'background.paper',
  border: 1,
  borderColor: 'divider',
  boxShadow: 3,
  animation: `${animation} ${SHUFFLE_MS}ms ease-in-out 1`,
});

interface DeckShuffleOverlayProps {
  shuffleCount?: number;
  /** The deck's box on the table; the overlay sits above it, so the halves are not clipped. */
  box: { left: number; top: number; width: number; height: number; zIndex: number };
}

/** Nothing on mount; replays whenever `shuffleCount` changes. */
export const DeckShuffleOverlay: React.FC<DeckShuffleOverlayProps> = ({
  shuffleCount = 0,
  box,
}) => {
  const [initial] = useState(shuffleCount);
  const reducedMotion = usePrefersReducedMotion();
  if (shuffleCount === initial || reducedMotion) return null;
  return (
    // the key restarts the animation for every new shuffle
    <Box
      key={shuffleCount}
      aria-hidden
      sx={{
        position: 'absolute',
        ...box,
        zIndex: box.zIndex + 1,
        pointerEvents: 'none',
        borderRadius: 2,
      }}
    >
      <Box sx={half(LEFT)} />
      <Box sx={half(RIGHT)} />
    </Box>
  );
};
