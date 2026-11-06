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
  overflow: 'hidden',
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
  /** What each riffling half shows: the deck's top face, so the back does not turn blank (#618). */
  face?: React.ReactNode;
}

/** Nothing on mount; plays once whenever `shuffleCount` changes and is removed when it ends. */
export const DeckShuffleOverlay: React.FC<DeckShuffleOverlayProps> = ({
  shuffleCount = 0,
  box,
  face,
}) => {
  // the shuffle whose animation has finished (or was there on mount); the overlay must not stay
  // over the deck afterwards, or it hides the deck's face (#618)
  const [played, setPlayed] = useState(shuffleCount);
  const reducedMotion = usePrefersReducedMotion();
  if (shuffleCount === played || reducedMotion) return null;
  return (
    // the key restarts the animation for every new shuffle
    <Box
      key={shuffleCount}
      aria-hidden
      data-testid="deck-shuffle-overlay"
      onAnimationEnd={() => setPlayed(shuffleCount)}
      sx={{
        position: 'absolute',
        ...box,
        zIndex: box.zIndex + 1,
        pointerEvents: 'none',
        borderRadius: 2,
      }}
    >
      <Box sx={half(LEFT)}>{face}</Box>
      <Box sx={half(RIGHT)}>{face}</Box>
    </Box>
  );
};
