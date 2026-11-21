/**
 * "Show on TV" dialog [ID: COMP-SHOW-ON-TV]
 *
 * Shows the screen URL as QR code and text for a TV browser (works everywhere, also on
 * Android and in the app), plus a Cast button where the Presentation API can reach a
 * Chromecast (desktop Chrome/Edge). See `src/lib/secondScreen.ts`.
 */
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Typography,
} from '@mui/material';
import CastRoundedIcon from '@mui/icons-material/CastRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import {
  buildScreenUrl,
  canTryPresentation,
  currentScreenPlatform,
  presentOnScreen,
} from '../../lib/secondScreen';

export interface ShowOnTvDialogProps {
  open: boolean;
  onClose: () => void;
  /** App route the TV opens, e.g. `/games/tabletop?room=AB&role=screen`. */
  screenRoute: string;
}

export const ShowOnTvDialog: React.FC<ShowOnTvDialogProps> = ({ open, onClose, screenRoute }) => {
  const { t } = useTranslation();
  const platform = useMemo(() => currentScreenPlatform(), []);
  const url = buildScreenUrl(screenRoute, platform);
  const [castFailed, setCastFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  const cast = () => {
    setCastFailed(false);
    presentOnScreen(url).catch(() => setCastFailed(true));
  };
  const copy = () => {
    void navigator.clipboard?.writeText(url).then(() => setCopied(true));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t('secondScreen.title')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="body2">{t('secondScreen.openOnTv')}</Typography>
        <Box display="flex" justifyContent="center">
          <Paper sx={{ p: 1.5, bgcolor: 'common.white', borderRadius: 2 }}>
            <QRCodeSVG value={url} size={180} />
          </Paper>
        </Box>
        <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
          {url}
        </Typography>
        {platform.android && <Alert severity="info">{t('secondScreen.androidHint')}</Alert>}
        {castFailed && <Alert severity="warning">{t('secondScreen.castFailed')}</Alert>}
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button startIcon={<ContentCopyRoundedIcon />} onClick={copy}>
          {copied ? t('secondScreen.copied') : t('secondScreen.copyLink')}
        </Button>
        {canTryPresentation(platform) && (
          <Button startIcon={<CastRoundedIcon />} onClick={cast}>
            {t('secondScreen.cast')}
          </Button>
        )}
        <Button variant="contained" onClick={onClose}>
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
