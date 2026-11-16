import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import SkipNextIcon from '@mui/icons-material/SkipNextRounded';
import { ScoreBoardQrCode } from '../gameplay/ScoreBoardQrCode';

interface DownloadWaitScreenProps {
  songTitle: string;
  artist: string;
  onSkipAndRequeue: () => void;
}

export const DownloadWaitScreen: React.FC<DownloadWaitScreenProps> = ({
  songTitle,
  artist,
  onSkipAndRequeue,
}) => {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        color: 'text.primary',
        p: 3,
        gap: 3,
        overflow: 'auto',
      }}
    >
      <CircularProgress size={70} thickness={4} sx={{ color: 'primary.text' }} />

      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {t('melodiq.download_wait.title')}
        </Typography>
        <Typography variant="h5" color="text.secondary">
          {artist} - {songTitle}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5, opacity: 0.8 }}>
          {t('melodiq.download_wait.description')}
        </Typography>
      </Box>

      <Button
        variant="outlined"
        size="large"
        startIcon={<SkipNextIcon />}
        onClick={onSkipAndRequeue}
        sx={{
          borderRadius: 5,
          px: 4,
          py: 1.25,
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
          },
        }}
      >
        {t('melodiq.download_wait.skip')}
      </Button>

      <ScoreBoardQrCode sx={{ maxWidth: 450, width: '100%', mt: 1 }} />
    </Box>
  );
};
