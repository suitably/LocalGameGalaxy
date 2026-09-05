import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import { useTranslation } from 'react-i18next';
import { storage } from '../../lib/storage';
import type { NotificationMethod } from '../../lib/push/pushTypes';
import { PushNotificationBanner } from './PushNotificationBanner';
import { NtfySettingsSection } from './NtfySettingsSection';
import { CloudflareWorkerGuideAccordion } from './CloudflareWorkerGuideAccordion';

type RelayStatus = 'idle' | 'checking' | 'connected' | 'error';

export const NotificationSettings: React.FC = () => {
  const { t } = useTranslation();
  const [relayUrl, setRelayUrl] = useState(() => storage.getPushRelayUrl());
  const [method, setMethod] = useState<NotificationMethod>(() => storage.getNotificationMethod());
  const [relayStatus, setRelayStatus] = useState<RelayStatus>('idle');
  const [relayStatusMsg, setRelayStatusMsg] = useState('');

  const handleMethodChange = useCallback((e: SelectChangeEvent<NotificationMethod>) => {
    const val = e.target.value as NotificationMethod;
    setMethod(val);
    storage.setNotificationMethod(val);
  }, []);

  const handleRelayUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRelayUrl(val);
    storage.setPushRelayUrl(val);
    setRelayStatus('idle');
  }, []);

  const testRelayConnection = useCallback(async () => {
    const cleanUrl = relayUrl.trim().replace(/\/$/, '');
    if (!cleanUrl) {
      setRelayStatus('error');
      setRelayStatusMsg(t('settings.relay_empty', 'Bitte eine Relay-URL eingeben.'));
      return;
    }

    setRelayStatus('checking');
    setRelayStatusMsg(t('settings.relay_checking', 'Verbinde...'));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const primaryUrl = cleanUrl.includes('/api/push')
        ? `${cleanUrl}/vapid-public-key`
        : `${cleanUrl}/api/push/vapid-public-key`;

      let res = await fetch(primaryUrl, { signal: controller.signal }).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`${cleanUrl}/vapid-public-key`, { signal: controller.signal }).catch(() => null);
      }
      clearTimeout(timeoutId);

      if (res && res.ok) {
        const data = await res.json();
        if (data.publicKey) {
          setRelayStatus('connected');
          setRelayStatusMsg(t('settings.relay_connected', 'Verbunden! Push-Relay aktiv.'));
          storage.setPushRelayUrl(cleanUrl);
        } else {
          setRelayStatus('error');
          setRelayStatusMsg(
            t('settings.relay_no_vapid', 'Server erreichbar, aber kein VAPID-Key konfiguriert.'),
          );
        }
      } else if (res) {
        setRelayStatus('error');
        setRelayStatusMsg(
          t('settings.relay_http_error', 'HTTP-Fehler: {{status}}', { status: res.status }),
        );
      } else {
        setRelayStatus('error');
        setRelayStatusMsg(t('settings.relay_failed', 'Verbindung fehlgeschlagen. URL prüfen.'));
      }
    } catch {
      setRelayStatus('error');
      setRelayStatusMsg(t('settings.relay_failed', 'Verbindung fehlgeschlagen. URL prüfen.'));
    }
  }, [relayUrl, t]);

  const helperUrl = storage.getHelperUrl();
  const canUseServer = storage.isHelperActive() && Boolean(helperUrl);

  const handleUseConnectedServer = useCallback(() => {
    const sUrl = storage.getHelperUrl().trim().replace(/\/$/, '');
    const full = sUrl.includes('/api/push') ? sUrl : `${sUrl}/api/push`;
    setRelayUrl(full);
    storage.setPushRelayUrl(full);
    setRelayStatus('idle');
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
        {t(
          'settings.notifications_desc',
          'Push-Benachrichtigungen informieren dich, wenn du in einem Spiel (z.B. GuessArt, Geschichtenschreiber) an der Reihe bist.',
        )}
      </Typography>

      {/* Notification Method Selector */}
      <FormControl size="small" fullWidth>
        <InputLabel id="notif-method-label">
          {t('settings.method_label', 'Bevorzugter Benachrichtigungs-Kanal')}
        </InputLabel>
        <Select
          labelId="notif-method-label"
          value={method}
          label={t('settings.method_label', 'Bevorzugter Benachrichtigungs-Kanal')}
          onChange={handleMethodChange}
        >
          <MenuItem value="auto">
            {t('settings.method_auto', '🟢 Automatisch (Web-Push mit ntfy Fallback)')}
          </MenuItem>
          <MenuItem value="ntfy">
            {t('settings.method_ntfy', '🛡️ Google-frei via ntfy')}
          </MenuItem>
          <MenuItem value="webpush">
            {t('settings.method_webpush', '🌐 Nur Browser-Push (Chrome / Firefox / Safari)')}
          </MenuItem>
          <MenuItem value="both">
            {t('settings.method_both', '⚡ Beide Kanäle parallel (Maximale Zuverlässigkeit)')}
          </MenuItem>
        </Select>
      </FormControl>

      {/* Browser permission banner */}
      <PushNotificationBanner />

      {/* Google-free ntfy section */}
      <NtfySettingsSection />

      {/* Push Relay URL section */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            {t('settings.relay_title', 'Push-Relay Server (Cloudflare Worker)')}
          </Typography>
          {canUseServer && (
            <Button
              variant="text"
              size="small"
              onClick={handleUseConnectedServer}
              sx={{ textTransform: 'none', fontWeight: 600, py: 0 }}
            >
              {t('settings.relay_use_server', 'Verbundenen Server übernehmen (1-Klick)')}
            </Button>
          )}
        </Box>
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.55)' }}>
          {t(
            'settings.relay_desc',
            'URL deines Cloudflare Workers, der Benachrichtigungen an Mitspieler weiterleitet. Unterstützt automatisch Web-Push und ntfy.',
          )}
        </Typography>
        <TextField
          size="small"
          fullWidth
          value={relayUrl}
          onChange={handleRelayUrlChange}
          placeholder="https://galaxy-push-relay.dein-name.workers.dev"
          label={t('settings.relay_url_label', 'Push-Relay URL')}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            onClick={testRelayConnection}
            disabled={relayStatus === 'checking' || !relayUrl.trim()}
            startIcon={<SyncRoundedIcon />}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {t('settings.relay_test', 'Verbindung testen')}
          </Button>
          {relayStatus === 'connected' && (
            <Chip
              icon={<CheckCircleRoundedIcon />}
              label={relayStatusMsg}
              color="success"
              size="small"
              variant="outlined"
            />
          )}
          {relayStatus === 'error' && (
            <Chip
              icon={<ErrorRoundedIcon />}
              label={relayStatusMsg}
              color="error"
              size="small"
              variant="outlined"
            />
          )}
          {relayStatus === 'checking' && (
            <Typography variant="body2" color="text.secondary">
              {relayStatusMsg}
            </Typography>
          )}
        </Box>

        {/* Cloudflare Worker Deployment Guide */}
        <CloudflareWorkerGuideAccordion />
      </Box>
    </Box>
  );
};
