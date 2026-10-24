import React from 'react';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopyRounded';
import CheckIcon from '@mui/icons-material/CheckRounded';
import DownloadIcon from '@mui/icons-material/DownloadRounded';
import LinkIcon from '@mui/icons-material/LinkRounded';
import { useTranslation } from 'react-i18next';
import { ComposeOptionsForm } from './compose/ComposeOptionsForm';
import { useComposeGenerator } from './compose/useComposeGenerator';

/** Docker setup: pick services, ports and folders, get the compose file, connect this device. */
export const SetupDockerTab: React.FC<{ token: string }> = ({ token }) => {
  const { t } = useTranslation();
  const state = useComposeGenerator(token);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('settings.compose_generator_desc')}
      </Typography>

      <ComposeOptionsForm state={state} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
        <Typography
          variant="caption"
          sx={{ fontFamily: 'monospace', color: 'text.secondary', flexGrow: 1 }}
        >
          docker-compose.yml
        </Typography>
        <Button
          size="small"
          variant={state.copied ? 'contained' : 'outlined'}
          color={state.copied ? 'success' : 'primary'}
          startIcon={state.copied ? <CheckIcon /> : <ContentCopyIcon />}
          onClick={state.copy}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {state.copied ? t('settings.compose_copied') : t('settings.compose_copy')}
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={state.download}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {t('settings.compose_download')}
        </Button>
      </Box>

      <TextField
        multiline
        fullWidth
        rows={14}
        value={state.yaml}
        slotProps={{
          input: {
            readOnly: true,
            sx: {
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontSize: '0.8rem',
              bgcolor: 'background.default',
              borderRadius: 2,
              '& textarea': { whiteSpace: 'pre', overflowX: 'auto' },
            },
          },
        }}
      />

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1.5 }}>
        {t('settings.compose_run_hint')}
      </Typography>
      <Box component="pre" sx={{ m: 0, mb: 2, fontFamily: 'monospace', fontSize: '0.8rem' }}>
        docker compose up -d
      </Box>

      {(state.companion || state.options.signaling) && (
        <Button
          variant="contained"
          startIcon={state.applied ? <CheckIcon /> : <LinkIcon />}
          color={state.applied ? 'success' : 'primary'}
          onClick={state.applyToThisDevice}
          sx={{ textTransform: 'none', borderRadius: 999, alignSelf: 'flex-start' }}
        >
          {t('settings.compose_apply')}
        </Button>
      )}
      {state.applied && (
        <Alert severity="success" sx={{ mt: 1.5 }}>
          {t('settings.compose_applied')}
        </Alert>
      )}
    </Box>
  );
};
