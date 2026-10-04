import React from 'react';
import { Box, Typography, ToggleButtonGroup, ToggleButton, Stack } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import { useTranslation } from 'react-i18next';
import type { MelodiqNotesViewMode, PlayMode } from '../types';

interface GameplaySettingsSectionProps {
    viewMode: MelodiqNotesViewMode;
    onViewModeChange: (mode: MelodiqNotesViewMode) => void;
    sheetRenderMode: 'horizontal' | 'vertical';
    onSheetRenderModeChange: (mode: 'horizontal' | 'vertical') => void;
    playMode: PlayMode;
    onPlayModeChange: (mode: PlayMode) => void;
}

export const GameplaySettingsSection: React.FC<GameplaySettingsSectionProps> = ({
    viewMode,
    onViewModeChange,
    sheetRenderMode,
    onSheetRenderModeChange,
    playMode,
    onPlayModeChange,
}) => {
    const { t } = useTranslation();

    return (
        <Stack spacing={2.5}>
            {/* View Mode */}
            <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', mb: 1 }}>
                    {t('games.melodiq_notes.view_mode', 'Ansichtsmodus')}
                </Typography>
                <ToggleButtonGroup
                    fullWidth
                    size="small"
                    value={viewMode}
                    exclusive
                    onChange={(_, val) => val && onViewModeChange(val as MelodiqNotesViewMode)}
                >
                    <ToggleButton value="classic" sx={{ py: 0.85 }}>
                        <MenuBookIcon sx={{ mr: 1, fontSize: 18 }} />
                        {t('games.melodiq_notes.view_classic', 'Notenblatt')}
                    </ToggleButton>
                    <ToggleButton value="modern" sx={{ py: 0.85 }}>
                        <ElectricBoltIcon sx={{ mr: 1, fontSize: 18, color: '#f59e0b' }} />
                        {t('games.melodiq_notes.view_modern', 'Modern (Highway)')}
                    </ToggleButton>
                </ToggleButtonGroup>

                {viewMode === 'classic' && (
                    <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                            {t('games.melodiq_notes.sheet_render_mode', 'Notenblatt-Darstellung')}:
                        </Typography>
                        <ToggleButtonGroup
                            fullWidth
                            size="small"
                            value={sheetRenderMode}
                            exclusive
                            onChange={(_, val) => val && onSheetRenderModeChange(val as 'horizontal' | 'vertical')}
                        >
                            <ToggleButton value="horizontal" sx={{ py: 0.75, fontSize: '0.78rem' }}>
                                <ViewWeekIcon sx={{ mr: 1, fontSize: 16 }} />
                                {t('games.melodiq_notes.render_mode_horizontal', 'Horizontales Band')}
                            </ToggleButton>
                            <ToggleButton value="vertical" sx={{ py: 0.75, fontSize: '0.78rem' }}>
                                <ViewStreamIcon sx={{ mr: 1, fontSize: 16 }} />
                                {t('games.melodiq_notes.render_mode_vertical', 'Vertikaler Score')}
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                )}
            </Box>

            {/* Play Mode */}
            <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', mb: 1 }}>
                    {t('games.melodiq_notes.mode', 'Übungsmodus')}
                </Typography>
                <ToggleButtonGroup
                    fullWidth
                    size="small"
                    value={playMode}
                    exclusive
                    onChange={(_, val) => val && onPlayModeChange(val as PlayMode)}
                >
                    <ToggleButton value="continuous" sx={{ py: 0.75 }}>
                        {t('games.melodiq_notes.continuous_mode', 'Kontinuierlich')}
                    </ToggleButton>
                    <ToggleButton value="wait" sx={{ py: 0.75 }}>
                        {t('games.melodiq_notes.wait_mode', 'Auf Treffer warten')}
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>
        </Stack>
    );
};
