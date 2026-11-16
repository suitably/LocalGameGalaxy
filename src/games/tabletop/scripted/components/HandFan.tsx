/**
 * The player's hand as an overlapping fan; picked cards rise [ID: COMP-TABLETOP-SCRIPT-HAND]
 */
import React from 'react';
import { Box } from '@mui/material';
import { fanLayout } from '../../logic/handFan';
import { useElementWidth } from '../../hooks/useElementWidth';
import { transitionOf } from '../../../../lib/motion';
import type { CardId } from '../logic/cardDeck';
import { CARD_RATIO, PlayingCard } from './PlayingCard';

interface HandFanProps {
  cards: CardId[];
  picked: CardId[];
  /** Cards that cannot be played now. */
  dimmed: (card: CardId) => boolean;
  onTap?: (card: CardId) => void;
}

const LIFT = 18;

export const HandFan: React.FC<HandFanProps> = ({ cards, picked, dimmed, onTap }) => {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const cardWidth = Math.round(Math.min(92, Math.max(58, width / 5.4)));
  const fan = fanLayout(cards.length, width, cardWidth, { minStep: 30, maxAngle: 5, maxDrop: 6 });
  const height = Math.round(cardWidth * CARD_RATIO) + LIFT + 10;
  return (
    <Box ref={ref} sx={{ width: '100%', overflowX: fan.overflow ? 'auto' : 'visible' }}>
      <Box sx={{ position: 'relative', width: fan.width, height, mx: 'auto' }}>
        {cards.map((card, i) => {
          const up = picked.includes(card);
          const slot = fan.slots[i];
          return (
            <Box
              key={card}
              sx={{
                position: 'absolute',
                left: slot.x,
                top: LIFT,
                transform: `translateY(${up ? -LIFT : slot.drop}px) rotate(${up ? 0 : slot.rotate}deg)`,
                transition: transitionOf(['transform', 'left']),
                zIndex: i,
              }}
            >
              <PlayingCard
                card={card}
                width={cardWidth}
                selected={up}
                dimmed={!up && dimmed(card)}
                onClick={onTap ? () => onTap(card) : undefined}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
