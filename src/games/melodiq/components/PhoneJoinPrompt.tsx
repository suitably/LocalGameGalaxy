import React from 'react';
import { Dialog, DialogTitle, DialogContent, Button, Typography, Box } from '@mui/material';
import MicIcon from '@mui/icons-material/MicRounded';
import VisibilityIcon from '@mui/icons-material/VisibilityRounded';
import { useTranslation } from 'react-i18next';
import { useClientEngine } from '../PhoneClientEngine';
import { CONTROLLER_TARGET } from '../../../lib/touchTarget';

export const PhoneJoinPrompt: React.FC = () => {
  const { t } = useTranslation();
  const {
    isSessionPlaying,
    activeSongId: contextActiveSongId,
    promptedSongId,
    setPromptedSongId,
    setClientRole,
    updateClientProfile,
    sendClientCommand,
  } = useClientEngine();

  // Only show if the game is playing, and we haven't prompted for this song yet.
  const activeSongId = contextActiveSongId || 'unknown';
  const open = isSessionPlaying && promptedSongId !== activeSongId;

  const handleChoice = (mode: 'singer' | 'spectator') => {
    setClientRole(mode);
    if (mode === 'spectator') {
      updateClientProfile({ displayMode: 'lyrics' });
    } else {
      updateClientProfile({ displayMode: 'self' });
    }
    sendClientCommand('session.join_mode', { mode });
    setPromptedSongId(activeSongId);
  };

  if (!open) return null;

  return (
    <Dialog open={open} sx={{ zIndex: 1400 }}>
      <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>
        {t('melodiq.join_prompt.title')}
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 3, textAlign: 'center' }}>{t('melodiq.join_prompt.body')}</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<MicIcon />}
            sx={{ minHeight: CONTROLLER_TARGET }}
            onClick={() => handleChoice('singer')}
          >
            {t('melodiq.join_prompt.singer')}
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            size="large"
            startIcon={<VisibilityIcon />}
            sx={{ minHeight: CONTROLLER_TARGET }}
            onClick={() => handleChoice('spectator')}
          >
            {t('melodiq.join_prompt.spectator')}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
