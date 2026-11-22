import React, { useState } from 'react';
import { Box, Button, Paper, Typography, Alert, Dialog } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrowRounded';
import SettingsIcon from '@mui/icons-material/SettingsRounded';
import { useTranslation } from 'react-i18next';
import type { Player, Role, RoleDefinition } from '../logic/types';
import { RoleEditor } from './RoleEditor';
import { RoleSelectionGrid } from './setup/RoleSelectionGrid';
import { RoleDescriptionDialog } from './setup/RoleDescriptionDialog';
import { WerewolfCountStepper } from './setup/WerewolfCountStepper';
import { DEFAULT_ROLES } from '../logic/defaultRoles';
import { useWerewolfSetup } from '../hooks/useWerewolfSetup';
import { PlayerManagerCard } from '../../../modules/player-management';

interface GameSetupProps {
  players: Player[];
  customRoles: RoleDefinition[];
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (id: string) => void;
  onClearAllPlayers: () => void;
  onStartGame: (roles: Role[]) => void;
  onSaveCustomRoles: (roles: RoleDefinition[]) => void;
}

export const GameSetup: React.FC<GameSetupProps> = ({
  players,
  customRoles = [],
  onAddPlayer,
  onRemovePlayer,
  onStartGame,
  onSaveCustomRoles,
}) => {
  const { t } = useTranslation();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedRoleForDesc, setSelectedRoleForDesc] = useState<RoleDefinition | null>(null);
  const {
    enabledRoles,
    numWerewolves,
    setNumWerewolves,
    toggleRole,
    handleStart,
    tooManyRoles,
    tooManyWerewolves,
  } = useWerewolfSetup(players, customRoles, onStartGame);

  return (
    <Box maxWidth="sm" mx="auto">
      <PlayerManagerCard
        players={players.map((p) => ({ name: p.name }))}
        onAddPlayer={onAddPlayer}
        onRemovePlayer={(name, index) => {
          const target =
            typeof index === 'number' ? players[index] : players.find((p) => p.name === name);
          if (target) onRemovePlayer(target.id);
        }}
        minPlayers={4}
        maxPlayers={30}
        sx={{ mb: 3 }}
      />

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">{t('games.werewolf.role_reveal')}</Typography>
          <Button startIcon={<SettingsIcon />} size="small" onClick={() => setIsEditorOpen(true)}>
            {t('games.werewolf.ui.editor.title')}
          </Button>
        </Box>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {t('games.werewolf.ui.select_roles_hint')}
        </Typography>

        {tooManyRoles && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t('games.werewolf.ui.too_many_roles')}
          </Alert>
        )}

        {tooManyWerewolves && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {t('games.werewolf.ui.too_many_werewolf_roles')}
          </Alert>
        )}

        <WerewolfCountStepper
          value={numWerewolves}
          playerCount={players.length}
          onChange={setNumWerewolves}
          onShowInfo={setSelectedRoleForDesc}
        />

        <RoleSelectionGrid
          customRoles={customRoles}
          enabledRoles={enabledRoles}
          onToggle={toggleRole}
          onShowInfo={setSelectedRoleForDesc}
        />
      </Paper>

      <Dialog open={isEditorOpen} onClose={() => setIsEditorOpen(false)} fullScreen>
        <RoleEditor
          customRoles={customRoles}
          defaultRoles={DEFAULT_ROLES}
          onSaveRoles={(roles) => {
            onSaveCustomRoles(roles);
            setIsEditorOpen(false);
          }}
          onClose={() => setIsEditorOpen(false)}
        />
      </Dialog>

      <RoleDescriptionDialog
        role={selectedRoleForDesc}
        onClose={() => setSelectedRoleForDesc(null)}
      />

      <Button
        variant="contained"
        size="large"
        fullWidth
        color="secondary"
        disabled={players.length < 3 || tooManyRoles || tooManyWerewolves}
        onClick={handleStart}
        startIcon={<PlayArrowIcon />}
      >
        {t('common.start')}
      </Button>
    </Box>
  );
};
