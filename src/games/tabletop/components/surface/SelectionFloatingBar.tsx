/**
 * Floating action bar for multi-selected widgets [ID: GAME-TABLETOP-SELECTION-BAR]
 */
import React from 'react';
import { alpha, Paper, Chip, IconButton, Tooltip, Divider } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomInRounded';
import ZoomOutIcon from '@mui/icons-material/ZoomOutRounded';
import RestartAltIcon from '@mui/icons-material/RestartAltRounded';
import CloseIcon from '@mui/icons-material/CloseRounded';
import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardRounded';
import ArrowUpIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownIcon from '@mui/icons-material/ArrowDownwardRounded';
import FlipIcon from '@mui/icons-material/FlipRounded';
import RotateIcon from '@mui/icons-material/RotateRightRounded';
import DeleteIcon from '@mui/icons-material/DeleteOutlineRounded';
import { useTranslation } from 'react-i18next';
import type { useTabletopSelection } from '../../hooks/useTabletopSelection';

interface SelectionFloatingBarProps {
  selection: ReturnType<typeof useTabletopSelection>;
  /** Host only; phones omit it, since the host rejects their deletes (#685). */
  canDelete: boolean;
  /** Distance from the table's top edge; the editor puts the bar below its toolbar. */
  top?: number;
}

/** Distance of one nudge, in table pixels. */
export const MOVE_STEP = 40;
const ARROWS = [
  { key: 'moveLeft', label: 'Nach links', Icon: ArrowBackIcon, dx: -1, dy: 0 },
  { key: 'moveUp', label: 'Nach oben', Icon: ArrowUpIcon, dx: 0, dy: -1 },
  { key: 'moveDown', label: 'Nach unten', Icon: ArrowDownIcon, dx: 0, dy: 1 },
  { key: 'moveRight', label: 'Nach rechts', Icon: ArrowForwardIcon, dx: 1, dy: 0 },
] as const;

export const SelectionFloatingBar: React.FC<SelectionFloatingBarProps> = ({
  selection,
  canDelete,
  top = 20,
}) => {
  const selectedCount = selection.selectedWidgetIds.length;
  const { t } = useTranslation();

  if (selectedCount === 0) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'absolute',
        top,
        // centred over the full width (left: 50% would cap the bar at half the table and wrap it)
        left: 0,
        right: 0,
        mx: 'auto',
        width: 'fit-content',
        borderRadius: 5,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'primary.main',
        px: 1.5,
        py: 0.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: 'calc(100% - 24px)',
        zIndex: 1100,
        boxShadow: (theme) => `0 8px 32px ${alpha(theme.palette.secondary.main, 0.25)}`,
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
        <IconButton size="small" onClick={() => selection.scaleSelected(1.25)} color="primary">
          <ZoomInIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Tooltip title={t('games.tabletop.scaleDown', 'Verkleinern (-20%)')}>
        <IconButton size="small" onClick={() => selection.scaleSelected(0.8)}>
          <ZoomOutIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Tooltip title={t('games.tabletop.resetScale', 'Originalgröße (100%)')}>
        <IconButton size="small" onClick={selection.resetScaleSelected}>
          <RestartAltIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />

      {ARROWS.map(({ key, label, Icon, dx, dy }) => (
        <Tooltip key={key} title={t(`games.tabletop.${key}`, label)}>
          <IconButton
            size="small"
            onClick={() => selection.moveSelected(dx * MOVE_STEP, dy * MOVE_STEP)}
          >
            <Icon fontSize="small" />
          </IconButton>
        </Tooltip>
      ))}

      <Tooltip title={t('games.tabletop.flipSelected', 'Karten umdrehen')}>
        <IconButton size="small" onClick={selection.flipSelected}>
          <FlipIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Tooltip title={t('games.tabletop.rotateSelected', 'Drehen (+90°)')}>
        <IconButton size="small" onClick={() => selection.rotateSelected(90)}>
          <RotateIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {canDelete && (
        <Tooltip title={t('games.tabletop.deleteSelected', 'Auswahl löschen')}>
          <IconButton size="small" onClick={selection.deleteSelected} color="error">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />

      <Tooltip title={t('games.tabletop.clearSelection', 'Auswahl aufheben')}>
        <IconButton size="small" onClick={selection.clearSelection}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Paper>
  );
};
