import React, { useState, useCallback } from 'react';
import {
    Accordion, AccordionSummary, AccordionDetails,
    Box, Button, Chip, TextField, Typography,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloudQueueRoundedIcon from '@mui/icons-material/CloudQueueRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
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

    const helperUrl = storage.getHelperUrl();
    const canUseServer = storage.isHelperActive() && !!helperUrl;
    const [copiedCommands, setCopiedCommands] = useState(false);

    const handleUseConnectedServer = useCallback(() => {
        const sUrl = storage.getHelperUrl().trim().replace(/\/$/, '');
        const full = sUrl.includes('/api/push') ? sUrl : `${sUrl}/api/push`;
        setRelayUrl(full);
        storage.setPushRelayUrl(full);
        setRelayStatus('idle');
    }, []);

    const workerDeployCommands = `# 1. In den Worker-Ordner wechseln
cd server/cloudflare-push-relay

# 2. VAPID-Schlüssel generieren
npx web-push generate-vapid-keys

# 3. Secrets bei Cloudflare hinterlegen
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY

# 4. Deployen
npx wrangler deploy`;

    const handleCopyCommands = useCallback(() => {
        navigator.clipboard.writeText(workerDeployCommands);
        setCopiedCommands(true);
        setTimeout(() => setCopiedCommands(false), 2500);
    }, [workerDeployCommands]);

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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                        {t('settings.relay_title', 'Push-Relay Server')}
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

                {/* Cloudflare Worker Setup Accordion */}
                <Box sx={{ mt: 1 }}>
                    <Accordion
                        variant="outlined"
                        sx={{
                            bgcolor: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: 2,
                            '&:before': { display: 'none' },
                        }}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CloudQueueRoundedIcon color="primary" fontSize="small" />
                                <Typography variant="body2" fontWeight={600}>
                                    {t(
                                        'settings.relay_worker_guide_title',
                                        'Eigenen Cloudflare Worker aufsetzen (24/7 kostenlos)',
                                    )}
                                </Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                {t(
                                    'settings.relay_worker_guide_desc',
                                    'Der Cloudflare Worker läuft rund um die Uhr kostenlos in der Cloud und erzeugt seine kryptografischen Schlüssel beim ersten Start automatisch (Zero-Config).',
                                )}
                            </Typography>

                            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    size="small"
                                    href="https://deploy.workers.cloudflare.com/?url=https://github.com/suitably/LocalGameGalaxy/tree/main/server/cloudflare-push-relay"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    startIcon={<LaunchRoundedIcon />}
                                    sx={{ textTransform: 'none', fontWeight: 700 }}
                                >
                                    {t('settings.relay_1click_deploy', '1-Klick Deploy auf Cloudflare')}
                                </Button>
                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                    {t('settings.relay_1click_deploy_note', 'Erfordert ein Cloudflare- und ein GitHub-Konto (Cloudflare forkt das Repository in dein GitHub-Profil).')}
                                </Typography>
                            </Box>

                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.85rem' }}>
                                {t('settings.relay_dashboard_note', 'Ohne GitHub: Du kannst auf dash.cloudflare.com einfach einen Worker erstellen (\'Create Worker\' ➔ \'Quick Edit\') und den Code aus server/cloudflare-push-relay hineinkopieren. Kein Git nötig.')}
                            </Typography>

                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 1 }}>
                                {t(
                                    'settings.relay_manual_title',
                                    'Alternative: Manuelles CLI-Deployment im Terminal:',
                                )}
                            </Typography>
                            <Box
                                component="pre"
                                sx={{
                                    p: 1.5,
                                    borderRadius: 1.5,
                                    bgcolor: 'rgba(0, 0, 0, 0.4)',
                                    fontSize: '0.8rem',
                                    overflowX: 'auto',
                                    m: 0,
                                    color: '#81c784',
                                }}
                            >
                                {workerDeployCommands}
                            </Box>
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={copiedCommands ? <CheckCircleRoundedIcon /> : <ContentCopyIcon />}
                                onClick={handleCopyCommands}
                                sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
                            >
                                {copiedCommands
                                    ? t('settings.relay_worker_copied', 'Befehle kopiert!')
                                    : t('settings.relay_worker_copy', 'Befehle kopieren')}
                            </Button>
                        </AccordionDetails>
                    </Accordion>
                </Box>
            </Box>
        </Box>
    );
};
