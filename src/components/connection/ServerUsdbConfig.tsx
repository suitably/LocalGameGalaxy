import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box, Button, Typography, Paper, TextField,
    CircularProgress, Alert, Chip, InputAdornment, IconButton
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import VpnKeyRoundedIcon from '@mui/icons-material/VpnKeyRounded';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { storage } from '../../lib/storage';
import { settingsCardSx } from '../../features/settings/settingsStyles';
import { melodiqFetch } from '../../games/melodiq';
import type { UsdbCredentialsResponse } from './serverConfigTypes';

export interface ServerUsdbConfigProps {
    autoFocusUsdb?: boolean;
    onBackToGame?: () => void;
}

export const ServerUsdbConfig: React.FC<ServerUsdbConfigProps> = ({ autoFocusUsdb, onBackToGame }) => {
    const { t } = useTranslation();
    const [isServerActive, setIsServerActive] = useState(() => storage.isHelperActive());
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [hasPassword, setHasPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const isMissingUsdbParam = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('missing_usdb') === '1';
    const showMissingBanner = autoFocusUsdb ?? isMissingUsdbParam;

    const usernameInputRef = useRef<HTMLInputElement>(null);
    const passwordInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);
    const [alertFeedback, setAlertFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const loadCredentials = useCallback(async () => {
        if (!storage.isHelperActive()) return;
        setLoading(true);
        try {
            const data = await melodiqFetch<UsdbCredentialsResponse>('/api/config/usdb-credentials');
            setUsername(data?.username || '');
            setHasPassword(Boolean(data?.hasPassword));
            setPassword('');
        } catch {
            // Ignore load failures silently on initial render
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const handleUpdate = () => {
            const active = storage.isHelperActive();
            setIsServerActive(active);
            if (active) {
                loadCredentials();
            }
        };

        handleUpdate();
        window.addEventListener('server_connection_updated', handleUpdate);
        return () => window.removeEventListener('server_connection_updated', handleUpdate);
    }, [loadCredentials]);

    const handleSaveAndTest = async () => {
        if (!username.trim()) return;
        setTesting(true);
        setAlertFeedback(null);

        try {
            // If password is blank but server has existing password, send '********' to preserve it
            const pwdToSend = password.trim() ? password : (hasPassword ? '********' : '');
            await melodiqFetch('/api/config/usdb-credentials', {
                method: 'POST',
                body: JSON.stringify({ username: username.trim(), password: pwdToSend })
            });

            setHasPassword(true);
            setPassword('');
            setAlertFeedback({
                type: 'success',
                text: t('server.usdb.success', 'USDB credentials successfully verified and saved!')
            });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Login failed';
            setAlertFeedback({
                type: 'error',
                text: t('server.usdb.error', { error: msg, defaultValue: `USDB login failed: ${msg}` })
            });
        } finally {
            setTesting(false);
        }
    };

    const isConfigured = Boolean(username && hasPassword);

    useEffect(() => {
        if (showMissingBanner && !isConfigured) {
            const timer = setTimeout(() => {
                const targetRef = username ? passwordInputRef : usernameInputRef;
                if (targetRef.current) {
                    targetRef.current.focus();
                    targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [showMissingBanner, isConfigured, username]);

    if (!isServerActive) {
        return null;
    }

    return (
        <Paper sx={settingsCardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6">{t('server.usdb.title', 'UltraStar DB Credentials')}</Typography>
                        <Chip
                            icon={isConfigured ? <CheckCircleOutlineIcon /> : <HelpOutlineIcon />}
                            label={isConfigured
                                ? t('server.usdb.status_configured', 'Configured')
                                : t('server.usdb.status_not_configured', 'Not Configured')}
                            size="small"
                            color={isConfigured ? 'success' : 'default'}
                            variant="outlined"
                        />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                        {t('server.usdb.desc', 'Credentials for USDB (usdb.animux.de) for automated song downloading.')}
                    </Typography>
                </Box>
            </Box>

            {showMissingBanner && !isConfigured && (
                <Alert
                    severity="warning"
                    icon={<VpnKeyRoundedIcon fontSize="inherit" />}
                    sx={{
                        mb: 2,
                        bgcolor: 'rgba(237, 108, 2, 0.15)',
                        color: '#fff',
                        border: '1px solid rgba(237, 108, 2, 0.4)',
                        '& .MuiAlert-icon': { color: '#ffb74d' },
                        borderRadius: 2,
                    }}
                >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                        {t('server.usdb.missing_title', 'USDB-Zugangsdaten erforderlich')}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                        {t(
                            'server.usdb.missing_desc',
                            'Für die Online-Suche und das Herunterladen von Songs aus der UltraStar DB müssen Benutzername und Passwort hinterlegt werden.',
                        )}
                    </Typography>
                </Alert>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress size={28} />
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <TextField
                        size="small"
                        fullWidth
                        inputRef={usernameInputRef}
                        label={t('server.usdb.username', 'USDB Username')}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="john_doe"
                    />

                    <TextField
                        size="small"
                        fullWidth
                        inputRef={passwordInputRef}
                        label={t('server.usdb.password', 'Password')}
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={hasPassword
                            ? t('server.usdb.password_saved_placeholder', '•••••••• (Saved)')
                            : t('server.usdb.password_placeholder', 'Enter password')}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            size="small"
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                        >
                                            {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }
                        }}
                    />

                    {alertFeedback && (
                        <Alert severity={alertFeedback.type} sx={{ mt: 1 }}>
                            {alertFeedback.text}
                        </Alert>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: onBackToGame ? 'space-between' : 'flex-end', alignItems: 'center', mt: 1 }}>
                        {onBackToGame && (
                            <Button
                                variant="outlined"
                                onClick={onBackToGame}
                                startIcon={<ArrowBackIcon />}
                            >
                                {t('server.usdb.back_to_game', 'Zurück zum Spiel')}
                            </Button>
                        )}
                        <Button
                            variant="contained"
                            onClick={handleSaveAndTest}
                            disabled={!username.trim() || testing}
                            startIcon={testing ? <CircularProgress size={16} color="inherit" /> : undefined}
                        >
                            {testing
                                ? t('server.usdb.testing', 'Verifying credentials with USDB...')
                                : t('server.usdb.save_and_test', 'Save & Test Connection')}
                        </Button>
                    </Box>
                </Box>
            )}
        </Paper>
    );
};
