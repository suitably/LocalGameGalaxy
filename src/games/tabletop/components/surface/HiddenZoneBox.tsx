/**
 * One hidden zone on the table: overlay, visibility toggle and edit handles [ID: COMP-TABLETOP-HIDDEN-ZONE-BOX]
 *
 * The owner sees the contents through a tinted overlay and toggles `revealed` with the button in
 * the label chip. In edit mode the owner moves the zone by its chip and resizes it by the corner
 * handle; the change is previewed locally and committed as one `SET_HIDDEN_ZONE_RECT` on release,
 * so contents move along in the same undo step.
 */
import React, { useState } from 'react';
import { alpha, Box, IconButton, Tooltip, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffRounded';
import { useTranslation } from 'react-i18next';
import type { HiddenZone } from '../../logic/types';
import { DEFAULT_ZONE_COLOR, dragZoneRect, type ZoneRect } from '../../logic/hiddenZoneLogic';

interface HiddenZoneBoxProps {
  zone: HiddenZone;
  isOwner: boolean;
  /** Edit mode and allowed to change this zone. */
  editable: boolean;
  /** Current table zoom (screen pixels per table unit). */
  scale: number;
  onToggleReveal: () => void;
  onCommitRect: (rect: ZoneRect) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const HANDLE = 18;

export const HiddenZoneBox: React.FC<HiddenZoneBoxProps> = ({
  zone,
  isOwner,
  editable,
  scale,
  onToggleReveal,
  onCommitRect,
  onContextMenu,
}) => {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<ZoneRect | null>(null);
  const rect = preview ?? zone;
  const isRevealed = Boolean(zone.revealed);
  const zoneColor = zone.color || DEFAULT_ZONE_COLOR;
  // Owner and revealed zones only tint the table, so the widgets inside stay usable.
  const seeThrough = isOwner || isRevealed;

  const startDrag = (e: React.PointerEvent, mode: 'move' | 'resize') => {
    if (!editable) return;
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const unitsPerPx = 1 / (scale || 1);
    let latest: ZoneRect = zone;
    const onMove = (ev: PointerEvent) => {
      latest = dragZoneRect(
        zone,
        (ev.clientX - startX) * unitsPerPx,
        (ev.clientY - startY) * unitsPerPx,
        mode,
      );
      setPreview(latest);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setPreview(null);
      onCommitRect(latest);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const label = isRevealed
    ? zone.label || t('games.tabletop.zoneRevealed', 'Aufgedeckt')
    : isOwner
      ? zone.label || t('games.tabletop.zoneOwnerView', 'Verdeckt (Deine Sicht)')
      : zone.label || t('games.tabletop.zoneHidden', 'Verdeckter Bereich');

  return (
    <Box
      data-hidden-zone-id={zone.id}
      onContextMenu={onContextMenu}
      sx={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        zIndex: seeThrough ? 4000 : 9000,
        bgcolor: isRevealed ? 'rgba(0, 0, 0, 0.1)' : isOwner ? `${zoneColor}33` : zoneColor,
        border: '2px dashed',
        borderColor: editable ? 'secondary.main' : isRevealed ? 'success.main' : zoneColor,
        borderRadius: 2,
        boxShadow: seeThrough ? 'none' : '0 8px 30px rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        pt: 1,
        pointerEvents: seeThrough ? 'none' : 'auto',
        cursor: 'context-menu',
        userSelect: 'none',
        transition: 'background-color 0.2s, border-color 0.2s',
      }}
    >
      <Box
        onPointerDown={(e) => startDrag(e, 'move')}
        onContextMenu={onContextMenu}
        title={editable ? t('games.tabletop.zoneMove', 'Bereich verschieben') : undefined}
        sx={{
          bgcolor: 'rgba(0,0,0,0.7)',
          color: 'text.primary',
          px: 1.5,
          py: 0.5,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          pointerEvents: 'auto',
          cursor: editable ? 'move' : 'context-menu',
          touchAction: 'none',
          border: (theme) => `1px solid ${alpha(theme.palette.text.primary, 0.2)}`,
        }}
      >
        {isOwner ? (
          <Tooltip
            title={
              isRevealed
                ? t('games.tabletop.hideZone', 'Wieder verbergen')
                : t('games.tabletop.revealZone', 'Aufdecken (für alle zeigen)')
            }
          >
            <IconButton
              size="small"
              aria-pressed={isRevealed}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onToggleReveal}
              sx={{ p: 0.25, color: isRevealed ? 'success.main' : 'secondary.main' }}
            >
              {isRevealed ? (
                <VisibilityIcon fontSize="small" />
              ) : (
                <VisibilityOffIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        ) : isRevealed ? (
          <VisibilityIcon fontSize="small" sx={{ color: 'success.main' }} />
        ) : (
          <VisibilityOffIcon fontSize="small" sx={{ color: 'warning.main' }} />
        )}
        <Box>
          <Typography variant="caption" component="div" sx={{ fontWeight: 'bold' }}>
            {label}
          </Typography>
          {isOwner && (
            <Typography variant="caption" component="div" sx={{ opacity: 0.8 }}>
              {isRevealed
                ? t('games.tabletop.zoneVisibleAll', 'Für alle sichtbar')
                : t('games.tabletop.zoneVisibleOwnerOnly', 'Nur für dich sichtbar')}
            </Typography>
          )}
        </Box>
      </Box>
      {editable && (
        <Box
          role="button"
          aria-label={t('games.tabletop.zoneResize', 'Größe ändern')}
          onPointerDown={(e) => startDrag(e, 'resize')}
          sx={{
            position: 'absolute',
            right: -HANDLE / 2,
            bottom: -HANDLE / 2,
            width: HANDLE,
            height: HANDLE,
            borderRadius: 2,
            bgcolor: 'secondary.main',
            border: '2px solid',
            borderColor: 'background.default',
            boxShadow: 2,
            cursor: 'nwse-resize',
            pointerEvents: 'auto',
            touchAction: 'none',
          }}
        />
      )}
    </Box>
  );
};
