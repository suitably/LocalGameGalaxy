/**
 * Floating canvas tools: selection mode, hidden zone, zoom and fit [ID: GAME-TABLETOP-TOOLBAR]
 *
 * The rules and the game menu are in the header (`TableGameMenu`).
 */
import React from 'react';
import { Paper, Tooltip, IconButton } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomInRounded';
import ZoomOutIcon from '@mui/icons-material/ZoomOutRounded';
import RestartAltIcon from '@mui/icons-material/RestartAltRounded';
import HighlightAltIcon from '@mui/icons-material/HighlightAltRounded';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffRounded';
import { Divider } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface TabletopToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  isSelectionMode?: boolean;
  onToggleSelectionMode?: () => void;
  onAddHiddenZone?: () => void;
  /** Edit mode: keep clear of the widget inspector (320 px wide, right edge) on wider screens. */
  besideInspector?: boolean;
}

export const TabletopToolbar: React.FC<TabletopToolbarProps> = ({
  onZoomIn,
  onZoomOut,
  onResetView,
  isSelectionMode = false,
  onToggleSelectionMode,
  onAddHiddenZone,
  besideInspector = false,
}) => {
  const { t } = useTranslation();

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'absolute',
        bottom: 20,
        right: besideInspector ? { xs: 20, sm: 344 } : 20,
        borderRadius: 3,
        bgcolor: 'background.paper',
        p: 0.5,
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        zIndex: 1000,
      }}
    >
      {onToggleSelectionMode && (
        <Tooltip
          title={
            isSelectionMode
              ? t('games.tabletop.selectionModeActive')
              : t('games.tabletop.selectionMode')
          }
        >
          <IconButton
            size="small"
            onClick={onToggleSelectionMode}
            color={isSelectionMode ? 'primary' : 'default'}
          >
            <HighlightAltIcon />
          </IconButton>
        </Tooltip>
      )}

      {onAddHiddenZone && (
        <Tooltip title={t('games.tabletop.addHiddenZone')}>
          <IconButton size="small" onClick={onAddHiddenZone}>
            <VisibilityOffIcon />
          </IconButton>
        </Tooltip>
      )}

      {(onToggleSelectionMode || onAddHiddenZone) && (
        <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
      )}

      <Tooltip title={t('games.tabletop.zoomIn')}>
        <IconButton size="small" onClick={onZoomIn}>
          <ZoomInIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title={t('games.tabletop.zoomOut')}>
        <IconButton size="small" onClick={onZoomOut}>
          <ZoomOutIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title={t('games.tabletop.resetView')}>
        <IconButton size="small" onClick={onResetView}>
          <RestartAltIcon />
        </IconButton>
      </Tooltip>
    </Paper>
  );
};
