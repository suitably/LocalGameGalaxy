import React, { useState } from 'react';
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Typography,
} from '@mui/material';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';

const buildShareUrl = (roomId: string) => {
  const isProd = window.location.hostname.includes('github.io');
  const base = isProd
    ? `${window.location.origin}${window.location.pathname}`
    : `${window.location.protocol}//${window.location.hostname}:${window.location.port}${window.location.pathname}`;
  return `${base}#/party?room=${roomId}`;
};

interface GarticShareDialogProps {
  open: boolean;
  roomId: string;
  onClose: () => void;
}

export const GarticShareDialog: React.FC<GarticShareDialogProps> = ({ open, roomId, onClose }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(buildShareUrl(roomId));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ShareRoundedIcon color="primary" /> {t('party.shareLobby', 'Lobby teilen')}
      </DialogTitle>
      <DialogContent
        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pt: 1 }}
      >
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {t(
            'party.shareLobbyDesc',
            'Teile diesen Link oder scanne den QR-Code, um weitere Freunde ins Spiel einzuladen:',
          )}
        </Typography>

        <Paper sx={{ p: 2, bgcolor: 'common.white', borderRadius: 2 }}>
          <QRCodeSVG value={buildShareUrl(roomId)} size={180} />
        </Paper>

        <Chip
          label={`${t('party.room', 'Raum')}: ${roomId}`}
          color="primary"
          variant="filled"
          sx={{ fontWeight: 800, fontSize: '1rem', px: 1, py: 2 }}
        />

        <Button
          fullWidth
          variant="contained"
          color={copied ? 'success' : 'primary'}
          startIcon={copied ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />}
          onClick={handleCopyLink}
          sx={{ fontWeight: 800, py: 1.2, borderRadius: 2 }}
        >
          {copied ? t('common.copied', 'Link kopiert!') : t('common.copyLink', 'Link kopieren')}
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close', 'Schließen')}</Button>
      </DialogActions>
    </Dialog>
  );
};

interface GarticEndGameDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const GarticEndGameDialog: React.FC<GarticEndGameDialogProps> = ({
  open,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {t('party.confirmEndTitle', 'Spiel wirklich beenden?')}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          {t(
            'party.confirmEndDesc',
            'Das aktuelle Gartic Phone Spiel wird für alle verbundenen Spieler abgebrochen und alle kehren zur Party-Lobby zurück.',
          )}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel', 'Abbrechen')}</Button>
        <Button color="error" variant="contained" onClick={onConfirm}>
          {t('party.endGameBtn', 'Beenden')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
