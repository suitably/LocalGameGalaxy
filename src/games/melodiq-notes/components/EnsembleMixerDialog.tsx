import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Box, Stack, Slider, IconButton,
    Switch, FormControlLabel, Paper, Tooltip, Chip
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import type { ScorePartInfo, InstrumentMixerChannel } from '../types';

interface EnsembleMixerDialogProps {
    open: boolean;
    onClose: () => void;
    parts: ScorePartInfo[];
    channels: Record<string, InstrumentMixerChannel>;
    selectedPartId: string;
    mutePlayerPart: boolean;
    masterVolume: number;
    onChannelChange: (partId: string, updates: Partial<InstrumentMixerChannel>) => void;
    onMasterVolumeChange: (vol: number) => void;
    onToggleMutePlayerPart: (mute: boolean) => void;
}

export const EnsembleMixerDialog: React.FC<EnsembleMixerDialogProps> = ({
    open,
    onClose,
    parts,
    channels,
    selectedPartId,
    mutePlayerPart,
    masterVolume,
    onChannelChange,
    onMasterVolumeChange,
    onToggleMutePlayerPart,
}) => {
    const { t } = useTranslation();

    const handleToggleMute = (partId: string) => {
        const ch = channels[partId];
        const isMuted = ch?.muted ?? false;
        onChannelChange(partId, { muted: !isMuted });
    };

    const handleToggleSolo = (partId: string) => {
        const ch = channels[partId];
        const isSolo = ch?.solo ?? false;
        onChannelChange(partId, { solo: !isSolo });
    };

    const handleVolumeChange = (partId: string, vol: number) => {
        onChannelChange(partId, { volume: vol });
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: '#1a1a2e',
                    backgroundImage: 'none',
                    borderRadius: 3,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Typography variant="h6" fontWeight={700}>
                    {t('games.melodiq_notes.ensemble_mixer', 'Band-Mixer')}
                </Typography>
                <IconButton size="small" onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                {/* Master Volume & Options */}
                <Paper sx={{ p: 2, mb: 2.5, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
                    <Stack spacing={1.5}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="subtitle2" color="text.secondary">
                                {t('games.melodiq_notes.master_volume', 'Gesamtlautstärke')}
                            </Typography>
                            <Typography variant="caption" fontWeight={700}>
                                {Math.round(masterVolume * 100)}%
                            </Typography>
                        </Box>
                        <Slider
                            value={Math.round(masterVolume * 100)}
                            min={0}
                            max={100}
                            onChange={(_, val) => onMasterVolumeChange((val as number) / 100)}
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    size="small"
                                    checked={mutePlayerPart}
                                    onChange={(e) => onToggleMutePlayerPart(e.target.checked)}
                                />
                            }
                            label={
                                <Typography variant="caption" color="text.secondary">
                                    {t('games.melodiq_notes.mute_my_part', 'Eigenes Instrument stummschalten')}
                                </Typography>
                            }
                        />
                    </Stack>
                </Paper>

                {/* Track Channels */}
                <Stack spacing={1.5}>
                    {parts.map(part => {
                        const ch = channels[part.id] || { volume: 1.0, muted: false, solo: false };
                        const isPlayerTrack = part.id === selectedPartId;
                        const isEffectiveMuted = ch.muted || (isPlayerTrack && mutePlayerPart);

                        return (
                            <Paper
                                key={part.id}
                                variant="outlined"
                                sx={{
                                    p: 1.5,
                                    bgcolor: isPlayerTrack ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255,255,255,0.02)',
                                    borderColor: isPlayerTrack ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.08)',
                                    borderRadius: 2,
                                }}
                            >
                                <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                                    <Box sx={{ minWidth: 140, flex: 1 }}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: part.color }} />
                                            <Typography variant="subtitle2" fontWeight={600} noWrap>
                                                {part.name}
                                            </Typography>
                                            {isPlayerTrack && (
                                                <Chip label="DU" size="small" color="primary" sx={{ height: 16, fontSize: '0.6rem' }} />
                                            )}
                                        </Stack>
                                    </Box>

                                    {/* Volume Slider */}
                                    <Box sx={{ width: 120, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Slider
                                            size="small"
                                            disabled={isEffectiveMuted}
                                            value={Math.round(ch.volume * 100)}
                                            min={0}
                                            max={120}
                                            onChange={(_, val) => handleVolumeChange(part.id, (val as number) / 100)}
                                        />
                                        <Typography variant="caption" sx={{ minWidth: 28 }}>
                                            {Math.round(ch.volume * 100)}%
                                        </Typography>
                                    </Box>

                                    {/* Mute & Solo Buttons */}
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        <Tooltip title={isEffectiveMuted ? 'Laut schalten' : 'Stumm'}>
                                            <IconButton
                                                size="small"
                                                color={isEffectiveMuted ? 'error' : 'default'}
                                                onClick={() => handleToggleMute(part.id)}
                                            >
                                                {isEffectiveMuted ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
                                            </IconButton>
                                        </Tooltip>

                                        <Button
                                            size="small"
                                            variant={ch.solo ? 'contained' : 'outlined'}
                                            color={ch.solo ? 'warning' : 'inherit'}
                                            onClick={() => handleToggleSolo(part.id)}
                                            sx={{ minWidth: 32, px: 1, py: 0.25, fontSize: '0.7rem' }}
                                        >
                                            S
                                        </Button>
                                    </Stack>
                                </Stack>
                            </Paper>
                        );
                    })}
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button variant="contained" onClick={onClose}>
                    {t('common.done', 'Fertig')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
