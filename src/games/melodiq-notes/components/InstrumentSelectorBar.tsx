import React from 'react';
import { Box, Chip } from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
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
    soloInstrumentInSheet: _soloInstrumentInSheet,
    onSelectPart,
    onToggleSoloSheet: _onToggleSoloSheet,
    onOpenMixer: _onOpenMixer,
}) => {
    if (!parts || parts.length <= 1) return null;

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                overflowX: 'auto',
                mb: 1.5,
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
                            height: 28,
                            fontSize: '0.78rem',
                            fontWeight: isSelected ? 700 : 500,
                            bgcolor: isSelected ? part.color : 'rgba(255, 255, 255, 0.05)',
                            color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
                            borderColor: isSelected ? 'transparent' : 'rgba(255, 255, 255, 0.15)',
                            flexShrink: 0,
                            cursor: 'pointer',
                            '&:hover': {
                                bgcolor: isSelected ? part.color : 'rgba(255, 255, 255, 0.12)',
                            },
                        }}
                    />
                );
            })}
        </Box>
    );
};
