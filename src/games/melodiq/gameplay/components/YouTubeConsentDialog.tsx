import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Typography,
} from '@mui/material';
import YouTubeIcon from '@mui/icons-material/YouTube';
import { useTranslation } from 'react-i18next';
import { privacyNoticePath } from '../../../../features/settings/privacyNotice';

interface YouTubeConsentDialogProps {
  open: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

/**
 * Asked once, before the first song with a YouTube background starts (#645). Nothing is loaded
 * from Google before the player allows it; the choice can be changed in the game settings.
 */
export const YouTubeConsentDialog: React.FC<YouTubeConsentDialogProps> = ({
  open,
  onAllow,
  onDeny,
}) => {
  const { t, i18n } = useTranslation();
  return (
    <Dialog open={open} sx={{ zIndex: 1400 }} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <YouTubeIcon color="error" />
        {t('melodiq.youtube_consent.title')}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          {t('melodiq.youtube_consent.body')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t('melodiq.youtube_consent.settings_hint')}{' '}
          <Link
            href={privacyNoticePath(i18n.resolvedLanguage ?? i18n.language)}
            target="_blank"
            rel="noopener"
          >
            {t('melodiq.youtube_consent.privacy_link')}
          </Link>
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onDeny} fullWidth>
          {t('melodiq.youtube_consent.deny')}
        </Button>
        <Button variant="contained" onClick={onAllow} fullWidth>
          {t('melodiq.youtube_consent.allow')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
