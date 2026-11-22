/**
 * Where a player plays: this device, invited (link not opened yet) or joined elsewhere [ID: MOD-SHARING-SEAT-STATUS]
 */
import React from 'react';
import { Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { playerSeatStatus, type SeatedPlayer } from '../player-management';

export const SeatStatusChip: React.FC<{ player: SeatedPlayer; isLocal: boolean }> = ({
  player,
  isLocal,
}) => {
  const { t } = useTranslation();
  const status = isLocal ? 'local' : playerSeatStatus(player);
  const [label, color] =
    status === 'local'
      ? [t('common.localPlayer'), 'default' as const]
      : status === 'invited'
        ? [t('common.seatInvited'), 'warning' as const]
        : status === 'remote'
          ? [t('common.seatJoined'), 'success' as const]
          : [t('common.remotePlayer'), 'primary' as const];
  return (
    <Chip
      size="small"
      label={label}
      color={color}
      sx={{ height: 20, fontSize: '0.75rem', fontWeight: 600 }}
    />
  );
};
