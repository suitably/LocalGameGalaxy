/**
 * Floating TTS-style player seat selector [ID: GAME-TABLETOP-SEAT-SELECTOR]
 */
import React from 'react';
import { Box, Tooltip, IconButton, Typography } from '@mui/material';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import CheckIcon from '@mui/icons-material/Check';
import { useTranslation } from 'react-i18next';
import type { SeatWidget } from '../../logic/types';
import { resolveSeatColor } from '../../logic/seatLogic';

interface PlayerSeatSelectorProps {
  seats: SeatWidget[];
  currentSeatId?: string;
  onSelectSeat: (seatId: string) => void;
  onToggleHud?: () => void;
}

export const PlayerSeatSelector: React.FC<PlayerSeatSelectorProps> = ({
  seats,
  currentSeatId,
  onSelectSeat,
  onToggleHud,
}) => {
  const { t } = useTranslation();

  if (seats.length === 0) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 14,
        left: 14,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: 'rgba(24, 24, 27, 0.88)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        borderRadius: 3,
        px: 1.2,
        py: 0.6,
        boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
        userSelect: 'none',
      }}
    >
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700, mr: 0.5 }}>
        {t('games.tabletop.seat', 'Sitz')}:
      </Typography>

      {seats.map((seat) => {
        const isCurrent = currentSeatId === seat.id;
        const color = resolveSeatColor(seat);
        const label = seat.player || seat.label || `P${seat.index || 1}`;

        return (
          <Tooltip
            key={seat.id}
            title={`${seat.label || `Spieler ${seat.index}`} ${seat.player ? `(${seat.player})` : isCurrent ? '(Du)' : '- Klick zum Hinsetzen'}`}
          >
            <Box
              onClick={() => onSelectSeat(seat.id)}
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                bgcolor: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: isCurrent ? '2.5px solid #fff' : '1.5px solid rgba(255,255,255,0.3)',
                boxShadow: isCurrent ? `0 0 10px ${color}, 0 2px 6px rgba(0,0,0,0.5)` : '0 2px 4px rgba(0,0,0,0.4)',
                transform: isCurrent ? 'scale(1.15)' : 'scale(1)',
                transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
                '&:hover': {
                  transform: 'scale(1.2)',
                  borderColor: '#fff',
                },
              }}
            >
              {isCurrent ? (
                <CheckIcon sx={{ fontSize: 16, color: color === '#f8fafc' ? '#000' : '#fff' }} />
              ) : (
                <Typography
                  sx={{
                    fontSize: '0.65rem',
                    fontWeight: 900,
                    color: color === '#f8fafc' ? '#000' : '#fff',
                    lineHeight: 1,
                  }}
                >
                  {label.slice(0, 2).toUpperCase()}
                </Typography>
              )}
            </Box>
          </Tooltip>
        );
      })}

      {onToggleHud && (
        <Tooltip title={t('games.tabletop.playerHud', 'Spieler-Übersicht')}>
          <IconButton
            size="small"
            onClick={onToggleHud}
            sx={{
              ml: 0.5,
              color: 'rgba(255,255,255,0.85)',
              p: 0.5,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.15)', color: '#fff' },
            }}
          >
            <DashboardCustomizeIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};
