/**
 * Host's setup of a Werewolf room game: narrator mode and the roles to deal
 * [ID: GAME-WEREWOLF-ROOM-SETUP]
 */
import React, { useState } from 'react';
import { Alert, Box, Button, Checkbox, FormControlLabel, Paper, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrowRounded';
import { useTranslation } from 'react-i18next';
import type { Role, RoleDefinition } from '../../logic/types';
import {
  MIN_ROOM_PLAYERS,
  ROOM_ROLES,
  seatedPlayers,
  type RoomSeat,
} from '../../logic/werewolfRoom';
import { useWerewolfSetup } from '../../hooks/useWerewolfSetup';
import { RoleSelectionGrid } from '../setup/RoleSelectionGrid';
import { RoleDescriptionDialog } from '../setup/RoleDescriptionDialog';
import { WerewolfCountStepper } from '../setup/WerewolfCountStepper';

interface Props {
  roster: RoomSeat[];
  hostId: string;
  onStart: (roles: Role[], narrator: boolean) => void;
}

export const RoomSetup: React.FC<Props> = ({ roster, hostId, onStart }) => {
  const { t } = useTranslation();
  const [narrator, setNarrator] = useState(false);
  const [info, setInfo] = useState<RoleDefinition | null>(null);
  const seats = seatedPlayers(roster, hostId, narrator);
  const setup = useWerewolfSetup(seats, [], (roles) => onStart(roles, narrator), ROOM_ROLES);
  const tooFew = seats.length < MIN_ROOM_PLAYERS;

  return (
    <Box maxWidth="sm" mx="auto">
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {t('games.werewolf.room.players', { count: seats.length })}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {seats.map((p) => p.name).join(', ')}
        </Typography>
        <FormControlLabel
          control={<Checkbox checked={narrator} onChange={(e) => setNarrator(e.target.checked)} />}
          label={t('games.werewolf.room.narrator_only')}
        />
        {tooFew && (
          <Alert severity="info" sx={{ mt: 1 }}>
            {t('games.werewolf.room.too_few', { count: MIN_ROOM_PLAYERS })}
          </Alert>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        {setup.tooManyRoles && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t('games.werewolf.ui.too_many_roles')}
          </Alert>
        )}
        {setup.tooManyWerewolves && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {t('games.werewolf.ui.too_many_werewolf_roles')}
          </Alert>
        )}
        <WerewolfCountStepper
          value={setup.numWerewolves}
          playerCount={seats.length}
          onChange={setup.setNumWerewolves}
          onShowInfo={setInfo}
        />
        <RoleSelectionGrid
          customRoles={[]}
          enabledRoles={setup.enabledRoles}
          onToggle={setup.toggleRole}
          onShowInfo={setInfo}
          only={ROOM_ROLES}
        />
      </Paper>

      <RoleDescriptionDialog role={info} onClose={() => setInfo(null)} />

      <Button
        variant="contained"
        size="large"
        fullWidth
        color="secondary"
        disabled={tooFew || setup.tooManyRoles || setup.tooManyWerewolves}
        onClick={setup.handleStart}
        startIcon={<PlayArrowIcon />}
        sx={{ minHeight: 48 }}
      >
        {t('common.start')}
      </Button>
    </Box>
  );
};
