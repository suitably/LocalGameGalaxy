/**
 * Cards lying in front of one seat, face up or down, tappable by position [ID: COMP-TABLETOP-SCRIPT-SLOTS]
 */
import React from 'react';
import { Box } from '@mui/material';
import type { ScriptTextFn } from '../hooks/useScriptText';
import type { SlotCard, SlotRef } from '../logic/scriptTypes';
import { PlayingCard } from './PlayingCard';

interface SlotGridProps {
  seat: number;
  slots: SlotCard[];
  /** Cards per row; one row when unset. */
  columns?: number;
  targets: SlotRef[];
  onTap?: (ref: SlotRef) => void;
  width: number;
  text: ScriptTextFn;
}

export const SlotGrid: React.FC<SlotGridProps> = ({
  seat,
  slots,
  columns,
  targets,
  onTap,
  width,
  text,
}) => {
  const tappable = (slot: number) =>
    Boolean(onTap) && targets.some((t) => t.seat === seat && t.slot === slot);
  const gap = Math.max(3, Math.round(width / 10));
  return (
    <Box
      sx={
        columns
          ? {
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, ${width}px)`,
              gap: `${gap}px`,
              justifyContent: 'center',
            }
          : {
              // A row of cards (a hand to draw from) wraps instead of widening the seat.
              display: 'flex',
              flexWrap: 'wrap',
              gap: `${gap}px`,
              justifyContent: 'center',
              maxWidth: `min(calc(100vw - 56px), ${7 * (width + gap)}px)`,
            }
      }
    >
      {slots.map((card, slot) => {
        const active = tappable(slot);
        return (
          <PlayingCard
            key={slot}
            card={card ?? undefined}
            width={width}
            highlighted={active}
            onClick={active ? () => onTap?.({ seat, slot }) : undefined}
            label={text({ key: 'slot', params: { n: slot + 1 }, seat })}
          />
        );
      })}
    </Box>
  );
};
