/**
 * Floating toolbar for Tabletop zoom, reset, and rules controls [ID: GAME-TABLETOP-TOOLBAR]
 */
import React from 'react';
import { Paper, Tooltip, IconButton } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import HighlightAltIcon from '@mui/icons-material/HighlightAlt';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { Divider } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface TabletopToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onOpenRules?: () => void;
  hasRules?: boolean;
  isSelectionMode?: boolean;
  onToggleSelectionMode?: () => void;
  onAddHiddenZone?: () => void;
}

export const TabletopToolbar: React.FC<TabletopToolbarProps> = ({
  onZoomIn,
  onZoomOut,
  onResetView,
  onOpenRules,
  hasRules = false,
  isSelectionMode = false,
  onToggleSelectionMode,
  onAddHiddenZone,
}) => {
  const { t } = useTranslation();

  return (
    <Paper
      elevation={4}
      sx={{
        position: 'absolute',
        bottom: 20,
        right: 20,
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
        <Tooltip title={isSelectionMode ? t('games.tabletop.selectionModeActive', 'Auswahl-Modus beenden') : t('games.tabletop.selectionMode', 'Mehrfachauswahl (Klick zum Auswählen)')}>
          <IconButton size="small" onClick={onToggleSelectionMode} color={isSelectionMode ? 'primary' : 'default'}>
            <HighlightAltIcon />
          </IconButton>
        </Tooltip>
      )}

      {onAddHiddenZone && (
        <Tooltip title={t('games.tabletop.addHiddenZone', 'Verdeckten Bereich anlegen')}>
          <IconButton size="small" onClick={onAddHiddenZone}>
            <VisibilityOffIcon />
          </IconButton>
        </Tooltip>
      )}

      {(onToggleSelectionMode || onAddHiddenZone) && (
        <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
      )}

      {hasRules && onOpenRules && (
        <Tooltip title={t('games.tabletop.rulesButton', 'Regeln')}>
          <IconButton size="small" onClick={onOpenRules} color="primary">
            <MenuBookIcon />
          </IconButton>
        </Tooltip>
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
