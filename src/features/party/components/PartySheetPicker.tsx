/**
 * Whose sheet this device plays [ID: COMP-PARTY-SHEET-PICKER]
 *
 * In games where everyone fills their own sheet at once (Knister), a device that may help other
 * players (`usePartyRoomGame().helpable`) switches between its own sheet and theirs.
 */
import React from 'react';
import { Box, Chip } from '@mui/material';
import VolunteerActivismRoundedIcon from '@mui/icons-material/VolunteerActivismRounded';
import { useTranslation } from 'react-i18next';
import type { RoomPlayer } from '../logic/partyRoster';

export const PartySheetPicker: React.FC<{
  myId: string;
  helpable: readonly RoomPlayer[];
  value: string;
  onChange: (playerId: string) => void;
}> = ({ myId, helpable, value, onChange }) => {
  const { t } = useTranslation();
  if (helpable.length === 0) return null;
  return (
    <Box display="flex" flexWrap="wrap" justifyContent="center" gap={1} mb={1}>
      <Chip
        label={t('party.help.mySheet')}
        color={value === myId ? 'primary' : 'default'}
        onClick={() => onChange(myId)}
        sx={{ minHeight: 40 }}
      />
      {helpable.map((p) => (
        <Chip
          key={p.id}
          icon={<VolunteerActivismRoundedIcon />}
          label={t('party.help.sheetOf', { name: p.name })}
          color={value === p.id ? 'primary' : 'default'}
          onClick={() => onChange(p.id)}
          sx={{ minHeight: 40 }}
        />
      ))}
    </Box>
  );
};
