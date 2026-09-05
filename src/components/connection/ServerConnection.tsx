import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box, Button, TextField, Typography, Paper, Switch, FormControlLabel,
    IconButton, InputAdornment, Dialog, DialogTitle, DialogContent,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CloseIcon from '@mui/icons-material/Close';
import { storage } from '../../lib/storage';
import { ServerSetupWizard } from './ServerSetupWizard';
import { settingsCardSx } from '../../features/settings/settingsStyles';

/**
 * ServerConnection [ID: COMP-SERVER-CONN]
 *
 * Shared component for configuring the connection to a Nexumia Server.
 * Previously embedded in the Melodiq settings as "HelperConnection", now
 * generalized and moved to shared components since the server is used by
 * multiple games (Melodiq songs, GuessArt catalogue publishing, feedback, etc.).
 */

type ConnectionStatus = 'idle' | 'checking' | 'success' | 'error';

export const ServerConnection: React.FC = () => {
    const { t } = useTranslation();
    const [url, setUrl] = useState(() => storage.getHelperUrl());
    const [token, setToken] = useState(() => storage.getHelperToken());
    const [enabled, setEnabled] = useState(() => storage.isHelperActive());
    const [showToken, setShowToken] = useState(false);
    const [setupDialogOpen, setSetupDialogOpen] = useState(false);

    const [status, setStatus] = useState<ConnectionStatus>('idle');
    const [statusMsg, setStatusMsg] = useState('');

    const isInitialMount = React.useRef(true);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        storage.setHelperUrl(url);
        storage.setHelperToken(token);
        storage.setHelperActive(enabled);

        // Notify listeners (Melodiq settings, Admin Panel, etc.)
        window.dispatchEvent(new Event('melodiq_settings_updated'));
        window.dispatchEvent(new Event('server_connection_updated'));
    }, [url, token, enabled]);

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        let val = e.target.value;
        try {
            if (val.includes('token=')) {
                const parseUrl = val.startsWith('http') ? val : `http://${val}`;
                const urlObj = new URL(parseUrl);
                const extractedToken = urlObj.searchParams.get('token');

                if (extractedToken) {
                    setToken(extractedToken);
                    urlObj.searchParams.delete('token');

                    val = val.startsWith('http')
                        ? urlObj.toString()
                        : urlObj.toString().replace(/^http:\/\//, '');
                    val = val.replace(/\?$/, '').replace(/\/$/, '');
                }
            }
        } catch {
            // Ignore parse errors while typing
        }
        setUrl(val);
    };

    const checkConnection = async () => {
        if (!enabled) return;
        setStatus('checking');
        setStatusMsg(t('server.connecting', 'Connecting...'));

        try {
            const cleanUrl = url.replace(/\/$/, '');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const res = await fetch(`${cleanUrl}/api/status`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                setStatus('success');
                setStatusMsg(
                    t('server.connected', {
                        count: data.count || 0,
                        defaultValue: `Connected! Found ${data.count || 0} songs.`,
                    }),
                );
                window.dispatchEvent(new Event('server_connection_updated'));
            } else {
                setStatus('error');
                if (res.status === 401) {
                    setStatusMsg(t('server.error_unauthorized', 'Unauthorized: Invalid or missing token.'));
                } else {
                    setStatusMsg(t('server.error_generic', `Server returned status ${res.status}.`));
                }
            }
        } catch (err: any) {
            setStatus('error');
            if (err.name === 'AbortError') {
                setStatusMsg(t('server.error_timeout', 'Connection timed out (5s).'));
            } else {
                setStatusMsg(t('server.error_failed', 'Connection failed. Check URL or CORS.'));
            }
        }
    };

    const copyConnectionUrl = () => {
        const cleanWeb = window.location.origin;
        const cleanServer = url.replace(/\/$/, '');
        const connectionLink = `${cleanWeb}/?serverUrl=${encodeURIComponent(cleanServer)}&token=${encodeURIComponent(token)}`;
        navigator.clipboard.writeText(connectionLink);
    };

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
                control={
                    <Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                }
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
                        placeholder={t(
                            'server.token_placeholder',
                            'Copy from Server Console/Screen',
                        )}
                        size="small"
                        type={showToken ? 'text' : 'password'}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowToken((v) => !v)}
                                            edge="end"
                                            size="small"
                                        >
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
                            sx={{
                                borderRadius: 50,
                                px: 3,
                                py: 1,
                                backgroundImage:
                                    status === 'checking'
                                        ? 'none'
                                        : 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                                boxShadow:
                                    status === 'checking'
                                        ? 'none'
                                        : '0 3px 5px 2px rgba(255, 105, 135, .3)',
                                color: 'white',
                            }}
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
                            <Typography
                                color="error.main"
                                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                            >
                                <ErrorIcon fontSize="small" /> {statusMsg}
                            </Typography>
                        )}
                    </Box>
                </Box>
            )}

            {/* Setup Wizard Modal Dialog */}
            <Dialog
                open={setupDialogOpen}
                onClose={() => setSetupDialogOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: '#141724',
                        backgroundImage: 'none',
                        borderRadius: 3,
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.6)',
                    }
                }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <AutoFixHighIcon color="primary" />
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {t('server.setup.dialog_title', 'Server einrichten & anpassen')}
                        </Typography>
                    </Box>
                    <IconButton onClick={() => setSetupDialogOpen(false)} size="small" aria-label="close">
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ p: { xs: 2, sm: 3 }, borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                    <ServerSetupWizard isDialog />
                </DialogContent>
            </Dialog>
        </Paper>
    );
};
