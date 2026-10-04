/**
 * Floating action bar for multi-selected widgets [ID: GAME-TABLETOP-SELECTION-BAR]
 */
import React from 'react';
import { Paper, Chip, IconButton, Tooltip, Divider } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';

interface SelectionFloatingBarProps {
  selectedCount: number;
  onScaleUp: () => void;
  onScaleDown: () => void;
  onResetScale: () => void;
  onClearSelection: () => void;
}

export const SelectionFloatingBar: React.FC<SelectionFloatingBarProps> = ({
  selectedCount,
  onScaleUp,
  onScaleDown,
  onResetScale,
  onClearSelection,
}) => {
  const { t } = useTranslation();

  if (selectedCount === 0) return null;

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'absolute',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        borderRadius: 4,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'primary.main',
        px: 1.5,
        py: 0.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        zIndex: 1100,
        boxShadow: '0 8px 32px rgba(0, 229, 255, 0.25)',
      }}
    >
      <Chip
        label={t('games.tabletop.selectedCount', '{{count}} markiert', { count: selectedCount })}
        size="small"
        color="primary"
        variant="filled"
        sx={{ fontWeight: 'bold' }}
      />

      <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />

      <Tooltip title={t('games.tabletop.scaleUp', 'Vergrößern (+25%)')}>
        <IconButton size="small" onClick={onScaleUp} color="primary">
          <ZoomInIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Tooltip title={t('games.tabletop.scaleDown', 'Verkleinern (-20%)')}>
        <IconButton size="small" onClick={onScaleDown}>
          <ZoomOutIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Tooltip title={t('games.tabletop.resetScale', 'Originalgröße (100%)')}>
        <IconButton size="small" onClick={onResetScale}>
          <RestartAltIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />

      <Tooltip title={t('games.tabletop.clearSelection', 'Auswahl aufheben')}>
        <IconButton size="small" onClick={onClearSelection}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Paper>
  );
};
