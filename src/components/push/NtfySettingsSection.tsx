import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import { useTranslation } from 'react-i18next';
import { storage } from '../../lib/storage';
import { pushClient } from '../../lib/push/pushClient';

export const NtfySettingsSection: React.FC = () => {
  const { t } = useTranslation();
  const [serverUrl, setServerUrl] = useState(() => storage.getNtfyServerUrl());
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');

  const handleServerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setServerUrl(val);
    storage.setNtfyServerUrl(val);
    setTestStatus('idle');
  }, []);

  const handleTestNtfy = useCallback(async () => {
    setTestStatus('testing');
    setTestMsg(t('settings.ntfy_testing', 'Sende Test-Push via ntfy...'));

    const testTopic = 'lgg-device-test';
    const success = await pushClient.sendDirectNtfyNotification({
      gameId: 'test',
      ntfyTopic: testTopic,
      title: t('settings.ntfy_test_title', 'LocalGameGalaxy: ntfy Test!'),
      body: t(
        'settings.ntfy_test_body',
        '🎉 Test erfolgreich! 100% Google-freie Benachrichtigungen funktionieren.',
      ),
      url: window.location.href,
    });

    if (success) {
      setTestStatus('success');
      setTestMsg(t('settings.ntfy_test_success', 'Gesendet! Prüfe deine ntfy-App.'));
    } else {
      setTestStatus('error');
      setTestMsg(t('settings.ntfy_test_error', 'Fehler beim Senden an ntfy. Server prüfen.'));
    }
  }, [t]);

  const testTopicUrl = `${serverUrl.replace(/\/$/, '')}/lgg-device-test`;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ShieldRoundedIcon color="success" fontSize="small" />
        <Typography variant="subtitle2" fontWeight={700}>
          {t('settings.ntfy_title', 'Google-freie Benachrichtigungen (ntfy)')}
        </Typography>
      </Box>

      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.65)' }}>
        {t(
          'settings.ntfy_desc',
          'Speziell für Murena /e/OS, Fairphone, GrapheneOS und F-Droid-Nutzer: 100% Open-Source Push ohne Google Play Services oder FCM.',
        )}
      </Typography>

      <TextField
        size="small"
        fullWidth
        value={serverUrl}
        onChange={handleServerChange}
        placeholder="https://ntfy.sh"
        label={t('settings.ntfy_server_label', 'ntfy Server URL')}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          size="small"
          onClick={handleTestNtfy}
          disabled={testStatus === 'testing' || !serverUrl.trim()}
          startIcon={<SendRoundedIcon />}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {t('settings.ntfy_test_btn', 'Test an ntfy senden')}
        </Button>

        <Tooltip title={t('settings.ntfy_open_test_topic', 'Test-Topic in ntfy öffnen/abonnieren')}>
          <IconButton
            size="small"
            component="a"
            href={testTopicUrl}
            target="_blank"
            rel="noopener noreferrer"
            color="primary"
          >
            <OpenInNewRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {testStatus === 'success' && (
          <Chip
            icon={<CheckCircleRoundedIcon />}
            label={testMsg}
            color="success"
            size="small"
            variant="outlined"
          />
        )}
        {testStatus === 'error' && (
          <Chip
            icon={<ErrorRoundedIcon />}
            label={testMsg}
            color="error"
            size="small"
            variant="outlined"
          />
        )}
        {testStatus === 'testing' && (
          <Typography variant="body2" color="text.secondary">
            {testMsg}
          </Typography>
        )}
      </Box>
    </Box>
  );
};
