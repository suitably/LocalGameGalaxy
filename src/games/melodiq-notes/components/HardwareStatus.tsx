import React from 'react';
import {
    Box,
    Paper,
    Stack,
    Typography,
    FormControl,
    Select,
    MenuItem,
    IconButton
} from '@mui/material';
import PianoIcon from '@mui/icons-material/Piano';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import { useTranslation } from 'react-i18next';
import type { InputSource } from '../types';
import type { MidiDevice } from '../useMidiInput';

interface HardwareStatusProps {
    inputSource: InputSource;
    midiDevices: MidiDevice[];
    selectedDeviceId: string | null;
    onSelectDeviceId: (id: string) => void;
    isMicActive: boolean;
    micPitch: number | null;
    onToggleMicrophone: () => void;
}

export const HardwareStatus: React.FC<HardwareStatusProps> = ({
    inputSource,
    midiDevices,
    selectedDeviceId,
    onSelectDeviceId,
    isMicActive,
    micPitch,
    onToggleMicrophone
}) => {
    const { t } = useTranslation();

    return (
        <Box sx={{ mb: 2 }}>
            {inputSource === 'midi' && (
                <Paper sx={{ p: 1.5, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <PianoIcon color={midiDevices.length > 0 ? 'success' : 'action'} />
                        <Typography variant="body2">
                            {midiDevices.length > 0
                                ? t('games.melodiq_notes.midi_connected', { devices: midiDevices.map(d => d.name).join(', ') })
                                : t('games.melodiq_notes.no_midi_detected')}
                        </Typography>
                        {midiDevices.length > 1 && (
                            <FormControl size="small" sx={{ ml: 'auto', minWidth: 150 }}>
                                <Select
                                    value={selectedDeviceId || ''}
                                    onChange={(e) => onSelectDeviceId(e.target.value)}
                                >
                                    {midiDevices.map(dev => (
                                        <MenuItem key={dev.id} value={dev.id}>{dev.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                    </Stack>
                </Paper>
            )}

            {inputSource === 'mic' && (
                <Paper sx={{ p: 1.5, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <IconButton
                            color={isMicActive ? 'error' : 'primary'}
                            onClick={onToggleMicrophone}
                        >
                            {isMicActive ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>
                        <Typography variant="body2">
                            {isMicActive
                                ? (micPitch
                                    ? t('games.melodiq_notes.mic_active_detected', { pitch: micPitch })
                                    : t('games.melodiq_notes.mic_active_listening'))
                                : t('games.melodiq_notes.mic_click_enable')}
                        </Typography>
                    </Stack>
                </Paper>
            )}
        </Box>
    );
};
