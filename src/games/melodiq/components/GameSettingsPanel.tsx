import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box, Typography, TextField, Switch, FormControlLabel, Slider, ToggleButton, ToggleButtonGroup, IconButton, Button,
    Accordion, AccordionSummary, AccordionDetails, Select, MenuItem, InputLabel, FormControl
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { SettingsState } from '../hooks/SettingsContext';

interface GameSettingsPanelProps {
    settings: SettingsState;
    onUpdateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}

export const GameSettingsPanel: React.FC<GameSettingsPanelProps> = ({
    settings,
    onUpdateSetting
}) => {
    const { t } = useTranslation();
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
            <Typography variant="h6" gutterBottom>{t('melodiq.settings_panel.title')}</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                
                <Box>
                    <Typography variant="subtitle2" gutterBottom>{t('melodiq.settings_panel.custom_layouts')}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        {t('melodiq.settings_panel.custom_layouts_desc')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1 }}>
                        {Object.entries(settings.customLayouts || {}).map(([countStr, layout]) => {
                            const count = parseInt(countStr);
                            return (
                                <Box key={count} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography sx={{ width: 80 }}>{count} {t('melodiq.settings_panel.players')}:</Typography>
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
                            label={t('melodiq.settings_panel.players')} 
                            type="number" 
                            value={newPlayerCount} 
                            onChange={(e) => setNewPlayerCount(e.target.value)} 
                            sx={{ width: 120 }}
                        />
                        <TextField 
                            size="small" 
                            label={t('melodiq.settings_panel.layout_example')} 
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
                        <Button variant="contained" size="small" onClick={handleAddLayout}>{t('melodiq.settings_panel.add')}</Button>
                    </Box>
                </Box>

                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>{t('melodiq.settings_panel.default_view')}</Typography>
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
                        <ToggleButton value="list">{t('melodiq.settings_panel.list_view')}</ToggleButton>
                        <ToggleButton value="grid">{t('melodiq.settings_panel.grid_view')}</ToggleButton>
                    </ToggleButtonGroup>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {t('melodiq.settings_panel.default_view_desc')}
                    </Typography>
                </Box>

                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>{t('melodiq.settings_panel.autoplay')}</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>{t('melodiq.settings_panel.autoplay_no_singers')}</InputLabel>
                            <Select
                                value={settings.autoplayNoPlayersDelay}
                                label="{t('melodiq.settings_panel.autoplay_no_singers')}"
                                onChange={(e) => onUpdateSetting('autoplayNoPlayersDelay', e.target.value as number)}
                                sx={{ borderRadius: 2 }}
                            >
                                <MenuItem value={0}>{t('melodiq.settings_panel.off_manual')}</MenuItem>
                                <MenuItem value={5}>{t('melodiq.settings_panel.seconds', { count: 5 })}</MenuItem>
                                <MenuItem value={10}>{t('melodiq.settings_panel.seconds', { count: 10 })}</MenuItem>
                                <MenuItem value={15}>{t('melodiq.settings_panel.seconds', { count: 15 })}</MenuItem>
                                <MenuItem value={30}>{t('melodiq.settings_panel.seconds', { count: 30 })}</MenuItem>
                            </Select>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                {t('melodiq.settings_panel.autoplay_no_singers_desc')}
                            </Typography>
                        </FormControl>

                        <FormControl size="small" fullWidth>
                            <InputLabel>{t('melodiq.settings_panel.autoplay_singers')}</InputLabel>
                            <Select
                                value={settings.autoplayWithPlayersDelay}
                                label="{t('melodiq.settings_panel.autoplay_singers')}"
                                onChange={(e) => onUpdateSetting('autoplayWithPlayersDelay', e.target.value as number)}
                                sx={{ borderRadius: 2 }}
                            >
                                <MenuItem value={0}>{t('melodiq.settings_panel.off_manual')}</MenuItem>
                                <MenuItem value={10}>{t('melodiq.settings_panel.seconds', { count: 10 })}</MenuItem>
                                <MenuItem value={20}>{t('melodiq.settings_panel.seconds', { count: 20 })}</MenuItem>
                                <MenuItem value={30}>{t('melodiq.settings_panel.seconds', { count: 30 })}</MenuItem>
                                <MenuItem value={60}>{t('melodiq.settings_panel.seconds', { count: 60 })}</MenuItem>
                            </Select>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                {t('melodiq.settings_panel.autoplay_singers_desc')}
                            </Typography>
                        </FormControl>
                    </Box>
                </Box>

                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>{t('melodiq.settings_panel.default_click')}</Typography>
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
                        <ToggleButton value="play_now">{t('melodiq.settings_panel.play_now')}</ToggleButton>
                        <ToggleButton value="play_next">{t('melodiq.settings_panel.play_next')}</ToggleButton>
                        <ToggleButton value="add_end">{t('melodiq.settings_panel.add_queue')}</ToggleButton>
                    </ToggleButtonGroup>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {t('melodiq.settings_panel.default_click_desc')}
                    </Typography>
                </Box>

                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>{t('melodiq.settings_panel.card_size')}</Typography>
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
                        <ToggleButton value="small">{t('melodiq.settings_panel.small')}</ToggleButton>
                        <ToggleButton value="medium">{t('melodiq.settings_panel.medium')}</ToggleButton>
                        <ToggleButton value="large">{t('melodiq.settings_panel.large')}</ToggleButton>
                        <ToggleButton value="custom">{t('melodiq.settings_panel.custom')}</ToggleButton>
                    </ToggleButtonGroup>

                    {settings.cardSize === 'custom' && (
                        <Box sx={{ mt: 2 }}>
                            <Typography gutterBottom>{t('melodiq.settings_panel.max_items')}: {settings.customTarget}</Typography>
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
                                {t('melodiq.settings_panel.max_items_desc')}
                            </Typography>
                        </Box>
                    )}
                </Box>


                <Box sx={{ mt: 2 }}>
                    <Typography gutterBottom>{t('melodiq.settings_panel.golden_multiplier')}: {settings.goldenNoteMultiplier}x</Typography>
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
                        {t('melodiq.settings_panel.golden_multiplier_desc')}
                    </Typography>
                </Box>

                <Box sx={{ mt: 2 }}>
                    <Typography gutterBottom>{t('melodiq.settings_panel.lyrics_scale', 'Lyrics Size')}: {Math.round((settings.lyricsScale ?? 1.0) * 100)}%</Typography>
                    <Slider
                        value={settings.lyricsScale ?? 1.0}
                        onChange={(_, val) => onUpdateSetting('lyricsScale', val as number)}
                        min={0.5}
                        max={3.0}
                        step={0.1}
                        marks
                        valueLabelDisplay="auto"
                        sx={{ width: '100%' }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {t('melodiq.settings_panel.lyrics_scale_desc', 'Adjust the size of the lyrics on the main screen.')}
                    </Typography>
                </Box>

                <Box sx={{ mt: 2 }}>
                    <Typography gutterBottom>{t('melodiq.settings_panel.song_volume')}: {Math.round(settings.songVolume * 100)}%</Typography>
                    <Slider
                        value={settings.songVolume * 100}
                        onChange={(_, val) => onUpdateSetting('songVolume', (val as number) / 100)}
                        min={0}
                        max={100}
                        sx={{ width: '100%' }}
                    />
                </Box>

                <Box sx={{ mt: 1 }}>
                    <Typography gutterBottom>{t('melodiq.settings_panel.vocals_volume')}: {Math.round((settings.vocalsVolume ?? 1.0) * 100)}%</Typography>
                    <Slider
                        value={(settings.vocalsVolume ?? 1.0) * 100}
                        onChange={(_, val) => onUpdateSetting('vocalsVolume', (val as number) / 100)}
                        min={0}
                        max={100}
                        sx={{ width: '100%' }}
                    />
                </Box>

                <Box sx={{ mt: 1 }}>
                    <Typography gutterBottom>{t('melodiq.settings_panel.master_volume')}: {Math.round(settings.masterVolume * 100)}%</Typography>
                    <Slider
                        value={settings.masterVolume * 100}
                        onChange={(_, val) => onUpdateSetting('masterVolume', (val as number) / 100)}
                        min={0}
                        max={100}
                        sx={{ width: '100%' }}
                    />
                </Box>

                <FormControlLabel
                    control={<Switch checked={settings.hideBackgroundVideo} onChange={(e) => onUpdateSetting('hideBackgroundVideo', e.target.checked)} />}
                    label={t('melodiq.settings_panel.hide_video', 'Hide Background Video')}
                />

                <Box sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                        <TextField
                            size="small"
                            fullWidth
                            label={t('melodiq.settings_panel.fallback_background_url', 'Fallback Background URL')}
                            value={settings.fallbackBackgroundUrl || ''}
                            onChange={(e) => onUpdateSetting('fallbackBackgroundUrl', e.target.value)}
                            placeholder="e.g. https://example.com/loop.mp4"
                        />
                        <Button variant="outlined" component="label" sx={{ height: 40, whiteSpace: 'nowrap' }}>
                            {t('melodiq.settings_panel.browse', 'Browse...')}
                            <input
                                type="file"
                                hidden
                                accept="image/*,video/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const url = URL.createObjectURL(file);
                                        // We append the extension as a query param or hash so the player knows what it is
                                        // But actually the file name works if we just use a fake hash for type hinting
                                        const fakeHash = file.type.startsWith('video/') ? '#video.mp4' : '#image.jpg';
                                        onUpdateSetting('fallbackBackgroundUrl', url + fakeHash);
                                    }
                                    e.target.value = '';
                                }}
                            />
                        </Button>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {t('melodiq.settings_panel.fallback_background_desc', 'Shown when a song has no video. Use a web link or select a local file (local files may reset after reload).')}
                    </Typography>
                </Box>

                <FormControlLabel
                    control={<Switch checked={settings.showNoteLabels} onChange={(e) => onUpdateSetting('showNoteLabels', e.target.checked)} />}
                    label={t('melodiq.settings_panel.show_pitch')}
                />
                <Accordion sx={{ mt: 2, bgcolor: 'rgba(255, 255, 255, 0.05)', '&:before': { display: 'none' } }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
                        <Typography variant="subtitle2">{t('melodiq.settings_panel.dev_options')}</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ display: 'flex', flexDirection: 'column' }}>
                        <FormControlLabel
                            control={<Switch checked={settings.showDebugOverlay} onChange={(e) => onUpdateSetting('showDebugOverlay', e.target.checked)} />}
                            label={t('melodiq.settings_panel.show_debug')}
                        />
                        <FormControlLabel
                            control={<Switch checked={settings.showDevSlider} onChange={(e) => onUpdateSetting('showDevSlider', e.target.checked)} />}
                            label={t('melodiq.settings_panel.show_dev_slider')}
                        />
                        <FormControlLabel
                            control={<Switch checked={settings.showVideoErrors} onChange={(e) => onUpdateSetting('showVideoErrors', e.target.checked)} />}
                            label={t('melodiq.settings_panel.show_video_errors')}
                        />
                    </AccordionDetails>
                </Accordion>
            </Box>
        </Box>
    );
};
