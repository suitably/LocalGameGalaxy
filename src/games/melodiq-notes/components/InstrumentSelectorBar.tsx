import React from 'react';
import { Box, Chip, Stack, Typography, Tooltip, IconButton, Switch, FormControlLabel } from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import { useTranslation } from 'react-i18next';
import type { ScorePartInfo, InstrumentMixerChannel } from '../types';

interface InstrumentSelectorBarProps {
    parts: ScorePartInfo[];
    selectedPartId: string;
    mixerChannels: Record<string, InstrumentMixerChannel>;
    soloInstrumentInSheet: boolean;
    onSelectPart: (partId: string) => void;
    onToggleSoloSheet: (solo: boolean) => void;
    onOpenMixer: () => void;
}

export const InstrumentSelectorBar: React.FC<InstrumentSelectorBarProps> = ({
    parts,
    selectedPartId,
    mixerChannels,
    soloInstrumentInSheet,
    onSelectPart,
    onToggleSoloSheet,
    onOpenMixer,
}) => {
    const { t } = useTranslation();

    if (!parts || parts.length === 0) return null;

    return (
        <Box sx={{ my: 1.5, p: 1.5, bgcolor: 'rgba(255, 255, 255, 0.04)', borderRadius: 2, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {t('games.melodiq_notes.your_instrument', 'Dein Instrument zum Spielen')} ({parts.length})
                </Typography>

                <Stack direction="row" spacing={1} alignItems="center">
                    <FormControlLabel
                        control={
                            <Switch
                                size="small"
                                checked={soloInstrumentInSheet}
                                onChange={(e) => onToggleSoloSheet(e.target.checked)}
                            />
                        }
                        label={
                            <Typography variant="caption" color="text.secondary">
                                {t('games.melodiq_notes.solo_sheet', 'Nur gewähltes Instrument')}
                            </Typography>
                        }
                        sx={{ mr: 0 }}
                    />
                    <Tooltip title={t('games.melodiq_notes.ensemble_mixer', 'Band-Mixer')}>
                        <IconButton size="small" color="primary" onClick={onOpenMixer}>
                            <GraphicEqIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>

            {/* Horizontal scrollable track chips */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    overflowX: 'auto',
                    pb: 0.5,
                    '&::-webkit-scrollbar': { height: 4 },
                    '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.2)', borderRadius: 2 },
                }}
            >
                {parts.map(part => {
                    const isSelected = part.id === selectedPartId;
                    const ch = mixerChannels[part.id];
                    const isMuted = ch?.muted;
                    const isSolo = ch?.solo;

                    return (
                        <Chip
                            key={part.id}
                            icon={<MusicNoteIcon style={{ color: isSelected ? '#fff' : part.color, fontSize: 16 }} />}
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <span>{part.name}</span>
                                    {isMuted && <VolumeOffIcon sx={{ fontSize: 13, color: '#f87171' }} />}
                                    {isSolo && <Chip label="S" size="small" sx={{ height: 14, fontSize: '0.6rem', bgcolor: '#eab308', color: '#000', px: 0.3 }} />}
                                </Box>
                            }
                            onClick={() => onSelectPart(part.id)}
                            variant={isSelected ? 'filled' : 'outlined'}
                            sx={{
                                height: 32,
                                fontSize: '0.82rem',
                                fontWeight: isSelected ? 700 : 500,
                                bgcolor: isSelected ? part.color : 'rgba(255, 255, 255, 0.05)',
                                color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
                                borderColor: isSelected ? 'transparent' : 'rgba(255, 255, 255, 0.15)',
                                flexShrink: 0,
                                transition: 'all 0.15s ease',
                                '&:hover': {
                                    bgcolor: isSelected ? part.color : 'rgba(255, 255, 255, 0.12)',
                                    transform: 'translateY(-1px)',
                                },
                            }}
                        />
                    );
                })}
            </Box>
        </Box>
    );
};
