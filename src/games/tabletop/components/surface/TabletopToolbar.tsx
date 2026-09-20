/**
 * Floating toolbar for Tabletop zoom, reset, and rules controls [ID: GAME-TABLETOP-TOOLBAR]
 */
import React from 'react';
import { Paper, Tooltip, IconButton } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useTranslation } from 'react-i18next';

interface TabletopToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onOpenRules?: () => void;
  hasRules?: boolean;
}

export const TabletopToolbar: React.FC<TabletopToolbarProps> = ({
  onZoomIn,
  onZoomOut,
  onResetView,
  onOpenRules,
  hasRules = false,
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
        gap: 0.5,
        zIndex: 1000,
      }}
    >
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
