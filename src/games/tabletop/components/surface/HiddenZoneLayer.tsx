/**
 * Layer rendering Hidden Zones (Fog of War) over the table [ID: GAME-TABLETOP-HIDDEN-ZONE-LAYER]
 */
import React, { useState } from 'react';
import { Box, Typography, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { HiddenZone } from '../../logic/types';
import { useTranslation } from 'react-i18next';

interface HiddenZoneLayerProps {
  hiddenZones?: Record<string, HiddenZone>;
  currentSeatIndex?: number;
  onToggleReveal: (zoneId: string) => void;
  onRemoveZone: (zoneId: string) => void;
}

export const HiddenZoneLayer: React.FC<HiddenZoneLayerProps> = ({
  hiddenZones,
  currentSeatIndex,
  onToggleReveal,
  onRemoveZone,
}) => {
  const { t } = useTranslation();
  const [menuAnchor, setMenuAnchor] = useState<{ mouseX: number; mouseY: number; zoneId: string } | null>(null);

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

        const isRevealed = Boolean(zone.revealed);
        const zoneColor = zone.color || '#212121';

        return (
          <Box
            key={zone.id}
            onContextMenu={(e) => handleContextMenu(e, zone.id)}
            sx={{
              position: 'absolute',
              left: zone.x,
              top: zone.y,
              width: zone.width,
              height: zone.height,
              zIndex: isOwner || isRevealed ? 4000 : 9000,
              bgcolor: isRevealed
                ? 'rgba(0, 0, 0, 0.1)'
                : isOwner
                  ? `${zoneColor}33`
                  : zoneColor,
              border: '2px dashed',
              borderColor: isRevealed ? '#4caf50' : zoneColor,
              borderRadius: 2,
              boxShadow: isRevealed
                ? '0 0 15px rgba(76, 175, 80, 0.4)'
                : isOwner
                  ? '0 0 15px rgba(0, 0, 0, 0.3)'
                  : '0 8px 30px rgba(0, 0, 0, 0.85)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'auto',
              cursor: 'context-menu',
              userSelect: 'none',
              transition: 'background-color 0.2s, border-color 0.2s',
            }}
          >
            <Box
              sx={{
                bgcolor: 'rgba(0,0,0,0.7)',
                color: '#fff',
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              {isRevealed ? (
                <>
                  <VisibilityIcon fontSize="small" sx={{ color: '#4caf50' }} />
                  <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                    {zone.label || t('games.tabletop.zoneRevealed', 'Aufgedeckt')}
                  </Typography>
                </>
              ) : isOwner ? (
                <>
                  <VisibilityIcon fontSize="small" sx={{ color: '#90caf9' }} />
                  <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                    {zone.label || t('games.tabletop.zoneOwnerView', 'Verdeckt (Deine Sicht)')}
                  </Typography>
                </>
              ) : (
                <>
                  <VisibilityOffIcon fontSize="small" sx={{ color: '#ff9800' }} />
                  <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                    {zone.label || t('games.tabletop.zoneHidden', 'Verdeckter Bereich')}
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        );
      })}

      <Menu
        open={menuAnchor !== null}
        onClose={() => setMenuAnchor(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          menuAnchor !== null
            ? { top: menuAnchor.mouseY, left: menuAnchor.mouseX }
            : undefined
        }
      >
        {activeZone && (
          <MenuItem
            onClick={() => {
              if (activeZone) onToggleReveal(activeZone.id);
              setMenuAnchor(null);
            }}
          >
            <ListItemIcon>
              {activeZone.revealed ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
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
              if (activeZone) onRemoveZone(activeZone.id);
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
