/**
 * Player Boards / Overview HUD Dialog [ID: GAME-TABLETOP-PLAYER-HUD]
 */
import React from 'react';
import {
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import StyleIcon from '@mui/icons-material/StyleRounded';
import ExtensionIcon from '@mui/icons-material/ExtensionRounded';
import StarIcon from '@mui/icons-material/StarRounded';
import { useTranslation } from 'react-i18next';
import type { TabletopWidget, SeatWidget } from '../../logic/types';
import { getPlayerStats } from '../../logic/seatLogic';

interface PlayerOverviewHudProps {
  open: boolean;
  onClose: () => void;
  seats: SeatWidget[];
  widgets: Record<string, TabletopWidget>;
  currentSeatId?: string;
}

export const PlayerOverviewHud: React.FC<PlayerOverviewHudProps> = ({
  open,
  onClose,
  seats,
  widgets,
  currentSeatId,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {},
      }}
    >
      <DialogTitle
        sx={{
          borderBottom: (theme) => `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
          pb: 1.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6" fontWeight={800}>
          {t('games.tabletop.playerOverview', 'Spieler-Übersicht')}
        </Typography>
        <Chip
          size="small"
          label={`${seats.length} ${t('games.tabletop.seats', 'Plätze')}`}
          sx={{
            bgcolor: (theme) => alpha(theme.palette.text.primary, 0.1),
            color: 'text.secondary',
          }}
        />
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: seats.length <= 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
            },
            gap: 2,
          }}
        >
          {seats.map((seat) => {
            const stats = getPlayerStats(widgets, seat);
            const isSelf = currentSeatId === seat.id;

            return (
              <Box key={seat.id}>
                <Box
                  sx={{
                    bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
                    border: isSelf ? `2px solid ${stats.color}` : 1,
                    borderColor: isSelf ? undefined : 'divider',
                    borderRadius: 3,
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                  }}
                >
                  {/* Header: Avatar, Name & Turn */}
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          bgcolor: stats.color,
                          border: (theme) => `1.5px solid ${theme.palette.text.primary}`,
                        }}
                      />
                      <Typography variant="subtitle2" fontWeight={800}>
                        {stats.seatName}
                      </Typography>
                      {isSelf && (
                        <Chip
                          size="small"
                          label={t('games.tabletop.you', 'Du')}
                          sx={{
                            height: 18,
                            fontSize: '0.75rem',
                            bgcolor: 'primary.main',
                            color: 'text.primary',
                          }}
                        />
                      )}
                    </Box>
                    {stats.isTurn && (
                      <Chip
                        size="small"
                        icon={<StarIcon sx={{ fontSize: '14px !important' }} />}
                        label={t('games.tabletop.activeTurn', 'Am Zug')}
                        color="warning"
                        sx={{ height: 20, fontSize: '0.75rem' }}
                      />
                    )}
                  </Box>

                  {/* Hand Cards */}
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={1}
                    bgcolor="rgba(0,0,0,0.3)"
                    px={1.2}
                    py={0.8}
                    borderRadius={2}
                  >
                    <StyleIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {t('games.tabletop.handCards', 'Handkarten')}:{' '}
                      <strong>{stats.handCardCount}</strong>
                    </Typography>
                  </Box>

                  {/* Supplies breakdown if present */}
                  {stats.supplies.length > 0 && (
                    <Box display="flex" flexDirection="column" gap={0.6}>
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.disabled', fontWeight: 700 }}
                      >
                        {t('games.tabletop.supplyReserve', 'Vorrat')}:
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={0.8}>
                        {stats.supplies.map((s) => (
                          <Chip
                            key={s.group}
                            size="small"
                            icon={
                              <ExtensionIcon
                                sx={{
                                  fontSize: '14px !important',
                                  color: `${stats.color} !important`,
                                }}
                              />
                            }
                            label={`${s.group}: ${s.inSupply}`}
                            sx={{
                              bgcolor: (theme) => alpha(theme.palette.text.primary, 0.08),
                              color: 'text.primary',
                              fontSize: '0.75rem',
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          borderTop: (theme) => `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
          px: 2.5,
          py: 1.5,
        }}
      >
        <Button onClick={onClose} variant="outlined" color="inherit">
          {t('common.close', 'Schließen')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
