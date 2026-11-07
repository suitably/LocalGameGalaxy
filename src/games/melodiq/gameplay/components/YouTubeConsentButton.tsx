import React from 'react';
import { Button, Tooltip } from '@mui/material';
import YouTubeIcon from '@mui/icons-material/YouTube';
import { useTranslation } from 'react-i18next';

interface YouTubeConsentButtonProps {
  onAllow: () => void;
}

/**
 * Shown instead of a YouTube background video until the player allows it (#645): nothing is
 * loaded from Google before that.
 */
export const YouTubeConsentButton: React.FC<YouTubeConsentButtonProps> = ({ onAllow }) => {
  const { t } = useTranslation();
  return (
    <Tooltip title={t('melodiq.youtube_consent.hint')}>
      <Button
        size="small"
        variant="contained"
        color="inherit"
        startIcon={<YouTubeIcon />}
        onClick={onAllow}
        sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, opacity: 0.85 }}
      >
        {t('melodiq.youtube_consent.load')}
      </Button>
    </Tooltip>
  );
};
