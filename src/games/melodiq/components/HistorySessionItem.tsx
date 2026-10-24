import React from 'react';
import {
  Box,
  Typography,
  Checkbox,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreRounded';
import MusicNoteIcon from '@mui/icons-material/MusicNoteRounded';
import { type HistorySession } from '../hooks/useHistory';

interface HistorySessionItemProps {
  session: HistorySession;
  selected: boolean;
  onToggle: () => void;
}

/** One played song in the history with its per-player scores. */
export const HistorySessionItem: React.FC<HistorySessionItemProps> = ({
  session,
  selected,
  onToggle,
}) => (
  <Accordion sx={{ mb: 1, bgcolor: 'action.disabledBackground', borderRadius: 1 }}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <Checkbox checked={selected} onClick={(e) => e.stopPropagation()} onChange={onToggle} />
        <Avatar sx={{ width: 40, height: 40, bgcolor: 'action.selected', mr: 2 }}>
          {session.song?.cover ? (
            <img
              src={session.song.cover as string}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <MusicNoteIcon />
          )}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0, mr: 2 }}>
          <Typography noWrap fontWeight="bold">
            {session.song?.title || 'Unknown Song'}
          </Typography>
          <Typography noWrap variant="body2" color="text.secondary">
            {session.song?.artist || 'Unknown Artist'}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
          {new Date(session.date).toLocaleDateString()}
        </Typography>
      </Box>
    </AccordionSummary>
    <AccordionDetails sx={{ pt: 0, pb: 2, px: 2 }}>
      <Divider sx={{ mb: 1 }} />
      {session.players.map((player, idx) => (
        <Box
          key={idx}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 0.5,
            px: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              sx={{
                width: 24,
                height: 24,
                bgcolor: player.profile
                  ? `hsl(${player.profile.hue}, 80%, 40%)`
                  : 'action.selected',
                color: 'common.white',
                fontSize: '0.8rem',
              }}
            >
              {player.profile ? player.profile.name.charAt(0).toUpperCase() : '?'}
            </Avatar>
            <Typography variant="body2">{player.profile?.name || 'Unknown Player'}</Typography>
          </Box>
          <Typography variant="body2" fontWeight="bold" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {player.score.toLocaleString()} pts
          </Typography>
        </Box>
      ))}
    </AccordionDetails>
  </Accordion>
);
