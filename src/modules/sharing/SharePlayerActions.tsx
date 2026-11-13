/**
 * QR code, copy and share buttons for one player's link [ID: MOD-SHARING-PLAYER-ACTIONS]
 *
 * Labelled, equally wide buttons in one row: readable and large enough to tap on a phone.
 */
import React from 'react';
import { Box, Button } from '@mui/material';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import QrCodeRoundedIcon from '@mui/icons-material/QrCodeRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import { useTranslation } from 'react-i18next';

const buttonSx = {
  minHeight: 44,
  minWidth: 0,
  px: 1,
  textTransform: 'none',
  fontWeight: 700,
  whiteSpace: 'nowrap',
} as const;

export const SharePlayerActions: React.FC<{
  isCopied: boolean;
  showQr: boolean;
  onToggleQr: () => void;
  onCopy: () => void;
  onShare: () => void;
}> = ({ isCopied, showQr, onToggleQr, onCopy, onShare }) => {
  const { t } = useTranslation();
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(0, 1fr))',
        gap: 1,
      }}
    >
      <Button
        size="small"
        variant={showQr ? 'contained' : 'outlined'}
        onClick={onToggleQr}
        aria-expanded={showQr}
        aria-label={
          showQr
            ? t('common.hideQrCode', 'QR-Code ausblenden')
            : t('common.showQrCode', 'QR-Code anzeigen')
        }
        startIcon={<QrCodeRoundedIcon fontSize="small" />}
        sx={buttonSx}
      >
        {t('common.qrCode', 'QR-Code')}
      </Button>
      <Button
        size="small"
        variant="outlined"
        color={isCopied ? 'success' : 'primary'}
        onClick={onCopy}
        aria-label={t('common.copyLink', 'Link kopieren')}
        startIcon={
          isCopied ? (
            <CheckRoundedIcon fontSize="small" />
          ) : (
            <ContentCopyRoundedIcon fontSize="small" />
          )
        }
        sx={buttonSx}
      >
        <span aria-live="polite">
          {isCopied ? t('common.copied', 'Kopiert!') : t('common.copy', 'Kopieren')}
        </span>
      </Button>
      {canShare && (
        <Button
          size="small"
          variant="outlined"
          onClick={onShare}
          startIcon={<ShareRoundedIcon fontSize="small" />}
          sx={buttonSx}
        >
          {t('common.share', 'Teilen')}
        </Button>
      )}
    </Box>
  );
};
