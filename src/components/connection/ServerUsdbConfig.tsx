import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Typography,
  Paper,
  TextField,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { settingsCardSx } from '../../features/settings/settingsStyles';
import { UsdbMissingBanner } from './usdb/UsdbMissingBanner';
import { UsdbPasswordField } from './usdb/UsdbPasswordField';
import { useUsdbCredentials } from './usdb/useUsdbCredentials';

export interface ServerUsdbConfigProps {
  autoFocusUsdb?: boolean;
  onBackToGame?: () => void;
}

export const ServerUsdbConfig: React.FC<ServerUsdbConfigProps> = ({
  autoFocusUsdb,
  onBackToGame,
}) => {
  const { t } = useTranslation();
  const isMissingUsdbParam =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('missing_usdb') === '1';
  const showMissingBanner = autoFocusUsdb ?? isMissingUsdbParam;
  const {
    isServerActive,
    username,
    setUsername,
    password,
    setPassword,
    hasPassword,
    loading,
    testing,
    feedback,
    isConfigured,
    usernameInputRef,
    passwordInputRef,
    saveAndTest,
  } = useUsdbCredentials(showMissingBanner);

  if (!isServerActive) {
    return null;
  }

  return (
    <Paper sx={settingsCardSx}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.5,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">
              {t('server.usdb.title', 'UltraStar DB Credentials')}
            </Typography>
            <Chip
              icon={isConfigured ? <CheckCircleOutlineIcon /> : <HelpOutlineIcon />}
              label={
                isConfigured
                  ? t('server.usdb.status_configured', 'Configured')
                  : t('server.usdb.status_not_configured', 'Not Configured')
              }
              size="small"
              color={isConfigured ? 'success' : 'default'}
              variant="outlined"
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            {t(
              'server.usdb.desc',
              'Credentials for USDB (usdb.animux.de) for automated song downloading.',
            )}
          </Typography>
        </Box>
      </Box>

      {showMissingBanner && !isConfigured && <UsdbMissingBanner />}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            size="small"
            fullWidth
            inputRef={usernameInputRef}
            label={t('server.usdb.username', 'USDB Username')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="john_doe"
          />

          <UsdbPasswordField
            value={password}
            hasPassword={hasPassword}
            inputRef={passwordInputRef}
            onChange={setPassword}
          />

          {feedback && (
            <Alert severity={feedback.type} sx={{ mt: 1 }}>
              {feedback.text}
            </Alert>
          )}

          <Box
            sx={{
              display: 'flex',
              justifyContent: onBackToGame ? 'space-between' : 'flex-end',
              alignItems: 'center',
              mt: 1,
            }}
          >
            {onBackToGame && (
              <Button variant="outlined" onClick={onBackToGame} startIcon={<ArrowBackIcon />}>
                {t('server.usdb.back_to_game', 'Zurück zum Spiel')}
              </Button>
            )}
            <Button
              variant="contained"
              onClick={saveAndTest}
              disabled={!username.trim() || testing}
              startIcon={testing ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {testing
                ? t('server.usdb.testing', 'Verifying credentials with USDB...')
                : t('server.usdb.save_and_test', 'Save & Test Connection')}
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
};
