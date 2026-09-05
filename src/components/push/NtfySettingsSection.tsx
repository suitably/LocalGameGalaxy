import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import { useTranslation } from 'react-i18next';
import { storage } from '../../lib/storage';
import { pushClient } from '../../lib/push/pushClient';

export const NtfySettingsSection: React.FC = () => {
  const { t } = useTranslation();
  const [serverUrl, setServerUrl] = useState(() => storage.getNtfyServerUrl());
  const [userTopic, setUserTopic] = useState(() => storage.getUserNtfyTopic());
  const [copied, setCopied] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');

  const handleServerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setServerUrl(val);
    storage.setNtfyServerUrl(val);
    setTestStatus('idle');
  }, []);

  const handleTopicChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserTopic(val);
    storage.setUserNtfyTopic(val);
    setTestStatus('idle');
  }, []);

  const handleRegenerateTopic = useCallback(() => {
    const newTopic = storage.regenerateUserNtfyTopic();
    setUserTopic(newTopic);
    setTestStatus('idle');
  }, []);

  const handleCopyTopic = useCallback(() => {
    if (userTopic) {
      navigator.clipboard.writeText(userTopic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [userTopic]);

  const handleTestNtfy = useCallback(async () => {
    setTestStatus('testing');
    setTestMsg(t('settings.ntfy_testing', 'Sende Test-Push via ntfy...'));

    const effectiveTopic = userTopic.trim() || storage.getUserNtfyTopic();
    const success = await pushClient.sendDirectNtfyNotification({
      gameId: 'test',
      ntfyTopic: effectiveTopic,
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
  }, [t, userTopic]);

  const topicUrl = `${serverUrl.replace(/\/$/, '')}/${encodeURIComponent(userTopic.trim() || 'device')}`;

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
          '100% Open-Source Push ohne Google Play Services oder FCM.',
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

      <TextField
        size="small"
        fullWidth
        value={userTopic}
        onChange={handleTopicChange}
        placeholder="lgg-user-..."
        label={t('settings.ntfy_topic_label', 'Persönliches ntfy Topic (für dieses Gerät)')}
        helperText={t(
          'settings.ntfy_topic_helper',
          'Einmaliges, unerratbares Topic für dieses Gerät. Alle deine Spiele senden Züge automatisch an dieses Topic.',
        )}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title={t('settings.ntfy_regenerate_topic', 'Neues Topic generieren')}>
                <IconButton size="small" onClick={handleRegenerateTopic} edge="end" sx={{ mr: 0.5 }}>
                  <RefreshRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip
                title={
                  copied
                    ? t('settings.ntfy_topic_copied', 'Topic kopiert!')
                    : t('settings.ntfy_copy_topic', 'Topic kopieren')
                }
              >
                <IconButton size="small" onClick={handleCopyTopic} edge="end">
                  {copied ? (
                    <CheckRoundedIcon fontSize="small" color="success" />
                  ) : (
                    <ContentCopyRoundedIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        }}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          size="small"
          onClick={handleTestNtfy}
          disabled={testStatus === 'testing' || !serverUrl.trim() || !userTopic.trim()}
          startIcon={<SendRoundedIcon />}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {t('settings.ntfy_test_btn', 'Test an ntfy senden')}
        </Button>

        <Button
          variant="outlined"
          size="small"
          component="a"
          href={topicUrl}
          target="_blank"
          rel="noopener noreferrer"
          disabled={!serverUrl.trim() || !userTopic.trim()}
          startIcon={<OpenInNewRoundedIcon />}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {t('settings.ntfy_subscribe_btn', 'In ntfy abonnieren')}
        </Button>

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
