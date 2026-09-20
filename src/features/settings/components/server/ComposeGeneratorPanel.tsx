import React, { useState, useMemo } from 'react';
import {
    Box,
    Paper,
    Typography,
    FormGroup,
    FormControlLabel,
    Checkbox,
    Button,
    TextField,
    Chip,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import StorageIcon from '@mui/icons-material/Storage';
import { useTranslation } from 'react-i18next';
import { settingsCardSx } from '../../settingsStyles';
import { generateComposeYaml, type ComposeGeneratorOptions } from './composeYamlGenerator';

const SERVICES = [
    { id: 'melodiq', label: 'MelodiQ (Karaoke KI)', port: 3000, defaultChecked: true },
    { id: 'tabletop', label: 'Tabletop (BYOG Games)', port: 3002, defaultChecked: false },
    { id: 'push', label: 'Push Relay (Benachrichtigungen)', port: 3001, defaultChecked: false },
    { id: 'tunnel', label: 'Cloudflare Tunnel (Internet-Freigabe)', port: null, defaultChecked: false },
] as const;

export const ComposeGeneratorPanel: React.FC = () => {
    const { t } = useTranslation();

    const [selectedServices, setSelectedServices] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        for (const service of SERVICES) {
            initial[service.id] = service.defaultChecked;
        }
        return initial;
    });

    const [copied, setCopied] = useState(false);

    const handleToggle = (id: string) => {
        setSelectedServices((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const yamlContent = useMemo(() => {
        const options: ComposeGeneratorOptions = {
            melodiq: Boolean(selectedServices['melodiq']),
            tabletop: Boolean(selectedServices['tabletop']),
            push: Boolean(selectedServices['push']),
            tunnel: Boolean(selectedServices['tunnel']),
        };
        return generateComposeYaml(options);
    }, [selectedServices]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(yamlContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard write fallback or silent fail
        }
    };

    return (
        <Paper id="settings-section-compose" sx={settingsCardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <StorageIcon color="primary" sx={{ fontSize: 28 }} />
                <Box>
                    <Typography variant="h6" fontWeight={700}>
                        {t('settings.compose_generator_title', 'Docker Compose Generator')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t(
                            'settings.compose_generator_desc',
                            'Choose which services you want and get a ready-to-use docker-compose.yml'
                        )}
                    </Typography>
                </Box>
            </Box>

            {/* Service Selection */}
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, color: 'text.secondary' }}>
                {t('settings.compose_services_title', 'Select Services')}
            </Typography>

            <FormGroup
                row
                sx={{
                    mb: 2.5,
                    gap: 1,
                    p: 1.5,
                    bgcolor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 2,
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
            >
                {SERVICES.map((service) => (
                    <FormControlLabel
                        key={service.id}
                        control={
                            <Checkbox
                                checked={Boolean(selectedServices[service.id])}
                                onChange={() => handleToggle(service.id)}
                                size="small"
                            />
                        }
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                <Typography variant="body2" fontWeight={500}>
                                    {service.label}
                                </Typography>
                                {service.port && (
                                    <Chip
                                        label={`:${service.port}`}
                                        size="small"
                                        variant="outlined"
                                        sx={{ height: 20, fontSize: '0.7rem' }}
                                    />
                                )}
                            </Box>
                        }
                    />
                ))}
            </FormGroup>

            {/* Generated YAML Display & Copy */}
            <Box sx={{ position: 'relative' }}>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1,
                    }}
                >
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                        docker-compose.yml
                    </Typography>
                    <Button
                        size="small"
                        variant={copied ? 'contained' : 'outlined'}
                        color={copied ? 'success' : 'primary'}
                        startIcon={copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                        onClick={handleCopy}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        {copied
                            ? t('settings.compose_copied', 'Copied!')
                            : t('settings.compose_copy', 'Copy to Clipboard')}
                    </Button>
                </Box>

                <TextField
                    multiline
                    fullWidth
                    rows={12}
                    value={yamlContent}
                    slotProps={{
                        input: {
                            readOnly: true,
                            sx: {
                                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                fontSize: '0.8rem',
                                bgcolor: 'rgba(10, 12, 18, 0.85)',
                                borderRadius: 2,
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                '& textarea': {
                                    whiteSpace: 'pre',
                                    overflowX: 'auto',
                                },
                            },
                        },
                    }}
                />
            </Box>
        </Paper>
    );
};
