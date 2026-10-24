import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkModeRounded';
import { useTranslation } from 'react-i18next';
import type { NightAction, Player, Role, RoleDefinition } from '../../logic/types';
import { isWerewolf } from '../../logic/utils';
import { DEFAULT_ROLES } from '../../logic/defaultRoles';
import { PlayerSelectionView } from '../PlayerSelectionView';
import { WitchView } from '../roles/WitchView';
import { SeerView } from '../roles/SeerView';
import { CupidView } from '../roles/CupidView';
import { DetectiveView } from '../roles/DetectiveView';
import { GuardianView } from '../roles/GuardianView';
import { BlackWerewolfView } from '../roles/BlackWerewolfView';
import { WhiteWerewolfView } from '../roles/WhiteWerewolfView';
import { BlackCatView } from '../roles/BlackCatView';
import { EasterBunnyView } from '../roles/EasterBunnyView';
import { WolfdogView } from '../roles/WolfdogView';
import { RipperView } from '../roles/RipperView';
import { SurvivorView } from '../roles/SurvivorView';
import { PyromaniacView } from '../roles/PyromaniacView';
import { ThiefView } from '../roles/ThiefView';
import { MatratzeView } from '../roles/MatratzeView';

interface StandardRoleNightProps {
  role: Role;
  players: Player[];
  customRoles: RoleDefinition[];
  round: number;
  nightActionLog: string[];
  instruction?: string;
  onAction: (action: NightAction) => void;
  onSkip: () => void;
}

/** Night turn of one of the built-in roles. */
export const StandardRoleNight: React.FC<StandardRoleNightProps> = ({
  role,
  players,
  customRoles,
  round,
  nightActionLog,
  instruction,
  onAction,
  onSkip,
}) => {
  const { t } = useTranslation();
  const alivePlayers = players.filter((p) => p.isAlive);
  const rolePlayer = players.find((p) => p.role === role && p.isAlive);
  const common = { players, onAction, onSkip, instruction };

  switch (role) {
    case 'WEREWOLF': {
      const allRoles = [...DEFAULT_ROLES, ...customRoles];
      const werewolves = alivePlayers.filter((p) => isWerewolf(p, allRoles));
      const extraContent = (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {t('games.werewolf.narrator.werewolves_label')}
          </Typography>
          <Typography variant="body1" fontWeight="bold">
            {werewolves.map((w) => w.name).join(', ')}
          </Typography>
        </Box>
      );
      return (
        <PlayerSelectionView
          icon={<DarkModeIcon sx={{ fontSize: 60, color: 'secondary.main' }} />}
          title={t('games.werewolf.narrator.dashboard_title', { round: round + 1 })}
          subtitle={t('games.werewolf.narrator.wait_for_werewolves')}
          instruction={t('games.werewolf.narrator.select_victim')}
          players={alivePlayers}
          onSelect={(id) => onAction({ type: 'KILL', targetId: id })}
          onSkip={onSkip}
          skipLabel={t('common.skip')}
          buttonColor="error"
          extraContent={extraContent}
        />
      );
    }
    case 'BLACK_WEREWOLF': {
      const blackWolf = players.find((p) => p.role === 'BLACK_WEREWOLF' && p.isAlive);
      const victim = players.find((p) => p.id === nightActionLog[0]);
      if (!blackWolf || !victim) {
        return (
          <Box textAlign="center" mt={10}>
            <Button variant="outlined" onClick={onSkip}>
              {t('common.skip')}
            </Button>
          </Box>
        );
      }
      return <BlackWerewolfView {...common} victim={victim} powerState={blackWolf.powerState} />;
    }
    case 'WITCH':
      return <WitchView {...common} powerState={rolePlayer?.powerState} />;
    case 'SEER':
      return <SeerView {...common} />;
    case 'CUPID':
      return <CupidView {...common} />;
    case 'DETECTIVE':
      return <DetectiveView {...common} customRoles={customRoles} />;
    case 'GUARDIAN':
      return <GuardianView {...common} />;
    case 'WHITE_WEREWOLF':
      return <WhiteWerewolfView {...common} customRoles={customRoles} />;
    case 'EASTER_BUNNY':
      return <EasterBunnyView {...common} />;
    case 'WOLFDOG':
      return <WolfdogView {...common} />;
    case 'RIPPER':
      return <RipperView {...common} />;
    case 'SURVIVOR':
      return <SurvivorView {...common} powerState={rolePlayer?.powerState} />;
    case 'PYROMANIAC':
      return <PyromaniacView {...common} />;
    case 'THIEF':
      return <ThiefView {...common} />;
    case 'BLACK_CAT':
      return <BlackCatView {...common} />;
    case 'DORFMATRATZE':
      return <MatratzeView {...common} />;
    default:
      return (
        <Box textAlign="center" mt={10}>
          <Button variant="outlined" onClick={onSkip}>
            {t('common.skip')} {role}
          </Button>
        </Box>
      );
  }
};
