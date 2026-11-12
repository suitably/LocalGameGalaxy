import React, { useState } from 'react';
import {
  Button,
  Collapse,
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
import { useMelodiqSettings } from '../../hooks/SettingsContext';
import { FallbackBackgroundField } from '../../components/FallbackBackgroundField';

interface YouTubeConsentDialogProps {
  open: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

/**
 * Asked once, before the first song with a YouTube background starts (#645). Nothing is loaded
 * from Google before the player allows it; the choice can be changed in the game settings.
 * Players who decline can pick their own background (image/video) right here.
 */
export const YouTubeConsentDialog: React.FC<YouTubeConsentDialogProps> = ({
  open,
  onAllow,
  onDeny,
}) => {
  const { t, i18n } = useTranslation();
  const { settings, updateSetting } = useMelodiqSettings();
  const [ownBackgroundOpen, setOwnBackgroundOpen] = useState(false);
  const ownBackground = settings.fallbackBackgroundUrl || '';
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
        <Collapse in={ownBackgroundOpen}>
          <FallbackBackgroundField
            value={ownBackground}
            onChange={(url) => updateSetting('fallbackBackgroundUrl', url)}
          />
        </Collapse>
        {!ownBackgroundOpen && (
          <Button size="small" sx={{ mt: 1, px: 0 }} onClick={() => setOwnBackgroundOpen(true)}>
            {t('melodiq.youtube_consent.own_background')}
          </Button>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onDeny} fullWidth>
          {t(
            ownBackground
              ? 'melodiq.youtube_consent.use_own_background'
              : 'melodiq.youtube_consent.deny',
          )}
        </Button>
        <Button variant="contained" onClick={onAllow} fullWidth>
          {t('melodiq.youtube_consent.allow')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
