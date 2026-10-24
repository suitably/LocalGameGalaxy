import React from 'react';
import { Alert, Box, Paper, Typography, Button, TextField } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopyRounded';
import CheckIcon from '@mui/icons-material/CheckRounded';
import DownloadIcon from '@mui/icons-material/DownloadRounded';
import LinkIcon from '@mui/icons-material/LinkRounded';
import StorageIcon from '@mui/icons-material/StorageRounded';
import { useTranslation } from 'react-i18next';
import { settingsCardSx } from '../../settingsStyles';
import { ComposeOptionsForm } from './ComposeOptionsForm';
import { useComposeGenerator } from './useComposeGenerator';

export const ComposeGeneratorPanel: React.FC = () => {
  const { t } = useTranslation();
  const state = useComposeGenerator();

  return (
    <Paper id="settings-section-compose" sx={settingsCardSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <StorageIcon color="primary" sx={{ fontSize: 28 }} />
        <Box>
          <Typography variant="h6" fontWeight={700}>
            {t('settings.compose_generator_title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('settings.compose_generator_desc')}
          </Typography>
        </Box>
      </Box>

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
          sx={{ textTransform: 'none', borderRadius: 999 }}
        >
          {t('settings.compose_apply')}
        </Button>
      )}
      {state.applied && (
        <Alert severity="success" sx={{ mt: 1.5 }}>
          {state.options.token
            ? t('settings.compose_applied')
            : t('settings.compose_applied_no_token')}
        </Alert>
      )}
    </Paper>
  );
};
