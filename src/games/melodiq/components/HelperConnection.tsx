import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, TextField, Typography, Paper, Switch, FormControlLabel } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

export const HelperConnection: React.FC = () => {
    const { t } = useTranslation();
    const [url, setUrl] = useState(() => localStorage.getItem('melodiq_helper_url') || 'http://localhost:3000');
    const [token, setToken] = useState(() => localStorage.getItem('melodiq_helper_token') || '');
    const [enabled, setEnabled] = useState(() => localStorage.getItem('melodiq_enable_helper') !== 'false');

    const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
    const [statusMsg, setStatusMsg] = useState('');

    useEffect(() => {
        // Save on change
        localStorage.setItem('melodiq_helper_url', url);
        localStorage.setItem('melodiq_helper_token', token);
        localStorage.setItem('melodiq_enable_helper', String(enabled));

        // Notify listeners
        window.dispatchEvent(new Event('melodiq_settings_updated'));
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
                    
                    if (val.startsWith('http')) {
                        val = urlObj.toString();
                    } else {
                        val = urlObj.toString().replace(/^http:\/\//, '');
                    }
                    val = val.replace(/\?$/, '').replace(/\/$/, '');
                }
            }
        } catch (err) {
            // Ignore parse errors while typing
        }
        setUrl(val);
    };

    const checkConnection = async () => {
        if (!enabled) return;
        setStatus('checking');
        setStatusMsg(t('melodiq.helper.connecting', 'Connecting...'));

        try {
            const cleanUrl = url.replace(/\/$/, "");
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const res = await fetch(`${cleanUrl}/api/status`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                setStatus('success');
                setStatusMsg(t('melodiq.helper.connected', { count: data.count || 0, defaultValue: `Connected! Found ${data.count || 0} songs.` }));
            } else if (res.status === 401) {
                setStatus('error');
                setStatusMsg(t('melodiq.helper.unauthorized', 'Unauthorized. Check Token.'));
            } else {
                setStatus('error');
                setStatusMsg(t('melodiq.helper.error_status', { status: res.statusText, defaultValue: `Error: ${res.statusText}` }));
            }
        } catch (e: any) {
            setStatus('error');
            setStatusMsg(t('melodiq.helper.conn_failed', 'Connection Failed. Check URL or Network.'));
        }
    };

    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
                {t('melodiq.helper.title', 'Helper Server Connection')}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
                {t('melodiq.helper.desc', 'Connect to a Melodiq Helper (PC/Server) to load 8000+ songs. Enter the URL (e.g., http://192.168.1.50:3000) and the Security Token shown on the Helper screen.')}
            </Typography>

            <FormControlLabel
                control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />}
                label={t("melodiq.helper.enable", "Enable Helper Connection")}
            />

            {enabled && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                    <TextField
                        label={t("melodiq.helper.server_url", "Server URL")}
                        variant="outlined"
                        fullWidth
                        value={url}
                        onChange={handleUrlChange}
                        placeholder="http://localhost:3000"
                        size="small"
                    />
                    <TextField
                        label={t("melodiq.helper.token", "Security Token")}
                        variant="outlined"
                        fullWidth
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder={t("melodiq.helper.token_placeholder", "Copy from Helper Console/Screen")}
                        size="small"
                        type="password"
                    />

                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Button
                            variant="contained"
                            onClick={checkConnection}
                            disabled={status === 'checking'}
                            sx={{
                                borderRadius: 50,
                                px: 3,
                                py: 1,
                                backgroundImage: status === 'checking' ? 'none' : 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                                boxShadow: status === 'checking' ? 'none' : '0 3px 5px 2px rgba(255, 105, 135, .3)',
                                color: 'white'
                            }}
                        >
                            {t("melodiq.helper.test", "Test Connection")}
                        </Button>

                        {status === 'success' && (
                            <Typography color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
        </Paper>
    );
};
