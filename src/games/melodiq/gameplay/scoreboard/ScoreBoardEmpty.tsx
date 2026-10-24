import React from 'react';
import { Box, Typography } from '@mui/material';
import { ScoreBoardQrCode } from '../ScoreBoardQrCode';

interface ScoreBoardEmptyProps {
  next?: { title: string; artist: string };
}

/** Shown when nobody sang: song finished, what comes next, and the join QR code. */
export const ScoreBoardEmpty: React.FC<ScoreBoardEmptyProps> = ({ next }) => (
  <Box
    sx={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Typography variant="h4" sx={{ color: 'text.primary', mb: 4 }}>
      Song beendet
    </Typography>
    {next ? (
      <Box
        sx={{
          textAlign: 'center',
          p: 6,
          bgcolor: 'background.paper',
          borderRadius: 5,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" sx={{ color: 'text.secondary', mb: 2 }}>
          ALS NÄCHSTES
        </Typography>
        <Typography variant="h2" sx={{ color: 'primary.main', mb: 1 }}>
          {next.title}
        </Typography>
        <Typography variant="h4" sx={{ color: 'text.primary' }}>
          {next.artist}
        </Typography>
      </Box>
    ) : (
      <Typography variant="h5" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
        Warteschlange ist leer.
      </Typography>
    )}
    <ScoreBoardQrCode sx={{ mt: 3, maxWidth: 440, width: '100%' }} />
  </Box>
);
