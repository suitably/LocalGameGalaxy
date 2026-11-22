import React from 'react';
import { Box, Button, Typography, TextField, Paper, Container, Divider } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { RemotePeerBase } from '../../lib/webrtc';
import { useDeviceConnectionSettings } from './useDeviceConnectionSettings';
import { DeviceQRCodeCard } from './DeviceQRCodeCard';
import { ConnectedPeersList } from './ConnectedPeersList';
import { DeviceTrackerSettings } from './DeviceTrackerSettings';
import { StunServerSettings } from './StunServerSettings';
import type { DeviceConnectionProps } from './types';

export * from './types';

/**
 * QR code, connected peers and connection details for phone controllers. It renders no own top
 * bar: the host screen sets the page title (usePageTitle / setHeader) and the GlobalHeader back
 * arrow (setHomeAction) leaves the screen.
 */
export const DeviceConnection = <T extends RemotePeerBase = RemotePeerBase>({
  description,
  gameId,
  clientPath,
  webrtcData,
  renderPeerExtra,
  extraOptions,
  helperStorageKey,
  helperTokenKey,
}: DeviceConnectionProps<T>): React.ReactElement => {
  const { t } = useTranslation();
  const displayDescription = description ?? t('connection.default_description');

  const {
    peers,
    partyId,
    regeneratePartyId,
    trackerUrls,
    activeTrackerUrls = [],
    allTrackers,
    toggleTrackerActive,
    addTrackerUrl,
    removeTrackerUrl,
    restoreDefaultTrackers,
  } = webrtcData;

  const { baseUrl, setBaseUrl, connectionUrl, qrCodeDataUrl, handleScanSuccess } =
    useDeviceConnectionSettings({
      gameId,
      clientPath,
      partyId,
      activeTrackerUrls,
      helperStorageKey,
      helperTokenKey,
    });

  return (
    <Container maxWidth="md" sx={{ mt: { xs: 2, sm: 4 }, mb: 4 }}>
      <Paper sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Typography variant="body1" color="text.secondary">
          {displayDescription}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <DeviceQRCodeCard qrCodeDataUrl={qrCodeDataUrl} onScanSuccess={handleScanSuccess} />
          <ConnectedPeersList peers={peers} renderPeerExtra={renderPeerExtra} />
          {extraOptions}
        </Box>

        <Divider />

        <Box>
          <Typography variant="h6" gutterBottom>
            {t('connection.details_title')}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t('connection.host_base_url')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {t('connection.host_base_url_desc')}
              </Typography>
              <TextField
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                size="small"
                fullWidth
                variant="outlined"
                placeholder="http://192.168.1.X:3000"
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t('connection.party_id')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  value={partyId}
                  size="small"
                  fullWidth
                  variant="outlined"
                  InputProps={{ readOnly: true }}
                  sx={{ fontFamily: 'monospace' }}
                />
                <Button variant="outlined" onClick={regeneratePartyId} sx={{ borderRadius: 999 }}>
                  {t('connection.regenerate')}
                </Button>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t('connection.manual_url')}
              </Typography>
              <TextField
                value={connectionUrl}
                size="small"
                fullWidth
                variant="outlined"
                InputProps={{ readOnly: true }}
                onClick={(e) => {
                  const input = e.target as HTMLInputElement;
                  input.select();
                  navigator.clipboard.writeText(input.value);
                }}
                sx={{ cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.85rem' }}
                helperText={t('connection.click_to_copy')}
              />
            </Box>

            <DeviceTrackerSettings
              allTrackers={allTrackers}
              activeTrackerUrls={activeTrackerUrls}
              trackerUrls={trackerUrls}
              toggleTrackerActive={toggleTrackerActive}
              addTrackerUrl={addTrackerUrl}
              removeTrackerUrl={removeTrackerUrl}
              restoreDefaultTrackers={restoreDefaultTrackers}
            />
            <Box sx={{ mt: 3 }}>
              <StunServerSettings />
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};
