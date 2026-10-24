import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  IconButton,
  InputAdornment,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorIcon from '@mui/icons-material/ErrorRounded';
import ContentCopyIcon from '@mui/icons-material/ContentCopyRounded';
import VisibilityIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffRounded';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHighRounded';
import { ServerSetupDialog } from './setup/ServerSetupDialog';
import { useServerConnectionState } from './hooks/useServerConnectionState';
import { settingsCardSx } from '../../features/settings/settingsStyles';

/**
 * ServerConnection [ID: COMP-SERVER-CONN]
 *
 * Shared component for configuring the connection to a Nexumia Server.
 * Previously embedded in the Melodiq settings as "HelperConnection", now
 * generalized and moved to shared components since the server is used by
 * multiple games (Melodiq songs, GuessArt catalogue publishing, feedback, etc.).
 */

export const ServerConnection: React.FC = () => {
  const { t } = useTranslation();
  const {
    url,
    token,
    setToken,
    enabled,
    setEnabled,
    showToken,
    setShowToken,
    setupDialogOpen,
    setSetupDialogOpen,
    status,
    statusMsg,
    handleUrlChange,
    checkConnection,
    copyConnectionUrl,
  } = useServerConnectionState();

  return (
    <Paper sx={settingsCardSx}>
      <Typography variant="h6" gutterBottom>
        {t('server.title', 'Melodiq Companion Server Verbindung')}
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        {t(
          'server.desc',
          'Verbinde dich mit dem Melodiq Companion Server, um auf deine Song-Bibliothek zuzugreifen, Audio zu streamen, Songs herunterzuladen und KI-Gesangstrennung zu nutzen.',
        )}
      </Typography>

      <FormControlLabel
        control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />}
        label={t('server.enable', 'Server-Verbindung aktivieren')}
      />

      {enabled && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            label={t('server.url', 'Server URL')}
            variant="outlined"
            fullWidth
            value={url}
            onChange={handleUrlChange}
            placeholder="http://192.168.1.50:3000"
            size="small"
          />
          <TextField
            label={t('server.token', 'Security Token')}
            variant="outlined"
            fullWidth
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={t('server.token_placeholder', 'Copy from Server Console/Screen')}
            size="small"
            type={showToken ? 'text' : 'password'}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowToken((v) => !v)} edge="end" size="small">
                      {showToken ? (
                        <VisibilityOffIcon fontSize="small" />
                      ) : (
                        <VisibilityIcon fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <Box
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Button
              variant="contained"
              onClick={checkConnection}
              disabled={status === 'checking'}
              sx={{ borderRadius: 50, px: 3, py: 1 }}
            >
              {t('server.test', 'Test Connection')}
            </Button>

            <Button
              variant="outlined"
              color="primary"
              startIcon={<AutoFixHighIcon />}
              onClick={() => setSetupDialogOpen(true)}
              sx={{ borderRadius: 50, px: 2.5 }}
            >
              {t('server.setup_button', 'Server einrichten oder anpassen')}
            </Button>

            {token && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<ContentCopyIcon />}
                onClick={copyConnectionUrl}
                sx={{ borderRadius: 50 }}
              >
                {t('server.copy_link', 'Copy Connection Link')}
              </Button>
            )}

            {status === 'success' && (
              <Typography
                color="success.main"
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <CheckCircleIcon fontSize="small" /> {statusMsg}
              </Typography>
            )}

            {status === 'error' && (
              <Typography color="error.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ErrorIcon fontSize="small" /> {statusMsg}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      <ServerSetupDialog open={setupDialogOpen} onClose={() => setSetupDialogOpen(false)} />
    </Paper>
  );
};
