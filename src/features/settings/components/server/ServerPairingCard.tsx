import React from 'react';
import { Alert, Box, Button, Paper, Typography } from '@mui/material';
import LinkIcon from '@mui/icons-material/LinkRounded';
import OpenInNewIcon from '@mui/icons-material/OpenInNewRounded';
import { useTranslation } from 'react-i18next';
import { settingsCardSx } from '../../settingsStyles';
import { isMixedContentBlocked } from '../../../../lib/companion/serverPairing';
import { useServerPairing } from './useServerPairing';

const pillSx = { borderRadius: 999, textTransform: 'none' } as const;

/** Shown when Settings → Server is opened via the server's one-time pairing link. */
export const ServerPairingCard: React.FC = () => {
  const { t } = useTranslation();
  const { request, state, pair, dismiss } = useServerPairing();
  if (!request) return null;

  const url = request.serverUrl;
  const result = state.phase === 'done' ? state.result : null;
  const paired = result?.status === 'paired';
  const mixedContent = isMixedContentBlocked(url, window.location.protocol);

  return (
    <Paper id="settings-section-pairing" sx={settingsCardSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <LinkIcon color="primary" sx={{ fontSize: 28 }} />
        <Typography variant="h6" fontWeight={700}>
          {t('server.pairing.title')}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, wordBreak: 'break-all' }}>
        {t('server.pairing.desc', { url })}
      </Typography>

      {result && (
        <Alert
          severity={paired ? 'success' : result.status === 'rate_limited' ? 'warning' : 'error'}
          sx={{ mb: 2 }}
        >
          {result.status === 'unreachable'
            ? t('server.pairing.unreachable', { url })
            : t(`server.pairing.${result.status}`)}
          {result.status === 'unreachable' && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {t(mixedContent ? 'server.pairing.mixed_content' : 'server.pairing.https_hint')}
            </Typography>
          )}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        {!paired && (
          <Button
            variant="contained"
            onClick={pair}
            disabled={state.phase === 'pairing'}
            sx={pillSx}
          >
            {state.phase === 'pairing'
              ? t('server.pairing.connecting')
              : t(result ? 'server.pairing.retry' : 'server.pairing.connect')}
          </Button>
        )}
        {result?.status === 'unreachable' && !mixedContent && (
          <Button
            variant="outlined"
            startIcon={<OpenInNewIcon />}
            href={`${url}/health`}
            target="_blank"
            rel="noopener noreferrer"
            sx={pillSx}
          >
            {t('server.pairing.open_server')}
          </Button>
        )}
        <Button variant="text" onClick={dismiss} sx={pillSx}>
          {t('server.pairing.dismiss')}
        </Button>
      </Box>
    </Paper>
  );
};
