/**
 * A link with copy, share and QR code [ID: DRAWPOT-SHARE-LINK]
 */
import React, { useState } from 'react';
import { Box, Button, Card, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import QrCodeRoundedIcon from '@mui/icons-material/QrCodeRounded';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { useShareOrCopy } from '../../../modules/sharing';

interface ShareLinkCardProps {
  label: string;
  hint?: string;
  url: string;
  shareTitle: string;
  shareText: string;
  defaultQr?: boolean;
}

export const ShareLinkCard: React.FC<ShareLinkCardProps> = ({
  label,
  hint,
  url,
  shareTitle,
  shareText,
  defaultQr = false,
}) => {
  const { t } = useTranslation();
  const { copied, share } = useShareOrCopy();
  const [justCopied, setJustCopied] = useState(false);
  const [showQr, setShowQr] = useState(defaultQr);

  const copy = async () => {
    await navigator.clipboard?.writeText(url).catch(() => undefined);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 2000);
  };
  const done = copied || justCopied;

  return (
    <Card
      variant="outlined"
      sx={{ p: 2, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}
    >
      <Box>
        <Typography variant="subtitle2" fontWeight={700}>
          {label}
        </Typography>
        {hint && (
          <Typography variant="body2" color="text.secondary">
            {hint}
          </Typography>
        )}
      </Box>
      <TextField
        value={url}
        size="small"
        fullWidth
        slotProps={{
          htmlInput: { readOnly: true, 'aria-label': label },
          input: { sx: { fontFamily: 'monospace', fontSize: 13 } },
        }}
        onFocus={(e) => e.target.select()}
      />
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button
          size="small"
          variant="contained"
          startIcon={done ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />}
          color={done ? 'success' : 'primary'}
          onClick={copy}
        >
          {done ? t('common.copied') : t('common.copyLink')}
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ShareRoundedIcon />}
          onClick={() => share(shareTitle, `${shareText}\n${url}`)}
        >
          {t('drawpot.share.share')}
        </Button>
        <IconButton
          size="small"
          aria-label={t('drawpot.share.qr')}
          onClick={() => setShowQr((v) => !v)}
          color={showQr ? 'primary' : 'default'}
        >
          <QrCodeRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>
      {showQr && (
        <Box display="flex" justifyContent="center" py={1}>
          <Paper sx={{ p: 2, bgcolor: 'common.white', borderRadius: 2 }}>
            <QRCodeSVG value={url} size={180} />
          </Paper>
        </Box>
      )}
    </Card>
  );
};
