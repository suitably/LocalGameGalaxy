import React from 'react';
import { Box, Typography } from '@mui/material';
import type { Note } from '../../parser';
import { LyricsLane, type LyricsLaneProps } from './LyricsLane';
import { PartMicButton } from './PartMicButton';

type SharedLaneProps = Omit<LyricsLaneProps, 'notes' | 'color' | 'align' | 'laneRef'>;

export interface DuetPartProps {
  notes: Note[];
  color: string;
  partName: string;
  /** Portrait phone: the parts sit on top of each other, the lane takes the full width. */
  stacked: boolean;
  /** First part: draws the divider to the second one. */
  first: boolean;
  isSmallScreen: boolean;
  laneRef?: React.Ref<HTMLDivElement>;
  laneProps: SharedLaneProps;
  /** Set on phones only: this phone sings the part (`active`) or can pick it. */
  mic?: { active: boolean; onClick: () => void };
}

/** One part of a duet: its lyrics lane plus the part's name and, on phones, its mic. */
export const DuetPart: React.FC<DuetPartProps> = ({
  notes,
  color,
  partName,
  stacked,
  first,
  isSmallScreen,
  laneRef,
  laneProps,
  mic,
}) => {
  const micButton = mic && (
    <PartMicButton color={color} active={mic.active} partName={partName} onClick={mic.onClick} />
  );
  // The name pairs with the lane colour, so colour is never the only signal.
  const name = (
    <Typography
      variant="caption"
      noWrap
      sx={{ color, fontSize: isSmallScreen ? '0.75rem' : '0.875rem', maxWidth: '100%' }}
    >
      {partName}
    </Typography>
  );
  const lane = (
    <LyricsLane
      notes={notes}
      color={color}
      align={stacked ? 'left' : 'center'}
      laneRef={laneRef}
      {...laneProps}
    />
  );

  if (stacked) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          width: '100%',
          px: 2,
          py: 0.5,
          // Lane colour as a side stripe marks the part even where the name is cut off.
          borderLeft: 4,
          borderLeftColor: color,
          ...(first && { borderBottom: 1, borderBottomColor: 'divider' }),
        }}
      >
        <Box
          sx={{
            width: 56,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.25,
          }}
        >
          {micButton}
          {name}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>{lane}</Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0, // Long no-wrap lines must shrink to the lane, not push it off screen
        px: { xs: 1, md: 2 },
        ...(first && { borderRight: 1, borderColor: 'divider' }),
      }}
    >
      {lane}
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 0.5 }}
      >
        {micButton}
        {name}
      </Box>
    </Box>
  );
};
