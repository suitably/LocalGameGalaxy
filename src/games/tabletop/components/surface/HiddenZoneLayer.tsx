/**
 * Layer rendering Hidden Zones (Fog of War) over the table [ID: GAME-TABLETOP-HIDDEN-ZONE-LAYER]
 */
import React, { useState } from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffRounded';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineRounded';
import type { HiddenZone } from '../../logic/types';
import type { TabletopAction } from '../../logic/tabletopReducer';
import { HiddenZoneBox } from './HiddenZoneBox';
import { useTranslation } from 'react-i18next';

interface HiddenZoneLayerProps {
  hiddenZones?: Record<string, HiddenZone>;
  currentSeatIndex?: number;
  /** Edit mode: owners move and resize their zones. */
  editMode?: boolean;
  /** Current table zoom, to turn pointer movement into table units. */
  scale: number;
  dispatch: React.Dispatch<TabletopAction>;
}

export const HiddenZoneLayer: React.FC<HiddenZoneLayerProps> = ({
  hiddenZones,
  currentSeatIndex,
  editMode = false,
  scale,
  dispatch,
}) => {
  const { t } = useTranslation();
  const [menuAnchor, setMenuAnchor] = useState<{
    mouseX: number;
    mouseY: number;
    zoneId: string;
  } | null>(null);

  if (!hiddenZones || Object.keys(hiddenZones).length === 0) return null;

  const handleContextMenu = (e: React.MouseEvent, zoneId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuAnchor({
      mouseX: e.clientX,
      mouseY: e.clientY,
      zoneId,
    });
  };

  const activeZone = menuAnchor ? hiddenZones[menuAnchor.zoneId] : null;

  return (
    <>
      {Object.values(hiddenZones).map((zone) => {
        const isOwner =
          zone.ownerSeat !== undefined &&
          currentSeatIndex !== undefined &&
          zone.ownerSeat === currentSeatIndex;
        return (
          <HiddenZoneBox
            key={zone.id}
            zone={zone}
            isOwner={isOwner}
            editable={editMode && (isOwner || zone.ownerSeat === undefined)}
            scale={scale}
            onToggleReveal={() =>
              dispatch({ type: 'TOGGLE_ZONE_REVEAL', payload: { id: zone.id } })
            }
            onCommitRect={(rect) =>
              dispatch({ type: 'SET_HIDDEN_ZONE_RECT', payload: { id: zone.id, rect } })
            }
            onContextMenu={(e) => handleContextMenu(e, zone.id)}
          />
        );
      })}

      <Menu
        open={menuAnchor !== null}
        onClose={() => setMenuAnchor(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          menuAnchor !== null ? { top: menuAnchor.mouseY, left: menuAnchor.mouseX } : undefined
        }
      >
        {activeZone && (
          <MenuItem
            onClick={() => {
              if (activeZone)
                dispatch({ type: 'TOGGLE_ZONE_REVEAL', payload: { id: activeZone.id } });
              setMenuAnchor(null);
            }}
          >
            <ListItemIcon>
              {activeZone.revealed ? (
                <VisibilityOffIcon fontSize="small" />
              ) : (
                <VisibilityIcon fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText>
              {activeZone.revealed
                ? t('games.tabletop.hideZone', 'Wieder verbergen')
                : t('games.tabletop.revealZone', 'Aufdecken (für alle zeigen)')}
            </ListItemText>
          </MenuItem>
        )}
        {activeZone && (
          <MenuItem
            onClick={() => {
              if (activeZone)
                dispatch({ type: 'REMOVE_HIDDEN_ZONE', payload: { id: activeZone.id } });
              setMenuAnchor(null);
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon sx={{ color: 'error.main' }}>
              <DeleteOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('games.tabletop.deleteZone', 'Bereich löschen')}</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};
