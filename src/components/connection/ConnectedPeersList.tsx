import React from 'react';
import { alpha, Box, Typography, Chip, Avatar } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { RemotePeerBase } from '../../lib/webrtc';

export interface ConnectedPeersListProps<T extends RemotePeerBase = RemotePeerBase> {
  peers: T[];
  renderPeerExtra?: (peer: T) => React.ReactNode;
}

export const ConnectedPeersList = <T extends RemotePeerBase = RemotePeerBase>({
  peers,
  renderPeerExtra,
}: ConnectedPeersListProps<T>): React.ReactElement => {
  const { t } = useTranslation();

  if (peers.length === 0) {
    return (
      <Typography variant="body2" color="text.disabled">
        {t('connection.waiting_for_connections', 'Waiting for connections...')}
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        p: 2,
        bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
        border: (theme) => `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
        borderRadius: 2,
        width: '100%',
        maxWidth: 500,
      }}
    >
      <Typography
        variant="subtitle1"
        sx={{ color: 'success.main', display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
      >
        {t('connection.devices_connected', '✅ {{count}} Device(s) Connected', {
          count: peers.length,
        })}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', flexDirection: 'column' }}>
        {peers.map((peer) => (
          <Box key={peer.peerId} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              avatar={
                <Avatar sx={{ bgcolor: peer.hue ? `hsl(${peer.hue}, 100%, 50%)` : undefined }}>
                  {peer.name ? peer.name[0] : '?'}
                </Avatar>
              }
              label={peer.name}
              sx={{
                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.1),
                color: 'text.primary',
              }}
            />
            {renderPeerExtra && renderPeerExtra(peer)}
          </Box>
        ))}
      </Box>
    </Box>
  );
};
