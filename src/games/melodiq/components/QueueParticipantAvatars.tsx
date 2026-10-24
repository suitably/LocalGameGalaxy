import React from 'react';
import { Box, Avatar } from '@mui/material';
import type { MelodiqParticipant } from '../types';

interface QueueParticipantAvatarsProps {
  participants: MelodiqParticipant[];
  size: number;
  /** Negative spacing (theme units) between avatars; 0.5 adds a gap, 'stack' overlaps them. */
  overlap: number | 'stack';
}

/** Row of round initials in each singer's own hue. */
export const QueueParticipantAvatars: React.FC<QueueParticipantAvatarsProps> = ({
  participants,
  size,
  overlap,
}) => (
  <Box sx={{ display: 'flex', gap: overlap === 'stack' ? 0 : overlap }}>
    {participants.map((p, i) => (
      <Avatar
        key={i}
        sx={{
          width: size,
          height: size,
          fontSize: size < 24 ? '0.65rem' : '0.7rem',
          bgcolor: `hsl(${p.hue || 0}, 80%, 40%)`,
          color: 'common.white',
          border: 2,
          borderColor: 'background.paper',
          ml: overlap === 'stack' && i > 0 ? -1 : 0,
        }}
      >
        {p.name ? p.name.charAt(0).toUpperCase() : '?'}
      </Avatar>
    ))}
  </Box>
);
