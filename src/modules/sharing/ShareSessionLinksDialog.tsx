import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import { useTranslation } from 'react-i18next';
import { PushNotificationBanner } from '../../components/push/PushNotificationBanner';
import type { PlayerSeat } from '../player-management';
import { SharePlayerRow } from './SharePlayerRow';
import { COPIED_FEEDBACK_MS } from './useShareOrCopy';

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
  /** Link shown as QR code; defaults to `buildLink`. Pass a short link when that one gets long. */
  buildQrLink?: (playerId: string) => string;
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
  buildQrLink = buildLink,
  isPlayerLocal,
  onMarkPlayerRemote,
  onMarkPlayerLocal,
  shareMessageTitle,
  shareMessageText,
  descriptionText,
  enablePushBanner = true,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const [copiedPlayerId, setCopiedPlayerId] = useState<string | null>(null);
  const [activeQrPlayerId, setActiveQrPlayerId] = useState<string | null>(null);

  const handleToggleQr = (playerId: string) => {
    const isOpening = activeQrPlayerId !== playerId;
    setActiveQrPlayerId(isOpening ? playerId : null);
    if (isOpening) {
      onMarkPlayerRemote(playerId);
    }
  };

  const copyForPlayer = async (playerId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      // No clipboard access (insecure context or denied): no "copied" feedback.
      console.warn('[ShareSessionLinksDialog] Copy failed:', e);
      return;
    }
    setCopiedPlayerId(playerId);
    setTimeout(() => setCopiedPlayerId(null), COPIED_FEEDBACK_MS);
  };

  const handleCopyLink = (playerId: string) => {
    onMarkPlayerRemote(playerId);
    void copyForPlayer(playerId, buildLink(playerId));
  };

  const handleNativeShare = async (player: SessionPlayerItem) => {
    onMarkPlayerRemote(player.id);
    const link = buildLink(player.id);
    const title = shareMessageTitle || `${sessionTitle}`;
    const text = shareMessageText
      ? shareMessageText(player, link)
      : t('common.shareMessage', {
          name: player.name,
          link,
          defaultValue: `Hallo ${player.name}! Hier ist dein Mitspieler-Link: ${link}`,
        });

    if (navigator.share) {
      try {
        // The link is part of the text; passing `url` as well makes share targets repeat it.
        await navigator.share({ title, text });
      } catch {
        // User cancelled or share failed
      }
    } else {
      await copyForPlayer(player.id, text);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={phone}
      aria-labelledby="share-session-links-title"
    >
      <DialogTitle
        id="share-session-links-title"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pt: phone ? 'max(16px, env(safe-area-inset-top))' : 2,
        }}
      >
        <ShareRoundedIcon color="primary" />
        <Typography variant="h6" fontWeight={800} component="span" sx={{ flex: 1, minWidth: 0 }}>
          {sessionTitle}
        </Typography>
        <IconButton edge="end" onClick={onClose} aria-label={t('common.close', 'Schließen')}>
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 } }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {descriptionText ||
            t(
              'common.shareLinksDesc',
              'Mitspieler können per QR-Code oder Link auf ihrem eigenen Gerät mitspielen.',
            )}
        </Typography>

        <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gap: 1.5 }}>
          {players.map((p, index) => {
            const isLocal = isPlayerLocal(p.id);
            return (
              <SharePlayerRow
                key={p.id}
                player={p}
                isLocal={isLocal}
                isHostUser={index === 0 && isLocal}
                isCopied={copiedPlayerId === p.id}
                showQr={activeQrPlayerId === p.id}
                qrLink={activeQrPlayerId === p.id ? buildQrLink(p.id) : ''}
                onToggleQr={() => handleToggleQr(p.id)}
                onCopy={() => handleCopyLink(p.id)}
                onShare={() => handleNativeShare(p)}
                onPlayHere={onMarkPlayerLocal ? () => onMarkPlayerLocal(p.id) : undefined}
              />
            );
          })}
        </Box>

        {enablePushBanner && sessionId && (
          <Box mt={3}>
            <PushNotificationBanner gameId={sessionId} />
          </Box>
        )}
      </DialogContent>

      {!phone && (
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} variant="contained" sx={{ fontWeight: 700 }}>
            {t('common.close', 'Schließen')}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};
