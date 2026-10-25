/**
 * Overlapping, slightly arced hand of cards for the dock [ID: GAME-TABLETOP-HAND-FAN]
 *
 * Mobile pattern (Hearthstone, Balatro): the whole hand fits the dock width by overlapping;
 * a tap zooms a card, a drag plays it onto the table. Very large hands scroll sideways.
 */
import React from 'react';
import { Box } from '@mui/material';
import type { CardWidget } from '../../logic/types';
import { fanLayout, type HandSlotItem } from '../../logic/handFan';
import { useElementWidth } from '../../hooks/useElementWidth';
import { HandCardItem, CARD_W, CARD_H } from './HandCardItem';

/** Arc depth; keeps the fan inside the 156 px dock. */
const MAX_DROP = 6;

interface HandFanProps {
  slots: HandSlotItem[];
  onCardPointerDown: (e: React.PointerEvent, card: CardWidget) => void;
  onReturnToDeck: (cardId: string, deckId: string) => void;
}

export const HandFan: React.FC<HandFanProps> = ({ slots, onCardPointerDown, onReturnToDeck }) => {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const fan = fanLayout(slots.length, width - 8, CARD_W, { maxDrop: MAX_DROP });

  return (
    <Box
      ref={ref}
      sx={{
        flex: 1,
        minWidth: 0,
        overflowX: fan.overflow ? 'auto' : 'visible',
        overflowY: fan.overflow ? 'hidden' : 'visible',
        display: 'flex',
        justifyContent: fan.overflow ? 'flex-start' : 'center',
        alignItems: 'flex-start',
        '&::-webkit-scrollbar': { height: 4 },
      }}
    >
      <Box
        sx={{ position: 'relative', width: fan.width, height: CARD_H + MAX_DROP, flexShrink: 0 }}
      >
        {slots.map((slot, i) => {
          const pos = fan.slots[i];
          return (
            <Box
              key={slot.key}
              data-testid="hand-fan-card"
              sx={{
                position: 'absolute',
                left: pos.x,
                top: pos.drop,
                zIndex: i + 1,
                transform: `rotate(${pos.rotate}deg)`,
                transformOrigin: '50% 120%',
                transition: 'left 0.18s ease, top 0.18s ease, transform 0.18s ease',
                '&:hover, &:focus-within': { zIndex: 100 },
              }}
            >
              <HandCardItem
                card={slot.card}
                count={slot.count}
                onReturnToDeck={onReturnToDeck}
                onPointerDown={(e) => onCardPointerDown(e, slot.card)}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
