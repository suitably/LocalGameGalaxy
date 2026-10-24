import React from 'react';
import { Box, Button, CircularProgress, Paper, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded';
import RefreshIcon from '@mui/icons-material/RefreshRounded';
import { useTranslation } from 'react-i18next';
import type { ScanStatus } from './useServerAutoDetect';

interface SetupScanBannerProps {
  scanStatus: ScanStatus;
  songCount: number | null;
  onRescan: () => void;
  onConnect: () => void;
}

/** Live status of the localhost server scan with rescan / connect actions. */
export const SetupScanBanner: React.FC<SetupScanBannerProps> = ({
  scanStatus,
  songCount,
  onRescan,
  onConnect,
}) => {
  const { t } = useTranslation();
  const online = scanStatus === 'found' || scanStatus === 'connected';
  const notFound = t(
    'server.setup.autodetect.status_not_found',
    'No local server found. Start the server and click Connect.',
  );

  return (
    <Paper
      sx={{
        p: 1.5,
        mb: 2.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1.5,
        bgcolor: (theme) =>
          online ? alpha(theme.palette.success.main, 0.15) : theme.palette.action.hover,
        border: '1px solid',
        borderColor: online ? 'success.main' : 'divider',
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {scanStatus === 'checking' && <CircularProgress size={20} />}
        {online && <CheckCircleIcon color="success" />}
        <Typography variant="body2" sx={{ fontWeight: scanStatus === 'found' ? 'bold' : 'normal' }}>
          {scanStatus === 'checking' &&
            t(
              'server.setup.autodetect.status_checking',
              'Scanning for local server (localhost:3000)...',
            )}
          {online &&
            `${t('server.setup.autodetect.status_found', 'Local Server online & ready!')}${songCount !== null && songCount > 0 ? ` (${songCount} Songs)` : ''}`}
          {(scanStatus === 'not_found' || scanStatus === 'idle') && notFound}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={onRescan}
          disabled={scanStatus === 'checking'}
          sx={{ borderRadius: 999, textTransform: 'none' }}
        >
          {t('server.setup.autodetect.rescan', 'Scan Again')}
        </Button>

        {online && (
          <Button
            size="small"
            variant="contained"
            color="success"
            onClick={onConnect}
            sx={{ borderRadius: 999, textTransform: 'none', px: 2 }}
          >
            {scanStatus === 'connected'
              ? t('server.setup.autodetect.connected_btn', 'Successfully Connected')
              : t('server.setup.autodetect.connect_btn', 'Connect to Local Server Now')}
          </Button>
        )}
      </Box>
    </Paper>
  );
};
