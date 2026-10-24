import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import HistoryIcon from '@mui/icons-material/HistoryRounded';
import { pieceColorForHue } from '../../logic/singerColor';
import type { HistoricalEntry } from '../logic/scoreBoardRanking';

const tabularNums = { fontVariantNumeric: 'tabular-nums' } as const;

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
  });

const HistoryRow: React.FC<{ entry: HistoricalEntry; rank: number }> = ({ entry, rank }) => {
  const pieceKey = pieceColorForHue(entry.hue);
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        p: 1.5,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Typography
        variant="body1"
        sx={{ width: 40, textAlign: 'center', color: 'text.secondary', ...tabularNums }}
      >
        {rank}.
      </Typography>
      {/* Colour dot pairs with the name, so colour is never the only signal. */}
      <Box
        sx={(theme) => ({
          width: 12,
          height: 12,
          borderRadius: '50%',
          flexShrink: 0,
          mr: 1,
          bgcolor: theme.palette.piece[pieceKey],
        })}
      />
      <Typography
        variant="body1"
        noWrap
        sx={{ flex: 1, minWidth: 0, color: 'text.primary', fontWeight: 600, mr: 1 }}
      >
        {entry.name}
      </Typography>
      <Typography
        variant="body1"
        sx={{
          color: 'text.primary',
          fontWeight: 600,
          mx: 2,
          minWidth: 60,
          textAlign: 'right',
          ...tabularNums,
        }}
      >
        {Math.round(entry.score).toLocaleString()}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', minWidth: 60, textAlign: 'right', ...tabularNums }}
      >
        {formatDate(entry.date)}
      </Typography>
    </Box>
  );
};

export const ScoreBoardHistory: React.FC<{ entries: HistoricalEntry[] }> = ({ entries }) => (
  <Paper
    elevation={0}
    sx={{
      flex: 1,
      minHeight: 0,
      bgcolor: 'background.paper',
      borderRadius: 5,
      border: 1,
      borderColor: 'divider',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}
  >
    <Box
      sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <HistoryIcon sx={{ color: 'text.secondary' }} />
      <Typography variant="h6" sx={{ color: 'text.secondary' }}>
        ALL-TIME BEST
      </Typography>
    </Box>

    <Box sx={{ flex: 1, overflowY: 'auto' }}>
      {entries.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No history available yet.</Typography>
        </Box>
      ) : (
        entries.map((entry, index) => <HistoryRow key={index} entry={entry} rank={index + 1} />)
      )}
    </Box>
  </Paper>
);
