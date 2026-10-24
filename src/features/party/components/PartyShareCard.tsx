/**
 * Join link, copy and QR code [ID: COMP-PARTY-SHARE-CARD]
 */
import React from 'react';
import { Box, Button, Card, IconButton, Paper, Typography } from '@mui/material';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import QrCodeRoundedIcon from '@mui/icons-material/QrCodeRounded';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import type { PartyLobbyController } from '../hooks/usePartyLobbyController';

export const PartyShareCard: React.FC<{ lobby: PartyLobbyController }> = ({ lobby }) => {
  const { t } = useTranslation();
  const { copied, showQr, setShowQr, handleCopyLink, shareUrl } = lobby;
  return (
    <>
      {/* Share Link & QR Card */}
      <Card
        variant="outlined"
        sx={{
          p: 2,
          mb: 3,
          bgcolor: 'action.hover',
          borderRadius: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            {t('party.invitePrompt', 'Freunde einladen: 1× scannen für den ganzen Abend!')}
          </Typography>
          <Box display="flex" gap={1}>
            <IconButton
              size="small"
              onClick={() => setShowQr(!showQr)}
              color={showQr ? 'primary' : 'default'}
            >
              <QrCodeRoundedIcon fontSize="small" />
            </IconButton>
            <Button
              size="small"
              variant="outlined"
              startIcon={copied ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />}
              onClick={handleCopyLink}
              color={copied ? 'success' : 'primary'}
              sx={{ fontWeight: 'bold', borderRadius: 2 }}
            >
              {copied ? t('common.copied', 'Kopiert!') : t('common.copyLink', 'Link kopieren')}
            </Button>
          </Box>
        </Box>

        {showQr && (
          <Box display="flex" justifyContent="center" py={1.5}>
            <Paper sx={{ p: 2, bgcolor: 'text.primary', borderRadius: 2 }}>
              <QRCodeSVG value={shareUrl} size={160} />
            </Paper>
          </Box>
        )}
      </Card>
    </>
  );
};
