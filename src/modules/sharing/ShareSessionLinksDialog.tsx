import React, { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import TransferWithinAStationRoundedIcon from '@mui/icons-material/TransferWithinAStationRounded';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { PushNotificationBanner } from '../../components/push/PushNotificationBanner';
import type { PlayerSeat } from '../player-management';
import { SeatStatusChip } from './SeatStatusChip';
import { SharePlayerActions } from './SharePlayerActions';

export interface SessionPlayerItem {
  id: string;
  name: string;
  isRemote?: boolean;
  relayUrl?: string;
  seat?: PlayerSeat;
}

export interface ShareSessionLinksDialogProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  sessionTitle: string;
  players: SessionPlayerItem[];
  buildLink: (playerId: string) => string;
  isPlayerLocal: (playerId: string) => boolean;
  onMarkPlayerRemote: (playerId: string) => void;
  onMarkPlayerLocal?: (playerId: string) => void;
  shareMessageTitle?: string;
  shareMessageText?: (player: SessionPlayerItem, link: string) => string;
  descriptionText?: string;
  enablePushBanner?: boolean;
}

export const ShareSessionLinksDialog: React.FC<ShareSessionLinksDialogProps> = ({
  open,
  onClose,
  sessionId,
  sessionTitle,
  players,
  buildLink,
  isPlayerLocal,
  onMarkPlayerRemote,
  onMarkPlayerLocal,
  shareMessageTitle,
  shareMessageText,
  descriptionText,
  enablePushBanner = true,
}) => {
  const { t } = useTranslation();
  const [copiedPlayerId, setCopiedPlayerId] = useState<string | null>(null);
  const [activeQrPlayerId, setActiveQrPlayerId] = useState<string | null>(null);

  const handleToggleQr = (playerId: string) => {
    const isOpening = activeQrPlayerId !== playerId;
    setActiveQrPlayerId(isOpening ? playerId : null);
    if (isOpening) {
      onMarkPlayerRemote(playerId);
    }
  };

  const handleCopyLink = (playerId: string) => {
    onMarkPlayerRemote(playerId);
    const link = buildLink(playerId);
    navigator.clipboard.writeText(link);
    setCopiedPlayerId(playerId);
    setTimeout(() => setCopiedPlayerId(null), 2500);
  };

  const handleNativeShare = async (player: SessionPlayerItem) => {
    onMarkPlayerRemote(player.id);
    const link = buildLink(player.id);
    const title = shareMessageTitle || `${sessionTitle}`;
    const text = shareMessageText
      ? shareMessageText(player, link)
      : `🎮 Hallo ${player.name}! Spiele mit uns mit: ${link}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: link });
      } catch {
        // User cancelled or share failed
      }
    } else {
      navigator.clipboard.writeText(text);
      setCopiedPlayerId(player.id);
      setTimeout(() => setCopiedPlayerId(null), 2500);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ShareRoundedIcon color="primary" />
        <Typography variant="h6" fontWeight={800} component="div">
          {sessionTitle}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {descriptionText ||
            t(
              'common.shareLinksDesc',
              'Sobald ein Link oder QR-Code geteilt wird, wird der Spieler als Remote markiert. Mitspieler spielen auf ihrem Smartphone mit.',
            )}
        </Typography>

        {enablePushBanner && sessionId && <PushNotificationBanner gameId={sessionId} />}

        <List disablePadding sx={{ mt: 2 }}>
          {players.map((p, index) => {
            const isCopied = copiedPlayerId === p.id;
            const showQr = activeQrPlayerId === p.id;
            const link = buildLink(p.id);
            const isLocal = isPlayerLocal(p.id);
            const isHostUser = index === 0 && isLocal;

            return (
              <Paper
                key={p.id}
                variant="outlined"
                sx={{
                  mb: 1.5,
                  p: 1.5,
                  borderRadius: 2.5,
                  bgcolor: 'background.paper',
                  borderColor: 'divider',
                }}
              >
                <ListItem
                  disableGutters
                  secondaryAction={
                    isHostUser ? (
                      <Chip
                        size="small"
                        variant="outlined"
                        color="success"
                        label={t('common.hostDeviceBadge', 'Dein Gerät')}
                        sx={{ fontWeight: 700 }}
                      />
                    ) : (
                      <SharePlayerActions
                        isCopied={isCopied}
                        showQr={showQr}
                        onToggleQr={() => handleToggleQr(p.id)}
                        onCopy={() => handleCopyLink(p.id)}
                        onShare={() => handleNativeShare(p)}
                      />
                    )
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 'bold' }}>
                      {p.name.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        <Typography variant="subtitle1" fontWeight={700}>
                          {p.name}
                        </Typography>
                        <SeatStatusChip player={p} isLocal={isLocal} />
                      </Box>
                    }
                    secondary={
                      !isLocal && onMarkPlayerLocal ? (
                        <Button
                          size="small"
                          variant="text"
                          color="inherit"
                          startIcon={<TransferWithinAStationRoundedIcon fontSize="small" />}
                          onClick={() => onMarkPlayerLocal(p.id)}
                          sx={{
                            textTransform: 'none',
                            fontSize: '0.75rem',
                            p: 0,
                            mt: 0.5,
                            color: 'text.secondary',
                          }}
                        >
                          {t('common.playHereInsteadShort', 'Auf diesem Gerät spielen')}
                        </Button>
                      ) : null
                    }
                  />
                </ListItem>

                {showQr && (
                  <Box display="flex" flexDirection="column" alignItems="center" py={1.5} gap={1}>
                    <Paper sx={{ p: 1.5, bgcolor: 'text.primary', borderRadius: 2 }}>
                      <QRCodeSVG value={link} size={150} />
                    </Paper>
                    <Typography variant="caption" color="text.secondary">
                      {t('common.scanQrToPlayAs', {
                        name: p.name,
                        defaultValue: `Scanne diesen Code, um als ${p.name} mitzuspielen!`,
                      })}
                    </Typography>
                  </Box>
                )}
              </Paper>
            );
          })}
        </List>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained" sx={{ fontWeight: 700 }}>
          {t('common.close', 'Schließen')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
