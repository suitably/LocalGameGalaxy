import React, { useState } from 'react';
import { Box, Button, Paper, Typography, Alert, Dialog, IconButton } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrowRounded';
import InfoIcon from '@mui/icons-material/InfoRounded';
import SettingsIcon from '@mui/icons-material/SettingsRounded';
import AddIcon from '@mui/icons-material/AddRounded';
import RemoveIcon from '@mui/icons-material/RemoveRounded';
import { useTranslation } from 'react-i18next';
import type { Player, Role, RoleDefinition } from '../logic/types';
import { RoleEditor } from './RoleEditor';
import { RoleIcon } from './RoleIcon';
import { RoleSelectionGrid } from './setup/RoleSelectionGrid';
import { RoleDescriptionDialog } from './setup/RoleDescriptionDialog';
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
            {t('games.werewolf.editor.title', 'Editor')}
          </Button>
        </Box>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {t('games.werewolf.ui.select_roles_hint', 'Select roles to include:')}
        </Typography>

        {tooManyRoles && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t(
              'games.werewolf.ui.too_many_roles',
              'Too many roles selected for the number of players!',
            )}
          </Alert>
        )}

        {tooManyWerewolves && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {t('games.werewolf.ui.too_many_werewolf_roles')}
          </Alert>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
          <Typography
            variant="body1"
            sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <RoleIcon icon="WEREWOLF" fontSize="1.25rem" /> {t('games.werewolf.ui.num_werewolves')}:
            <IconButton
              size="small"
              aria-label={t('games.werewolf.ui.role_info', 'Role info')}
              onClick={() =>
                setSelectedRoleForDesc(DEFAULT_ROLES.find((r) => r.id === 'WEREWOLF') || null)
              }
              sx={{ ml: 0.5, p: 0.5, color: 'text.secondary', opacity: 0.5 }}
            >
              <InfoIcon fontSize="inherit" />
            </IconButton>
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <IconButton
              size="small"
              onClick={() => setNumWerewolves((prev: number) => Math.max(1, prev - 1))}
              disabled={numWerewolves <= 1}
            >
              <RemoveIcon />
            </IconButton>
            <Typography
              sx={{
                mx: 2,
                minWidth: '1.5rem',
                textAlign: 'center',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {numWerewolves}
            </Typography>
            <IconButton
              size="small"
              onClick={() => setNumWerewolves((prev: number) => prev + 1)}
              disabled={numWerewolves >= players.length - 1 && players.length > 0}
            >
              <AddIcon />
            </IconButton>
          </Box>
        </Box>

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
