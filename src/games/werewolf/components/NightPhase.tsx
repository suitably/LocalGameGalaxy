import React, { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Button, IconButton } from '@mui/material';
import InfoIcon from '@mui/icons-material/InfoRounded';
import VolumeUpIcon from '@mui/icons-material/VolumeUpRounded';
import VolumeOffIcon from '@mui/icons-material/VolumeOffRounded';
import { useTranslation } from 'react-i18next';
import type { Player, NightAction, Role, RoleDefinition } from '../logic/types';
import { getNightRolesToAct } from '../logic/nightRoles';
import { useTTS } from '../hooks/useTTS';
import { CustomRoleNight } from './night/CustomRoleNight';
import { StandardRoleNight } from './night/StandardRoleNight';
import { RoleInfoDialog } from './night/RoleInfoDialog';
import { RoleIcon } from './RoleIcon';

interface NightPhaseProps {
  players: Player[];
  customRoles: RoleDefinition[];
  round: number;
  nightActionLog: string[];
  onNextPhase: () => void;
  onNightAction: (action: NightAction, role: Role) => void;
}

export const NightPhase: React.FC<NightPhaseProps> = ({
  players,
  customRoles = [],
  round,
  nightActionLog,
  onNextPhase,
  onNightAction,
}) => {
  const { t } = useTranslation();
  const { speak, enabled: ttsEnabled, setEnabled: setTtsEnabled } = useTTS();
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [isMorningComing, setIsMorningComing] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const rolesToAct = useMemo(
    () => getNightRolesToAct(players, customRoles, round, nightActionLog),
    [players, customRoles, round, nightActionLog],
  );
  const activeRole = rolesToAct[currentRoleIndex];
  const activeCustomRole = customRoles.find((cr) => cr.id === activeRole);

  const nextRole = () => setCurrentRoleIndex((prev) => prev + 1);

  // Automatically trigger morning when all roles have acted
  useEffect(() => {
    if (!isMorningComing && rolesToAct.length > 0 && currentRoleIndex >= rolesToAct.length) {
      setIsMorningComing(true);
    }
  }, [currentRoleIndex, rolesToAct.length, isMorningComing]);

  // Handle phase transition timer whenever morning starts
  useEffect(() => {
    if (isMorningComing) {
      const timer = setTimeout(onNextPhase, 2000);
      return () => clearTimeout(timer);
    }
  }, [isMorningComing, onNextPhase]);

  const getDescription = () => {
    if (!activeRole) return '';
    return activeCustomRole
      ? activeCustomRole.description
      : t(`games.werewolf.role_descriptions.${activeRole}`);
  };

  const getRoleName = () => {
    if (!activeRole) return '';
    return activeCustomRole ? activeCustomRole.name : t(`games.werewolf.roles.${activeRole}`);
  };

  // Narrate active role instructions when turn transitions
  useEffect(() => {
    if (isMorningComing) {
      speak(t('games.werewolf.narrator.morning_coming'));
      return;
    }
    if (activeRole) {
      speak(activeCustomRole?.narratorText || `${getRoleName()}. ${getDescription()}`);
    }
  }, [activeRole, isMorningComing, speak, t]);

  if (isMorningComing) {
    return (
      <Box sx={{ textAlign: 'center', mt: 10 }}>
        <Typography variant="h5">{t('games.werewolf.narrator.morning_coming')}</Typography>
        <Box sx={{ mt: 2, fontSize: '4rem' }}>
          <RoleIcon icon="MORNING" fontSize="inherit" />
        </Box>
      </Box>
    );
  }

  if (!activeRole) {
    return (
      <Box textAlign="center" mt={10}>
        <Button variant="contained" onClick={() => setIsMorningComing(true)}>
          {t('games.werewolf.narrator.skip_to_morning')}
        </Button>
      </Box>
    );
  }

  // A custom definition (also an override of a built-in role) uses the generic ability flow.
  const content = activeCustomRole ? (
    <CustomRoleNight
      key={currentRoleIndex}
      role={activeCustomRole}
      players={players}
      round={round}
      onNightAction={onNightAction}
      onNext={nextRole}
    />
  ) : (
    <StandardRoleNight
      role={activeRole}
      players={players}
      customRoles={customRoles}
      round={round}
      nightActionLog={nightActionLog}
      onAction={(action) => {
        onNightAction(action, activeRole);
        nextRole();
      }}
      onSkip={nextRole}
    />
  );

  return (
    <Box sx={{ position: 'relative' }}>
      <Box sx={{ position: 'absolute', top: -48, right: 0, zIndex: 10, display: 'flex', gap: 1 }}>
        <IconButton
          onClick={() => setTtsEnabled(!ttsEnabled)}
          color={ttsEnabled ? 'primary' : 'default'}
          size="small"
          aria-label={t('games.werewolf.ui.toggle_narrator', 'Narrator voice')}
        >
          {ttsEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
        </IconButton>
        <IconButton
          onClick={() => setIsInfoOpen(true)}
          color="info"
          size="small"
          aria-label={t('games.werewolf.ui.role_info', 'Role info')}
        >
          <InfoIcon />
        </IconButton>
      </Box>

      {content}

      <RoleInfoDialog
        open={isInfoOpen}
        title={getRoleName()}
        description={getDescription()}
        onClose={() => setIsInfoOpen(false)}
      />
    </Box>
  );
};
