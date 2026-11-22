/**
 * "Show on TV" dialog [ID: COMP-SHOW-ON-TV]
 *
 * Offers the ways this device can actually reach a TV (`screenOptions`): Cast via the
 * Presentation API (desktop Chrome/Edge), a separate window for a laptop/PC on the TV, the
 * share sheet on phones, and screen mirroring when this device shows only public content.
 * The screen URL as QR code and text always works (TV browser, second device).
 * See `src/lib/secondScreen.ts`.
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
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import CastRoundedIcon from '@mui/icons-material/CastRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import ScreenShareRoundedIcon from '@mui/icons-material/ScreenShareRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import {
  buildScreenUrl,
  currentScreenPlatform,
  openScreenWindow,
  presentOnScreen,
  screenOptions,
  type ScreenOption,
} from '../../lib/secondScreen';

export interface ShowOnTvDialogProps {
  open: boolean;
  onClose: () => void;
  /** App route the TV opens, e.g. `/games/tabletop?room=AB&role=screen`. */
  screenRoute: string;
  /** This device shows only public content (table-only host), so mirroring it is safe. */
  mirrorSafe?: boolean;
}

const ICONS: Record<ScreenOption, React.ReactNode> = {
  cast: <CastRoundedIcon />,
  window: <OpenInNewRoundedIcon />,
  share: <ShareRoundedIcon />,
  mirror: <ScreenShareRoundedIcon />,
};

export const ShowOnTvDialog: React.FC<ShowOnTvDialogProps> = ({
  open,
  onClose,
  screenRoute,
  mirrorSafe = false,
}) => {
  const { t } = useTranslation();
  const platform = useMemo(() => currentScreenPlatform(), []);
  const url = buildScreenUrl(screenRoute, platform);
  const options = screenOptions(platform, {
    canShare: typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    mirrorSafe,
  });
  const [error, setError] = useState<'castFailed' | 'windowBlocked' | null>(null);
  const [copied, setCopied] = useState(false);

  const run: Record<ScreenOption, (() => void) | undefined> = {
    cast: () => {
      setError(null);
      presentOnScreen(url).then(onClose, () => setError('castFailed'));
    },
    window: () => {
      if (openScreenWindow(url)) onClose();
      else setError('windowBlocked');
    },
    share: () => {
      navigator.share({ title: t('secondScreen.title'), url }).then(onClose, () => {});
    },
    // Mirroring is started from the system UI; the entry only explains how.
    mirror: undefined,
  };
  const copy = () => {
    void navigator.clipboard?.writeText(url).then(() => setCopied(true));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t('secondScreen.title')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {options.length > 0 && (
          <List disablePadding>
            {options.map((option) => {
              const text = (
                <>
                  <ListItemIcon>{ICONS[option]}</ListItemIcon>
                  <ListItemText
                    primary={t(`secondScreen.${option}`)}
                    secondary={t(`secondScreen.${option}Desc`)}
                  />
                </>
              );
              const action = run[option];
              return action ? (
                <ListItemButton key={option} onClick={action} sx={{ borderRadius: 2 }}>
                  {text}
                </ListItemButton>
              ) : (
                <ListItem key={option}>{text}</ListItem>
              );
            })}
          </List>
        )}
        {error && <Alert severity="warning">{t(`secondScreen.${error}`)}</Alert>}
        <Typography variant="body2">{t('secondScreen.otherDevice')}</Typography>
        <Box display="flex" justifyContent="center">
          <Paper sx={{ p: 1.5, bgcolor: 'common.white', borderRadius: 2 }}>
            <QRCodeSVG value={url} size={160} />
          </Paper>
        </Box>
        <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
          {url}
        </Typography>
        {platform.android && !mirrorSafe && (
          <Alert severity="info">{t('secondScreen.androidHint')}</Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button startIcon={<ContentCopyRoundedIcon />} onClick={copy}>
          {copied ? t('secondScreen.copied') : t('secondScreen.copyLink')}
        </Button>
        <Button variant="contained" onClick={onClose}>
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
