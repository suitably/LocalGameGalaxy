import React, { useState } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { NightAction, Player, Role, RoleDefinition } from '../../logic/types';
import { getActiveAbilities } from '../../logic/nightRoles';
import { PlayerSelectionView } from '../PlayerSelectionView';
import { RoleIcon } from '../RoleIcon';

// Custom abilities reuse the built-in single-target night action shapes.
const targetAction = (type: NightAction['type'], targetId: string): NightAction =>
  ({ type, targetId }) as NightAction;

interface CustomRoleNightProps {
  role: RoleDefinition;
  players: Player[];
  round: number;
  onNightAction: (action: NightAction, role: Role) => void;
  onNext: () => void;
}

/** Generic night turn for custom (or overridden) roles with one or more abilities. */
export const CustomRoleNight: React.FC<CustomRoleNightProps> = ({
  role,
  players,
  round,
  onNightAction,
  onNext,
}) => {
  const { t } = useTranslation();
  const [selectedAbilityIndex, setSelectedAbilityIndex] = useState<number | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [completedAbilities, setCompletedAbilities] = useState<number[]>([]);

  const activeAbilities = getActiveAbilities(role, round);

  const leaveAbility = () => {
    setSelectedAbilityIndex(null);
    setSelectedTargets([]);
  };

  if (activeAbilities.length === 0) {
    return (
      <Box textAlign="center" mt={10}>
        <Button variant="outlined" onClick={onNext}>
          {t('common.skip')} {role.name}
        </Button>
      </Box>
    );
  }

  if (selectedAbilityIndex === null) {
    const remaining = activeAbilities.filter((_, idx) => !completedAbilities.includes(idx));
    if (remaining.length === 0) {
      return (
        <Box textAlign="center" mt={10}>
          <Typography variant="h5" gutterBottom>
            {t('games.werewolf.narrator.finished_acting', { name: role.name })}
          </Typography>
          <Button variant="contained" color="primary" onClick={onNext}>
            {t('common.finish_turn', 'Finish Turn')}
          </Button>
        </Box>
      );
    }

    return (
      <Box maxWidth="sm" mx="auto" textAlign="center" mt={4}>
        <Box sx={{ mb: 2, fontSize: '4rem' }}>
          <RoleIcon icon={role.icon} fontSize="inherit" />
        </Box>
        <Typography variant="h4" gutterBottom>
          {role.name}
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          {role.description}
        </Typography>

        <Paper
          variant="outlined"
          sx={{ p: 4, mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <Typography variant="h6" gutterBottom>
            {t('games.werewolf.narrator.choose_ability', 'Choose an ability to execute:')}
          </Typography>
          {activeAbilities.map((ability, idx) => {
            const isUsed = completedAbilities.includes(idx);
            return (
              <Button
                key={idx}
                variant={isUsed ? 'outlined' : 'contained'}
                disabled={isUsed}
                onClick={() => setSelectedAbilityIndex(idx)}
                sx={{ py: 1.5 }}
              >
                {t('games.werewolf.ability_btn', {
                  type: ability.type,
                  count: ability.targetCount || 1,
                  status: isUsed ? ` - ${t('common.used')}` : '',
                })}
              </Button>
            );
          })}
        </Paper>
        <Button variant="outlined" color="secondary" onClick={onNext} sx={{ mt: 3 }} fullWidth>
          {t('common.skip')} / {t('common.done', 'Done')}
        </Button>
      </Box>
    );
  }

  const abilityIndex = selectedAbilityIndex;
  const ability = activeAbilities[abilityIndex];
  const targetCount = ability.targetCount || 1;
  const instructionText =
    role.narratorText ||
    t(`games.werewolf.editor.ability_instruction_${ability.type.toLowerCase()}`, {
      count: targetCount,
    }) +
      (targetCount > 1
        ? ` (${t('common.target', 'Target')} ${selectedTargets.length + 1}/${targetCount})`
        : '');

  const handleSelect = (id: string) => {
    const newTargets = [...selectedTargets, id];
    if (newTargets.length < targetCount) {
      setSelectedTargets(newTargets);
      return;
    }
    newTargets.forEach((targetId) => onNightAction(targetAction(ability.type, targetId), role.id));
    setCompletedAbilities((prev) => [...prev, abilityIndex]);
    leaveAbility();
  };

  return (
    <PlayerSelectionView
      icon={<RoleIcon icon={role.icon} fontSize="4rem" />}
      title={`${role.name} - ${ability.type}`}
      subtitle={role.description}
      instruction={instructionText}
      players={players.filter((p) => p.isAlive && !selectedTargets.includes(p.id))}
      onSelect={handleSelect}
      onSkip={leaveAbility}
      skipLabel={t('common.back')}
      buttonColor="primary"
    />
  );
};
