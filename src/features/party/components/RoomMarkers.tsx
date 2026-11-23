/**
 * "Tap here" markers on a party game screen [ID: COMP-PARTY-ROOM-MARKERS]
 *
 * Header button "Show": the next tap on an element marked `data-room-target` sends a marker
 * instead of acting (a transparent layer catches the tap, so disabled controls work too). On the
 * receiving device the same element pulses until it is tapped or the marker runs out.
 */
import React, { useEffect, useState } from 'react';
import { alpha, Box, Button, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import TouchAppRoundedIcon from '@mui/icons-material/TouchAppRounded';
import { useTranslation } from 'react-i18next';
import { useHeaderLayout } from '../../../context/HeaderLayoutContext';
import { useRoomMarkers } from '../hooks/useRoomMarkers';
import { MARKER_ATTRIBUTE, markerSelector } from '../logic/roomMarkers';

interface Props {
  roomId: string;
  myId: string;
  /** Who gets the markers: the player whose turn it is, or `'all'`. */
  to: string;
}

export const RoomMarkers: React.FC<Props> = ({ roomId, myId, to }) => {
  const { t } = useTranslation();
  const { marker, pointing, setPointing, point, dismiss } = useRoomMarkers(roomId, myId, to);
  const { setCustomHeaderActions } = useHeaderLayout();
  const label = t('party.marker.show');

  useEffect(() => {
    setCustomHeaderActions(
      <Tooltip title={label}>
        <IconButton
          aria-label={label}
          aria-pressed={pointing}
          color={pointing ? 'warning' : 'inherit'}
          onClick={() => setPointing(!pointing)}
          sx={{ width: 44, height: 44 }}
        >
          <TouchAppRoundedIcon />
        </IconButton>
      </Tooltip>,
    );
  }, [setCustomHeaderActions, pointing, setPointing, label]);
  useEffect(() => () => setCustomHeaderActions(null), [setCustomHeaderActions]);

  // By rectangle, not `elementsFromPoint`: disabled controls (not my turn) ignore the pointer.
  const pick = (x: number, y: number) => {
    const target = targetAt(x, y);
    if (target) point(target);
  };

  return (
    <>
      {pointing && (
        <Box
          data-marker-picker
          onClick={(e) => pick(e.clientX, e.clientY)}
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: (theme) => theme.zIndex.modal - 1,
            cursor: 'crosshair',
            bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08),
          }}
        >
          <Paper
            elevation={6}
            onClick={(e) => e.stopPropagation()}
            sx={{
              position: 'absolute',
              left: 16,
              right: 16,
              bottom: 'calc(16px + env(safe-area-inset-bottom))',
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Typography variant="body2" flex={1}>
              {t('party.marker.hint')}
            </Typography>
            <Button sx={{ minHeight: 44 }} onClick={() => setPointing(false)}>
              {t('common.cancel', 'Abbrechen')}
            </Button>
          </Paper>
        </Box>
      )}
      {marker && <MarkerRing key={marker.at} target={marker.target} onTap={dismiss} />}
    </>
  );
};

/** The smallest marked element under the point. */
function targetAt(x: number, y: number): string | null {
  let best: { target: string; area: number } | null = null;
  for (const el of document.querySelectorAll(`[${MARKER_ATTRIBUTE}]`)) {
    const r = el.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
    const area = r.width * r.height;
    const target = el.getAttribute(MARKER_ATTRIBUTE);
    if (target && (!best || area < best.area)) best = { target, area };
  }
  return best?.target ?? null;
}

/** A pulsing ring that follows the marked element. */
const MarkerRing: React.FC<{ target: string; onTap: () => void }> = ({ target, onTap }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    const find = () => document.querySelector(markerSelector(target));
    find()?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const update = () => setRect(find()?.getBoundingClientRect() ?? null);
    update();
    const timer = setInterval(update, 200);
    const onDown = (e: PointerEvent) => {
      const el = find();
      if (el && e.target instanceof Node && el.contains(e.target)) onTap();
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => {
      clearInterval(timer);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [target, onTap]);
  if (!rect) return null;
  const pad = 6;
  return (
    <Box
      aria-hidden
      data-marker-ring
      sx={{
        position: 'fixed',
        left: rect.left - pad,
        top: rect.top - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
        borderRadius: 2,
        border: '4px solid',
        borderColor: 'warning.main',
        pointerEvents: 'none',
        zIndex: (theme) => theme.zIndex.modal - 2,
        '@keyframes markerPulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: 1 },
          '50%': { transform: 'scale(1.08)', opacity: 0.6 },
        },
        animation: 'markerPulse 1.2s ease-in-out infinite',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    />
  );
};
