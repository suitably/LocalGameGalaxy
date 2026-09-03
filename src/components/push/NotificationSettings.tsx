import React, { useState, useCallback } from 'react';
import {
    Box, Button, Chip, TextField, Typography,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import { useTranslation } from 'react-i18next';
import { storage } from '../../lib/storage';
import { PushNotificationBanner } from './PushNotificationBanner';

type RelayStatus = 'idle' | 'checking' | 'connected' | 'error';

/**
 * Notifications settings section for configuring push notifications
 * for async games (GuessArt, etc.).
 *
 * Includes:
 * - Browser notification permission banner (one-click)
 * - Push relay URL field with connection test
 */
export const NotificationSettings: React.FC = () => {
    const { t } = useTranslation();
    const [relayUrl, setRelayUrl] = useState(() => storage.getPushRelayUrl());
    const [relayStatus, setRelayStatus] = useState<RelayStatus>('idle');
    const [relayStatusMsg, setRelayStatusMsg] = useState('');

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
                // Fallback to root /vapid-public-key (e.g. standalone Cloudflare Worker)
                res = await fetch(`${cleanUrl}/vapid-public-key`, { signal: controller.signal }).catch(() => null);
            }
            clearTimeout(timeoutId);

            if (res && res.ok) {
                const data = await res.json();
                if (data.publicKey) {
                    setRelayStatus('connected');
                    setRelayStatusMsg(t('settings.relay_connected', 'Verbunden! Push-Relay aktiv.'));
                    // Persist the validated URL
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
                setRelayStatusMsg(
                    t('settings.relay_failed', 'Verbindung fehlgeschlagen. URL prüfen.'),
                );
            }
        } catch {
            setRelayStatus('error');
            setRelayStatusMsg(
                t('settings.relay_failed', 'Verbindung fehlgeschlagen. URL prüfen.'),
            );
        }
    }, [relayUrl, t]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                {t(
                    'settings.notifications_desc',
                    'Push-Benachrichtigungen informieren dich, wenn du in einem Spiel (z.B. GuessArt) an der Reihe bist – auch wenn die App geschlossen ist.',
                )}
            </Typography>

            {/* Browser permission banner */}
            <PushNotificationBanner />

            {/* Push Relay URL */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                    {t('settings.relay_title', 'Push-Relay Server')}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.55)' }}>
                    {t(
                        'settings.relay_desc',
                        'URL deines Cloudflare Workers oder Nexumia Servers, der Push-Nachrichten an Mitspieler weiterleitet. Wird automatisch in geteilte Spiellinks eingebettet.',
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
            </Box>
        </Box>
    );
};
