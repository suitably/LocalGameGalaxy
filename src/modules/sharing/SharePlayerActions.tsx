/**
 * QR code, copy and share buttons for one player's link [ID: MOD-SHARING-PLAYER-ACTIONS]
 */
import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import QrCodeRoundedIcon from '@mui/icons-material/QrCodeRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import { useTranslation } from 'react-i18next';

export const SharePlayerActions: React.FC<{
  isCopied: boolean;
  showQr: boolean;
  onToggleQr: () => void;
  onCopy: () => void;
  onShare: () => void;
}> = ({ isCopied, showQr, onToggleQr, onCopy, onShare }) => {
  const { t } = useTranslation();
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;
  const button = (
    label: string,
    onClick: () => void,
    icon: React.ReactNode,
    color: 'default' | 'primary' | 'success',
  ) => (
    <Tooltip title={label}>
      <IconButton
        size="small"
        color={color}
        onClick={onClick}
        aria-label={label}
        sx={{ bgcolor: 'action.hover' }}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );
  return (
    <Box display="flex" alignItems="center" gap={0.5}>
      {button(
        t('common.showQrCode', 'QR-Code anzeigen'),
        onToggleQr,
        <QrCodeRoundedIcon fontSize="small" />,
        showQr ? 'primary' : 'default',
      )}
      {button(
        isCopied ? t('common.copied', 'Kopiert!') : t('common.copyLink', 'Link kopieren'),
        onCopy,
        isCopied ? (
          <CheckRoundedIcon fontSize="small" />
        ) : (
          <ContentCopyRoundedIcon fontSize="small" />
        ),
        isCopied ? 'success' : 'primary',
      )}
      {canShare &&
        button(
          t('common.share', 'Teilen'),
          onShare,
          <ShareRoundedIcon fontSize="small" />,
          'primary',
        )}
    </Box>
  );
};
