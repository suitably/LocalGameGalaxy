/**
 * One player's six cards in two rows of three [ID: UI-GOLF-HAND]
 */
import React from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PlayingCard, cardText } from '../../../modules/playing-cards';
import type { GolfPlayer } from '../logic/types';

interface GolfHandProps {
  player: GolfPlayer;
  size?: 'sm' | 'md';
  /** Slots that may be tapped now; others are static. */
  pickable?: (slot: number) => boolean;
  onPick?: (slot: number) => void;
}

export const GolfHand: React.FC<GolfHandProps> = ({ player, size = 'md', pickable, onPick }) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: 0.75 }}>
      {player.hand.map((card, slot) => {
        const faceUp = player.faceUp[slot];
        const label = faceUp
          ? t('games.golf.card.face_up', { n: slot + 1, name: player.name, card: cardText(card) })
          : t('games.golf.card.face_down', { n: slot + 1, name: player.name });
        const canPick = Boolean(onPick && pickable?.(slot));
        return (
          <PlayingCard
            key={card.id}
            card={card}
            faceUp={faceUp}
            size={size}
            label={label}
            highlighted={canPick}
            onClick={canPick ? () => onPick?.(slot) : undefined}
          />
        );
      })}
    </Box>
  );
};
