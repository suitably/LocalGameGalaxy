/**
 * "You are watching" bar with one chip per player [ID: COMP-SPECTATOR-PICKER]
 *
 * Shared by the party-room games for devices that are not in the game (#659): pick whose view
 * to follow. Only what the game shows a spectator is visible, never a player's unsent draft.
 */
import React from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { useTranslation } from 'react-i18next';

export interface SpectatorPlayerPickerProps {
  players: readonly { id: string; name: string }[];
  watched: string | null;
  onWatch: (playerId: string) => void;
  /** Optional per-player mark, e.g. "done" for this round. */
  doneIds?: readonly string[];
}

export const SpectatorPlayerPicker: React.FC<SpectatorPlayerPickerProps> = ({
  players,
  watched,
  onWatch,
  doneIds = [],
}) => {
  const { t } = useTranslation();
  return (
    <Stack gap={1} sx={{ px: 1, py: 1 }}>
      <Stack direction="row" alignItems="center" gap={1}>
        <VisibilityRoundedIcon fontSize="small" color="action" />
        <Typography variant="subtitle2" fontWeight={700}>
          {t('party.spectatorWatching', 'Du schaust zu')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t('party.spectatorPickHint', 'Wähle, wessen Sicht du sehen willst')}
        </Typography>
      </Stack>
      <Stack
        direction="row"
        gap={0.75}
        flexWrap="wrap"
        role="tablist"
        aria-label={t('party.spectatorWatching', 'Du schaust zu')}
      >
        {players.map((p) => (
          <Chip
            key={p.id}
            role="tab"
            aria-selected={p.id === watched}
            label={doneIds.includes(p.id) ? `${p.name} ✓` : p.name}
            color={p.id === watched ? 'primary' : 'default'}
            variant={p.id === watched ? 'filled' : 'outlined'}
            onClick={() => onWatch(p.id)}
            sx={{ minHeight: 40, fontWeight: 700 }}
          />
        ))}
      </Stack>
    </Stack>
  );
};
