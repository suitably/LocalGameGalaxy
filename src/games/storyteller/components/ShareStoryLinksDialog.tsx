import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Tooltip,
  Typography,
  Avatar,
} from '@mui/material';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import QrCodeRoundedIcon from '@mui/icons-material/QrCodeRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import LZString from 'lz-string';
import type { StoryEntry, StoryGameRecord, StoryGameSnapshot } from '../types';
import { playerAssignment } from '../logic/playerAssignment';
import { gameRelayStorage } from '../../../lib/push/gameRelayStorage';
import { PushNotificationBanner } from '../../../components/push/PushNotificationBanner';

interface ShareStoryLinksDialogProps {
  open: boolean;
  onClose: () => void;
  game: StoryGameRecord | null;
  entries?: StoryEntry[];
  onPlayerChanged?: () => void;
}

export const ShareStoryLinksDialog: React.FC<ShareStoryLinksDialogProps> = ({
  open,
  onClose,
  game,
  entries = [],
  onPlayerChanged,
}) => {
  const { t } = useTranslation();
  const [copiedPlayerId, setCopiedPlayerId] = useState<string | null>(null);
  const [activeQrPlayerId, setActiveQrPlayerId] = useState<string | null>(null);

  if (!game) return null;

  const buildPlayerLink = (playerId: string) => {
    const snapshot: StoryGameSnapshot = { game, entries };
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(snapshot));
    const relay = gameRelayStorage.getGameRelay(game.id);
    let link = `${window.location.origin}${window.location.pathname}#/games/storyteller?gameId=${game.id}&player=${playerId}&data=${compressed}`;
    if (relay) {
      link += `&gameRelay=${encodeURIComponent(relay)}`;
    }
    return link;
  };

  const handleToggleQr = (playerId: string) => {
    const isOpening = activeQrPlayerId !== playerId;
    setActiveQrPlayerId(isOpening ? playerId : null);
    if (isOpening && game.players[0] && playerId !== game.players[0].id) {
      playerAssignment.removeLocalPlayerId(game.id, playerId);
      onPlayerChanged?.();
    }
  };

  const handleCopyLink = (playerId: string) => {
    const link = buildPlayerLink(playerId);
    navigator.clipboard.writeText(link);
    if (game.players[0] && playerId !== game.players[0].id) {
      playerAssignment.removeLocalPlayerId(game.id, playerId);
      onPlayerChanged?.();
    }
    setCopiedPlayerId(playerId);
    setTimeout(() => setCopiedPlayerId(null), 2500);
  };

  const handleNativeShare = async (playerId: string, playerName: string) => {
    const link = buildPlayerLink(playerId);
    const title = `${t('games.storyteller.title', 'Geschichtenschreiber')} - "${game.name || 'Geschichte'}"`;
    const text = `📖 Hallo ${playerName}! Schreibe mit an unserer Geschichte: ${link}`;

    if (game.players[0] && playerId !== game.players[0].id) {
      playerAssignment.removeLocalPlayerId(game.id, playerId);
      onPlayerChanged?.();
    }

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: link });
      } catch {
        // User cancelled or share failed
      }
    } else {
      navigator.clipboard.writeText(text);
      setCopiedPlayerId(playerId);
      setTimeout(() => setCopiedPlayerId(null), 2500);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ShareRoundedIcon color="primary" />
        <Typography variant="h6" fontWeight={800} component="div">
          {t('storyteller.shareLinksTitle', 'Mitspieler-Links & Benachrichtigungen')}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t(
            'storyteller.shareLinksDesc',
            'Mitspieler können per QR-Code oder Link auf ihrem eigenen Gerät mitspielen und Push-Benachrichtigungen empfangen, sobald sie am Zug sind.',
          )}
        </Typography>

        <PushNotificationBanner />

        <List disablePadding sx={{ mt: 2 }}>
          {game.players.map((p) => {
            const isCopied = copiedPlayerId === p.id;
            const showQr = activeQrPlayerId === p.id;
            const link = buildPlayerLink(p.id);

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
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Tooltip title={t('common.showQrCode', 'QR-Code anzeigen')}>
                        <IconButton
                          size="small"
                          color={showQr ? 'primary' : 'default'}
                          onClick={() => handleToggleQr(p.id)}
                          aria-label={t('common.showQrCode', 'QR-Code anzeigen')}
                          sx={{ bgcolor: 'action.hover' }}
                        >
                          <QrCodeRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title={isCopied ? t('common.copied', 'Kopiert!') : t('common.copyLink', 'Link kopieren')}>
                        <IconButton
                          size="small"
                          color={isCopied ? 'success' : 'primary'}
                          onClick={() => handleCopyLink(p.id)}
                          aria-label={t('common.copyLink', 'Link kopieren')}
                          sx={{ bgcolor: 'action.hover' }}
                        >
                          {isCopied ? <CheckRoundedIcon fontSize="small" /> : <ContentCopyRoundedIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>

                      {typeof navigator !== 'undefined' && 'share' in navigator && (
                        <Tooltip title={t('common.share', 'Teilen')}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleNativeShare(p.id, p.name)}
                            aria-label={t('common.share', 'Teilen')}
                            sx={{ bgcolor: 'action.hover' }}
                          >
                            <ShareRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 'bold' }}>
                      {p.name.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" fontWeight={700}>
                        {p.name}
                      </Typography>
                    }
                  />
                </ListItem>

                {showQr && (
                  <Box display="flex" flexDirection="column" alignItems="center" py={1.5} gap={1}>
                    <Paper sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: 2 }}>
                      <QRCodeSVG value={link} size={150} />
                    </Paper>
                    <Typography variant="caption" color="text.secondary">
                      {t('storyteller.scanQrToPlayAs', {
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
          {t('common.done', 'Fertig')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
