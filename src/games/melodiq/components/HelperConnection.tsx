import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Paper, Switch, FormControlLabel } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

export const HelperConnection: React.FC = () => {
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
    }, [url, token, enabled]);

    const checkConnection = async () => {
        if (!enabled) return;
        setStatus('checking');
        setStatusMsg('Connecting...');

        try {
            const cleanUrl = url.replace(/\/$/, "");
            const res = await fetch(`${cleanUrl}/api/songs?limit=1`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (res.ok) {
                const data = await res.json();
                setStatus('success');
                setStatusMsg(`Connected! Found ${res.headers.get('X-Total-Count') || data.length || 'songs'}.`);
            } else if (res.status === 401) {
                setStatus('error');
                setStatusMsg('Unauthorized. Check Token.');
            } else {
                setStatus('error');
                setStatusMsg(`Error: ${res.statusText}`);
            }
        } catch (e: any) {
            setStatus('error');
            setStatusMsg('Connection Failed. Check URL or Network.');
        }
    };

    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
                Helper Server Connection
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
                Connect to a Melodiq Helper (PC/Server) to load 8000+ songs.
                Enter the URL (e.g., http://192.168.1.50:3000) and the Security Token shown on the Helper screen.
            </Typography>

            <FormControlLabel
                control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />}
                label="Enable Helper Connection"
            />

            {enabled && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                    <TextField
                        label="Server URL"
                        variant="outlined"
                        fullWidth
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="http://localhost:3000"
                        size="small"
                    />
                    <TextField
                        label="Security Token"
                        variant="outlined"
                        fullWidth
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="Copy from Helper Console/Screen"
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
                            Test Connection
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
