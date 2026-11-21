/**
 * The players around the table: name, cards in hand, status chips [ID: COMP-TABLETOP-SCRIPT-SEATS]
 */
import React from 'react';
import { alpha, Box, Chip, Stack, Typography } from '@mui/material';
import { pieceColorForSlot } from '../../../../themeTokens';
import { transitionOf } from '../../../../lib/motion';
import type { ScriptView, SlotRef } from '../logic/scriptTypes';
import type { ScriptTextFn } from '../hooks/useScriptText';
import { PlayingCard } from './PlayingCard';
import { SlotGrid } from './SlotGrid';

interface SeatBadgesProps {
  view: ScriptView;
  names: string[];
  /** Seat of this device; it is listed like everyone else but marked. */
  viewer: number | null;
  text: ScriptTextFn;
  large?: boolean;
  /** Taps on another seat's slots; the viewer's own slots are shown below the table. */
  onSlot?: (ref: SlotRef) => void;
}

export const SeatBadges: React.FC<SeatBadgesProps> = ({
  view,
  names,
  viewer,
  text,
  large,
  onSlot,
}) => (
  <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="center">
    {view.seats.map((seat, index) => {
      const active = view.active.includes(index);
      const color = pieceColorForSlot(index);
      return (
        <Box
          key={index}
          sx={{
            minWidth: large ? 160 : 96,
            px: 1.25,
            py: 0.75,
            borderRadius: 3,
            border: '2px solid',
            borderColor: active ? color : 'divider',
            bgcolor: active ? alpha(color, 0.16) : 'background.paper',
            opacity: seat.out ? 0.5 : 1,
            transition: transitionOf(['background-color', 'border-color', 'opacity']),
          }}
        >
          <Stack direction="row" alignItems="center" gap={0.75}>
            <Box
              sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }}
            />
            <Typography
              noWrap
              fontWeight={800}
              sx={{ fontSize: large ? '1.2rem' : '0.9rem', maxWidth: large ? 220 : 110 }}
            >
              {names[index]}
              {index === viewer ? ' ★' : ''}
            </Typography>
            {(seat.cards > 0 || !seat.slots) && (
              <Stack direction="row" alignItems="center" gap={0.4} ml="auto">
                <PlayingCard width={large ? 16 : 12} />
                <Typography variant="caption" fontWeight={700}>
                  {seat.cards}
                </Typography>
              </Stack>
            )}
          </Stack>
          {seat.chips.length > 0 && (
            <Stack direction="row" gap={0.5} flexWrap="wrap" mt={0.5}>
              {seat.chips.map((chip, i) => (
                <Chip
                  key={i}
                  size="small"
                  label={text(chip)}
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              ))}
            </Stack>
          )}
          {seat.revealed && (
            <Stack direction="row" gap={0.25} flexWrap="wrap" mt={0.5}>
              {seat.revealed.map((card) => (
                <PlayingCard key={card} card={card} width={large ? 40 : 26} />
              ))}
            </Stack>
          )}
          {seat.slots && index !== viewer && (
            <Box mt={0.75}>
              <SlotGrid
                seat={index}
                slots={seat.slots}
                columns={seat.slotColumns}
                targets={view.slotTargets}
                onTap={onSlot}
                width={large ? 44 : 34}
                text={text}
              />
            </Box>
          )}
        </Box>
      );
    })}
  </Stack>
);
