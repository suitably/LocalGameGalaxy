import React from 'react';
import { Avatar, Box, Chip, Paper, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEventsRounded';
import StarIcon from '@mui/icons-material/StarRounded';
import { pieceColorForHue } from '../../logic/singerColor';
import type { ScoreBoardPlayer } from '../logic/scoreBoardRanking';

interface ScoreBoardSessionRowProps {
  player: ScoreBoardPlayer;
  rank: number;
}

const tabularNums = { fontVariantNumeric: 'tabular-nums' } as const;

/** One singer's row in the session ranking; the winner is marked by trophy, size and a primary outline. */
export const ScoreBoardSessionRow: React.FC<ScoreBoardSessionRowProps> = ({ player, rank }) => {
  const isWinner = rank === 1;
  const pieceKey = pieceColorForHue(player.config.hue);

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        alignItems: 'center',
        p: { xs: 2, md: 3 },
        borderRadius: 5,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: isWinner ? 'primary.main' : 'divider',
        borderWidth: isWinner ? 2 : 1,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mr: 2,
        }}
      >
        {isWinner ? (
          <EmojiEventsIcon sx={{ fontSize: 48, color: 'primary.text' }} />
        ) : (
          <Typography variant="h4" sx={{ color: 'text.secondary', ...tabularNums }}>
            #{rank}
          </Typography>
        )}
      </Box>

      <Avatar
        sx={(theme) => ({
          bgcolor: theme.palette.piece[pieceKey],
          color: theme.palette.piece.contrastText,
          width: isWinner ? 64 : 48,
          height: isWinner ? 64 : 48,
          mr: 2,
          fontSize: isWinner ? '1.5rem' : '1.25rem',
          fontWeight: 700,
          border: 1,
          borderColor: 'divider',
        })}
      >
        {player.config.name.substring(0, 1).toUpperCase()}
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant={isWinner ? 'h4' : 'h5'} noWrap sx={{ color: 'text.primary', mb: 0.5 }}>
          {player.config.name}
        </Typography>
        {player.isNewRecord && (
          <Chip
            icon={<StarIcon sx={{ fontSize: '1rem !important' }} />}
            label="PERSONAL BEST"
            size="small"
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              fontWeight: 700,
              '& .MuiChip-icon': { color: 'primary.contrastText' },
            }}
          />
        )}
        {player.loadingHistory && (
          <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
            Synchronizing...
          </Typography>
        )}
      </Box>

      <Typography
        variant={isWinner ? 'h2' : 'h3'}
        sx={{ color: isWinner ? 'primary.main' : 'text.primary', ...tabularNums }}
      >
        {Math.round(player.score).toLocaleString()}
      </Typography>
    </Paper>
  );
};
