/**
 * Optional TURN relay for this device (#652). Off until a URL is saved.
 */
import React, { useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { isValidTurnUrl, loadTurnServer, saveTurnServer } from '../../lib/webrtc/iceServers';

export const TurnServerSettings: React.FC = () => {
  const { t } = useTranslation();
  const [saved, setSaved] = useState(loadTurnServer);
  const [url, setUrl] = useState(saved?.url ?? '');
  const [username, setUsername] = useState(saved?.username ?? '');
  const [credential, setCredential] = useState(saved?.credential ?? '');
  const invalid = url.trim() !== '' && !isValidTurnUrl(url);

  const save = () => {
    const next = { url: url.trim(), username, credential };
    saveTurnServer(next);
    setSaved(next);
  };
  const clear = () => {
    saveTurnServer(null);
    setSaved(null);
    setUrl('');
    setUsername('');
    setCredential('');
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {t('turn.title')}
      </Typography>
      <Stack spacing={1}>
        <TextField
          size="small"
          label={t('turn.url')}
          placeholder="turn:turn.example.com:3478"
          value={url}
          error={invalid}
          helperText={invalid ? t('turn.invalid_url') : undefined}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField
            size="small"
            fullWidth
            label={t('turn.username')}
            value={username}
            autoComplete="off"
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            size="small"
            fullWidth
            type="password"
            label={t('turn.credential')}
            value={credential}
            autoComplete="new-password"
            onChange={(e) => setCredential(e.target.value)}
          />
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" size="small" disabled={!url.trim() || invalid} onClick={save}>
            {t('turn.save')}
          </Button>
          <Button size="small" disabled={!saved} onClick={clear}>
            {t('turn.clear')}
          </Button>
        </Stack>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        {t('turn.hint')}
      </Typography>
    </Box>
  );
};
