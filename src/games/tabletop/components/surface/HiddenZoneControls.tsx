/**
 * Owner controls inside a hidden zone: reveal toggle and resize handles [ID: GAME-TABLETOP-HIDDEN-ZONE-CONTROLS]
 */
import React from 'react';
import { alpha, Box, Button } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffRounded';
import { useTranslation } from 'react-i18next';
import type { ZoneCorner } from './useHiddenZoneEditing';

const HANDLE_HIT = 40;
const CORNERS: ZoneCorner[] = ['nw', 'ne', 'sw', 'se'];

interface ToggleProps {
  revealed: boolean;
  onToggle: () => void;
}

/** Eye button with a state label; its pointer-down never starts a zone drag. */
export const ZoneRevealToggle: React.FC<ToggleProps> = ({ revealed, onToggle }) => {
  const { t } = useTranslation();
  const label = revealed
    ? t('games.tabletop.zoneVisibleToAll', 'Für alle sichtbar')
    : t('games.tabletop.zoneOnlyYou', 'Nur du');
  const action = revealed
    ? t('games.tabletop.hideZone', 'Wieder verbergen')
    : t('games.tabletop.revealZone', 'Aufdecken (für alle zeigen)');
  return (
    <Button
      size="small"
      variant="contained"
      color={revealed ? 'success' : 'secondary'}
      title={action}
      aria-label={`${label}: ${action}`}
      aria-pressed={revealed}
      startIcon={revealed ? <VisibilityIcon /> : <VisibilityOffIcon />}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      sx={{ minHeight: HANDLE_HIT, minWidth: HANDLE_HIT, mt: 0.75, borderRadius: 5 }}
    >
      {label}
    </Button>
  );
};

interface HandlesProps {
  onPointerDown: (e: React.PointerEvent, corner: ZoneCorner) => void;
}

/** Four corner resize handles with 40px touch targets. */
export const ZoneResizeHandles: React.FC<HandlesProps> = ({ onPointerDown }) => (
  <>
    {CORNERS.map((corner) => (
      <Box
        key={corner}
        data-testid={`zone-handle-${corner}`}
        onPointerDown={(e) => onPointerDown(e, corner)}
        sx={{
          position: 'absolute',
          width: HANDLE_HIT,
          height: HANDLE_HIT,
          [corner.startsWith('n') ? 'top' : 'bottom']: -HANDLE_HIT / 2,
          [corner.endsWith('w') ? 'left' : 'right']: -HANDLE_HIT / 2,
          cursor: corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize',
          touchAction: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&::after': {
            content: '""',
            width: 16,
            height: 16,
            borderRadius: '50%',
            bgcolor: 'secondary.main',
            border: (theme) => `2px solid ${alpha(theme.palette.common.white, 0.9)}`,
          },
        }}
      />
    ))}
  </>
);
