import React from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import { useTranslation } from 'react-i18next';

interface SheetViewerControlsProps {
    currentZoom: number;
    onZoom: (delta: number) => void;
    onResetZoom: () => void;
    renderMode: 'horizontal' | 'vertical';
    onToggleRenderMode: () => void;
    isMobile: boolean;
}

export const SheetViewerControls: React.FC<SheetViewerControlsProps> = ({
    currentZoom,
    onZoom,
    onResetZoom,
    renderMode,
    onToggleRenderMode,
    isMobile,
}) => {
    const { t } = useTranslation();

    return (
        <Box
            sx={{
                position: 'absolute',
                top: 10,
                right: 10,
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                bgcolor: 'rgba(15, 17, 26, 0.82)',
                backdropFilter: 'blur(8px)',
                borderRadius: 2,
                p: 0.5,
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            }}
        >
            <Tooltip
                title={
                    renderMode === 'horizontal'
                        ? t('games.melodiq_notes.render_mode_vertical', 'Vertikale Noten')
                        : t('games.melodiq_notes.render_mode_horizontal', 'Horizontales Band')
                }
            >
                <IconButton
                    size="small"
                    onClick={onToggleRenderMode}
                    sx={{
                        color: renderMode === 'horizontal' ? 'primary.light' : '#ffffff',
                        bgcolor: renderMode === 'horizontal' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                    }}
                >
                    {renderMode === 'horizontal' ? <ViewWeekIcon fontSize="small" /> : <ViewStreamIcon fontSize="small" />}
                </IconButton>
            </Tooltip>

            {!isMobile && (
                <>
                    <Tooltip title={t('games.melodiq_notes.zoom_out', 'Verkleinern')}>
                        <IconButton size="small" onClick={() => onZoom(-0.1)} sx={{ color: '#fff' }}>
                            <ZoomOutIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Typography variant="caption" sx={{ color: '#fff', px: 0.5, fontSize: '0.72rem', fontWeight: 600 }}>
                        {Math.round(currentZoom * 100)}%
                    </Typography>
                    <Tooltip title={t('games.melodiq_notes.zoom_in', 'Vergrößern')}>
                        <IconButton size="small" onClick={() => onZoom(0.1)} sx={{ color: '#fff' }}>
                            <ZoomInIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={t('games.melodiq_notes.zoom_reset', 'Reset')}>
                        <IconButton size="small" onClick={onResetZoom} sx={{ color: '#fff' }}>
                            <RestartAltIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </>
            )}
        </Box>
    );
};
