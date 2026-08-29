import React from 'react';
import { Box } from '@mui/material';

interface HintWordSlotsProps {
  slotCount: number;
  guess: string;
  wordMask?: string[];
  onSlotClick?: (index: number) => void;
  interactive?: boolean;
}

export const HintWordSlots: React.FC<HintWordSlotsProps> = ({
  slotCount,
  guess,
  wordMask,
  onSlotClick,
  interactive = true,
}) => {
  const renderSlot = (index: number) => {
    const char = guess[index] ?? '';
    if (char && char.trim() !== '') {
      return char.toUpperCase();
    }
    if (Array.isArray(wordMask) && wordMask[index] != null) {
      return wordMask[index] === ' ' ? '·' : '_';
    }
    return '_';
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        justifyContent: 'center',
        flexWrap: 'wrap',
        cursor: interactive ? 'pointer' : 'default',
        py: 1,
      }}
    >
      {Array.from({ length: slotCount }).map((_, index) => {
        const isSpace = wordMask && wordMask[index] === ' ';
        if (isSpace) {
          return (
            <Box
              key={`space-${index}`}
              sx={{
                width: 20,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                color: 'text.secondary',
              }}
            >
              •
            </Box>
          );
        }

        return (
          <Box
            key={`slot-${index}`}
            onClick={() => interactive && onSlotClick?.(index)}
            sx={{
              width: 38,
              height: 48,
              borderRadius: 1.5,
              border: '2px solid',
              borderColor: guess[index] ? 'primary.main' : 'divider',
              bgcolor: guess[index] ? 'primary.main' : 'background.paper',
              color: guess[index] ? 'primary.contrastText' : 'text.primary',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 700,
              userSelect: 'none',
              transition: 'all 0.15s ease-in-out',
              boxShadow: guess[index] ? 2 : 0,
            }}
          >
            {renderSlot(index)}
          </Box>
        );
      })}
    </Box>
  );
};
