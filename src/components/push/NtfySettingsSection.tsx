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
    setTestMsg(t('settings.ntfy_testing'));

    const effectiveTopic = userTopic.trim() || storage.getUserNtfyTopic();
    const success = await pushClient.sendDirectNtfyNotification({
      gameId: 'test',
      ntfyTopic: effectiveTopic,
      title: t('settings.ntfy_test_title'),
      body: t('settings.ntfy_test_body'),
      url: window.location.href,
    });

    if (success) {
      setTestStatus('success');
      setTestMsg(t('settings.ntfy_test_success'));
    } else {
      setTestStatus('error');
      setTestMsg(t('settings.ntfy_test_error'));
    }
  }, [t, userTopic]);

  const topicUrl = `${serverUrl.replace(/\/$/, '')}/${encodeURIComponent(userTopic.trim() || 'device')}`;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ShieldRoundedIcon color="success" fontSize="small" />
        <Typography variant="subtitle2" fontWeight={700}>
          {t('settings.ntfy_title')}
        </Typography>
      </Box>

      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('settings.ntfy_desc')}
      </Typography>

      <TextField
        size="small"
        fullWidth
        value={serverUrl}
        onChange={handleServerChange}
        placeholder="https://ntfy.sh"
        label={t('settings.ntfy_server_label')}
      />

      <TextField
        size="small"
        fullWidth
        value={userTopic}
        onChange={handleTopicChange}
        placeholder="lgg-user-..."
        label={t('settings.ntfy_topic_label')}
        helperText={t('settings.ntfy_topic_helper')}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title={t('settings.ntfy_regenerate_topic')}>
                <IconButton
                  size="small"
                  onClick={handleRegenerateTopic}
                  edge="end"
                  sx={{ mr: 0.5 }}
                >
                  <RefreshRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip
                title={copied ? t('settings.ntfy_topic_copied') : t('settings.ntfy_copy_topic')}
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
          {t('settings.ntfy_test_btn')}
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
          {t('settings.ntfy_subscribe_btn')}
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
