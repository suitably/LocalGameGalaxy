/**
 * One player in the share dialog: seat status, link actions and QR code [ID: MOD-SHARING-PLAYER-ROW]
 *
 * Stacked layout (identity, then actions, then QR code) so nothing overlaps on a narrow phone.
 */
import React from 'react';
import { Alert, Avatar, Box, Button, Chip, Collapse, Paper, Typography } from '@mui/material';
import TransferWithinAStationRoundedIcon from '@mui/icons-material/TransferWithinAStationRounded';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { SeatStatusChip } from './SeatStatusChip';
import { SharePlayerActions } from './SharePlayerActions';
import { fitsQrCode } from './sessionLink';
import type { SessionPlayerItem } from './ShareSessionLinksDialog';

export interface SharePlayerRowProps {
  player: SessionPlayerItem;
  isLocal: boolean;
  /** The inviting player on this device: nothing to share. */
  isHostUser: boolean;
  isCopied: boolean;
  showQr: boolean;
  qrLink: string;
  onToggleQr: () => void;
  onCopy: () => void;
  onShare: () => void;
  onPlayHere?: () => void;
}

export const SharePlayerRow: React.FC<SharePlayerRowProps> = ({
  player,
  isLocal,
  isHostUser,
  isCopied,
  showQr,
  qrLink,
  onToggleQr,
  onCopy,
  onShare,
  onPlayHere,
}) => {
  const { t } = useTranslation();
  return (
    <Paper
      component="li"
      variant="outlined"
      sx={{ p: 1.5, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}
    >
      <Box display="flex" alignItems="center" gap={1.5} minWidth={0}>
        <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 'bold' }} aria-hidden>
          {player.name.charAt(0).toUpperCase()}
        </Avatar>
        <Box minWidth={0} flex={1} display="flex" flexDirection="column" alignItems="flex-start">
          <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ maxWidth: '100%' }}>
            {player.name}
          </Typography>
          {isHostUser ? (
            <Chip
              size="small"
              variant="outlined"
              color="success"
              label={t('common.hostDeviceBadge', 'Dein Gerät')}
              sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }}
            />
          ) : (
            <Box maxWidth="100%" display="flex">
              <SeatStatusChip player={player} isLocal={isLocal} />
            </Box>
          )}
        </Box>
      </Box>

      {!isHostUser && (
        <SharePlayerActions
          isCopied={isCopied}
          showQr={showQr}
          onToggleQr={onToggleQr}
          onCopy={onCopy}
          onShare={onShare}
        />
      )}

      {!isHostUser && (
        <Collapse in={showQr} unmountOnExit>
          {fitsQrCode(qrLink) ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
              <Paper sx={{ p: 1.5, bgcolor: 'common.white', borderRadius: 2, lineHeight: 0 }}>
                <QRCodeSVG
                  value={qrLink}
                  size={220}
                  style={{ maxWidth: '100%', height: 'auto' }}
                  title={t('common.scanQrToPlayAs', {
                    name: player.name,
                    defaultValue: `Scanne diesen Code, um als ${player.name} mitzuspielen!`,
                  })}
                />
              </Paper>
              <Typography variant="caption" color="text.secondary" textAlign="center">
                {t('common.scanQrToPlayAs', {
                  name: player.name,
                  defaultValue: `Scanne diesen Code, um als ${player.name} mitzuspielen!`,
                })}
              </Typography>
            </Box>
          ) : (
            <Alert severity="warning" variant="outlined">
              {t(
                'common.qrLinkTooLong',
                'Dieser Link ist zu lang für einen QR-Code. Bitte kopiere oder teile ihn.',
              )}
            </Alert>
          )}
        </Collapse>
      )}

      {!isLocal && onPlayHere && (
        <Button
          size="small"
          variant="text"
          color="inherit"
          startIcon={<TransferWithinAStationRoundedIcon fontSize="small" />}
          onClick={onPlayHere}
          sx={{
            alignSelf: 'flex-start',
            textTransform: 'none',
            minHeight: 36,
            color: 'text.secondary',
          }}
        >
          {t('common.playHereInsteadShort', 'Auf diesem Gerät spielen')}
        </Button>
      )}
    </Paper>
  );
};
