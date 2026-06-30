import { useState } from 'react';
import {
    Box, Typography, TextField, Switch, FormControlLabel, Slider, ToggleButton, ToggleButtonGroup, IconButton, Button
} from '@mui/material';
import type { SettingsState } from '../hooks/useSettings';

interface GameSettingsPanelProps {
    settings: SettingsState;
    onUpdateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}

export const GameSettingsPanel: React.FC<GameSettingsPanelProps> = ({
    settings,
    onUpdateSetting
}) => {
    const [newPlayerCount, setNewPlayerCount] = useState('');
    const [newLayoutStr, setNewLayoutStr] = useState('');

    const handleUpdateLayout = (playerCount: number, layout: string) => {
        const updated = { ...settings.customLayouts, [playerCount]: layout };
        onUpdateSetting('customLayouts', updated);
    };

    const handleDeleteLayout = (playerCount: number) => {
        const updated = { ...settings.customLayouts };
        delete updated[playerCount];
        onUpdateSetting('customLayouts', updated);
    };

    const handleAddLayout = () => {
        const count = parseInt(newPlayerCount);
        if (!isNaN(count) && count > 0 && newLayoutStr.trim() !== '') {
            handleUpdateLayout(count, newLayoutStr.trim());
            setNewPlayerCount('');
            setNewLayoutStr('');
        }
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>Game Settings</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                
                <Box>
                    <Typography variant="subtitle2" gutterBottom>Custom Layouts per Player Count</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Define rows and columns (e.g., '1.3' for 1 top, 3 bottom). Missing counts use auto.
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1 }}>
                        {Object.entries(settings.customLayouts || {}).map(([countStr, layout]) => {
                            const count = parseInt(countStr);
                            return (
                                <Box key={count} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography sx={{ width: 80 }}>{count} Players:</Typography>
                                    <TextField 
                                        size="small" 
                                        value={layout} 
                                        onChange={(e) => handleUpdateLayout(count, e.target.value)}
                                        sx={{ flex: 1 }}
                                    />
                                    <IconButton size="small" color="error" onClick={() => handleDeleteLayout(count)}>
                                        <Typography variant="body2">✕</Typography>
                                    </IconButton>
                                </Box>
                            );
                        })}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TextField 
                            size="small" 
                            label="Players" 
                            type="number" 
                            value={newPlayerCount} 
                            onChange={(e) => setNewPlayerCount(e.target.value)} 
                            sx={{ width: 120 }}
                        />
                        <TextField 
                            size="small" 
                            label="Layout (e.g. 2.2)" 
                            value={newLayoutStr} 
                            onChange={(e) => setNewLayoutStr(e.target.value)} 
                            sx={{ flex: 1 }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAddLayout();
                                }
                            }}
                        />
                        <Button variant="contained" size="small" onClick={handleAddLayout}>Add</Button>
                    </Box>
                </Box>

                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Default View Mode</Typography>
                    <ToggleButtonGroup
                        value={settings.defaultViewMode || 'list'}
                        exclusive
                        onChange={(_, newVal) => newVal && onUpdateSetting('defaultViewMode', newVal)}
                        aria-label="default view mode"
                        size="small"
                        fullWidth
                        sx={{
                            borderRadius: 50,
                            '& .MuiToggleButton-root': {
                                borderRadius: 50,
                                border: '1px solid rgba(255, 255, 255, 0.23)',
                                '&.Mui-selected': {
                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                    color: 'white',
                                    borderColor: 'white'
                                }
                            }
                        }}
                    >
                        <ToggleButton value="list">List View</ToggleButton>
                        <ToggleButton value="grid">Grid View</ToggleButton>
                    </ToggleButtonGroup>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Preferred song list layout on startup.
                    </Typography>
                </Box>

                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Default Click Action (When playing)</Typography>
                    <ToggleButtonGroup
                        value={settings.defaultSongClickAction}
                        exclusive
                        onChange={(_, newVal) => newVal && onUpdateSetting('defaultSongClickAction', newVal)}
                        aria-label="default click action"
                        size="small"
                        fullWidth
                        sx={{
                            borderRadius: 50,
                            '& .MuiToggleButton-root': {
                                borderRadius: 50,
                                border: '1px solid rgba(255, 255, 255, 0.23)',
                                '&.Mui-selected': {
                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                    color: 'white',
                                    borderColor: 'white'
                                }
                            }
                        }}
                    >
                        <ToggleButton value="play_now">Play Now</ToggleButton>
                        <ToggleButton value="play_next">Play Next</ToggleButton>
                        <ToggleButton value="add_end">Add to Queue</ToggleButton>
                    </ToggleButtonGroup>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        What happens when you click a song while another is already playing.
                    </Typography>
                </Box>

                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Card Size & Density</Typography>
                    <ToggleButtonGroup
                        value={settings.cardSize}
                        exclusive
                        onChange={(_, newVal) => newVal && onUpdateSetting('cardSize', newVal)}
                        aria-label="card size"
                        size="small"
                        fullWidth
                        sx={{
                            borderRadius: 50,
                            '& .MuiToggleButton-root': {
                                borderRadius: 50,
                                border: '1px solid rgba(255, 255, 255, 0.23)',
                                '&.Mui-selected': {
                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                    color: 'white',
                                    borderColor: 'white'
                                }
                            }
                        }}
                    >
                        <ToggleButton value="small">Small</ToggleButton>
                        <ToggleButton value="medium">Medium</ToggleButton>
                        <ToggleButton value="large">Large</ToggleButton>
                        <ToggleButton value="custom">Custom</ToggleButton>
                    </ToggleButtonGroup>

                    {settings.cardSize === 'custom' && (
                        <Box sx={{ mt: 2 }}>
                            <Typography gutterBottom>Max Items per Row (Large Screen): {settings.customTarget}</Typography>
                            <Slider
                                value={settings.customTarget}
                                onChange={(_, val) => onUpdateSetting('customTarget', val as number)}
                                min={1}
                                max={12}
                                step={1}
                                marks
                                valueLabelDisplay="auto"
                                sx={{ width: '100%' }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                Set the maximum number of songs in a row. The game will automatically adjust for smaller screens.
                            </Typography>
                        </Box>
                    )}
                </Box>


                <Box sx={{ mt: 2 }}>
                    <Typography gutterBottom>Golden Note Multiplier: {settings.goldenNoteMultiplier}x</Typography>
                    <Slider
                        value={settings.goldenNoteMultiplier}
                        onChange={(_, val) => onUpdateSetting('goldenNoteMultiplier', val as number)}
                        min={1.0}
                        max={5.0}
                        step={0.5}
                        marks
                        valueLabelDisplay="auto"
                        sx={{ width: '100%' }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Multiplier for golden notes (marked with *).
                    </Typography>
                </Box>

                <Box sx={{ mt: 2 }}>
                    <Typography gutterBottom>Song Volume: {Math.round(settings.songVolume * 100)}%</Typography>
                    <Slider
                        value={settings.songVolume * 100}
                        onChange={(_, val) => onUpdateSetting('songVolume', (val as number) / 100)}
                        min={0}
                        max={100}
                        sx={{ width: '100%' }}
                    />
                </Box>

                <Box sx={{ mt: 1 }}>
                    <Typography gutterBottom>Vocals Volume (If Separated): {Math.round((settings.vocalsVolume ?? 1.0) * 100)}%</Typography>
                    <Slider
                        value={(settings.vocalsVolume ?? 1.0) * 100}
                        onChange={(_, val) => onUpdateSetting('vocalsVolume', (val as number) / 100)}
                        min={0}
                        max={100}
                        sx={{ width: '100%' }}
                    />
                </Box>

                <Box sx={{ mt: 1 }}>
                    <Typography gutterBottom>Master Volume: {Math.round(settings.masterVolume * 100)}%</Typography>
                    <Slider
                        value={settings.masterVolume * 100}
                        onChange={(_, val) => onUpdateSetting('masterVolume', (val as number) / 100)}
                        min={0}
                        max={100}
                        sx={{ width: '100%' }}
                    />
                </Box>

                <FormControlLabel
                    control={<Switch checked={settings.showDebugOverlay} onChange={(e) => onUpdateSetting('showDebugOverlay', e.target.checked)} />}
                    label="Show Debug Overlay"
                />
                <FormControlLabel
                    control={<Switch checked={settings.showDevSlider} onChange={(e) => onUpdateSetting('showDevSlider', e.target.checked)} />}
                    label="Show Tech/Dev Slider"
                />
                <FormControlLabel
                    control={<Switch checked={settings.showMicStatus} onChange={(e) => onUpdateSetting('showMicStatus', e.target.checked)} />}
                    label="Show Mic Status"
                />
                <FormControlLabel
                    control={<Switch checked={settings.showNoteLabels} onChange={(e) => onUpdateSetting('showNoteLabels', e.target.checked)} />}
                    label="Show Pitch Note Labels"
                />
                <FormControlLabel
                    control={<Switch checked={settings.showVideoErrors} onChange={(e) => onUpdateSetting('showVideoErrors', e.target.checked)} />}
                    label="Show Video Error Messages"
                />
            </Box>
        </Box>
    );
};
