import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Box, Stack, IconButton,
    ToggleButtonGroup, ToggleButton, Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import PianoIcon from '@mui/icons-material/Piano';
import MicIcon from '@mui/icons-material/Mic';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { MelodiqNotesViewMode, PlayMode, InputSource } from '../types';
import type { MidiDevice } from '../useMidiInput';
import { HardwareStatus } from './HardwareStatus';
import { GameplaySettingsSection } from './GameplaySettingsSection';
import { SoundSettingsSection } from './SoundSettingsSection';

interface MelodiqNotesSettingsDialogProps {
    open: boolean;
    onClose: () => void;
    viewMode: MelodiqNotesViewMode;
    onViewModeChange: (mode: MelodiqNotesViewMode) => void;
    sheetRenderMode: 'horizontal' | 'vertical';
    onSheetRenderModeChange: (mode: 'horizontal' | 'vertical') => void;
    playMode: PlayMode;
    onPlayModeChange: (mode: PlayMode) => void;
    inputSource: InputSource;
    onInputSourceChange: (source: InputSource) => void;
    midiDevices: MidiDevice[];
    selectedDeviceId: string | null;
    onSelectDeviceId: (id: string) => void;
    isMicActive: boolean;
    micPitch: number | null;
    onToggleMicrophone: () => void;
    partsCount: number;
    onOpenMixer: () => void;
    onSoundConfigChanged?: () => void;
}

export const MelodiqNotesSettingsDialog: React.FC<MelodiqNotesSettingsDialogProps> = ({
    open,
    onClose,
    viewMode,
    onViewModeChange,
    sheetRenderMode,
    onSheetRenderModeChange,
    playMode,
    onPlayModeChange,
    inputSource,
    onInputSourceChange,
    midiDevices,
    selectedDeviceId,
    onSelectDeviceId,
    isMicActive,
    micPitch,
    onToggleMicrophone,
    partsCount,
    onOpenMixer,
    onSoundConfigChanged,
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: '#141624',
                    backgroundImage: 'none',
                    borderRadius: 3.5,
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <SettingsIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight={700}>
                        {t('games.melodiq_notes.settings', 'Einstellungen & Setup')}
                    </Typography>
                </Stack>
                <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', py: 2.5 }}>
                <Stack spacing={3}>
                    {/* 1. Ansicht & Spielmodus */}
                    <GameplaySettingsSection
                        viewMode={viewMode}
                        onViewModeChange={onViewModeChange}
                        sheetRenderMode={sheetRenderMode}
                        onSheetRenderModeChange={onSheetRenderModeChange}
                        playMode={playMode}
                        onPlayModeChange={onPlayModeChange}
                    />

                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

                    {/* 2. Eingabequelle & Hardware */}
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', mb: 1 }}>
                            {t('games.melodiq_notes.input_source', 'Eingabequelle')}
                        </Typography>
                        <ToggleButtonGroup
                            fullWidth
                            size="small"
                            value={inputSource}
                            exclusive
                            onChange={(_, val) => val && onInputSourceChange(val as InputSource)}
                            sx={{ mb: 1.5 }}
                        >
                            <ToggleButton value="midi" sx={{ py: 0.75 }}>
                                <PianoIcon sx={{ mr: 1, fontSize: 18 }} />
                                {t('games.melodiq_notes.midi_keyboard', 'MIDI-Keyboard')}
                            </ToggleButton>
                            <ToggleButton value="mic" sx={{ py: 0.75 }}>
                                <MicIcon sx={{ mr: 1, fontSize: 18 }} />
                                {t('games.melodiq_notes.microphone', 'Mikrofon')}
                            </ToggleButton>
                        </ToggleButtonGroup>

                        <HardwareStatus
                            inputSource={inputSource}
                            midiDevices={midiDevices}
                            selectedDeviceId={selectedDeviceId}
                            onSelectDeviceId={onSelectDeviceId}
                            isMicActive={isMicActive}
                            micPitch={micPitch}
                            onToggleMicrophone={onToggleMicrophone}
                        />
                    </Box>

                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

                    {/* 3. Sound & Audio-Engine */}
                    <SoundSettingsSection
                        partsCount={partsCount}
                        onOpenMixer={() => { onClose(); onOpenMixer(); }}
                        onSoundConfigChanged={onSoundConfigChanged}
                    />
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
                <Button
                    startIcon={<SettingsIcon />}
                    size="small"
                    color="secondary"
                    onClick={() => {
                        onClose();
                        navigate('/settings?tab=melodiq-notes&from=/games/melodiq-notes');
                    }}
                >
                    {t('games.melodiq_notes.all_sound_settings', 'Alle Sound-Einstellungen')}
                </Button>
                <Button variant="contained" onClick={onClose} sx={{ borderRadius: 2, px: 3 }}>
                    {t('common.done', 'Fertig')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
