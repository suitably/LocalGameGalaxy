import React, { useState, useMemo } from 'react';
import { Box, Typography, Button } from '@mui/material';
import type { Player, NightAction, Role } from '../logic/types';
import { useTranslation } from 'react-i18next';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { WitchView } from './roles/WitchView';
import { SeerView } from './roles/SeerView';
import { CupidView } from './roles/CupidView';
import { DetectiveView } from './roles/DetectiveView';
import { GuardianView } from './roles/GuardianView';
import { BlackWerewolfView } from './roles/BlackWerewolfView';
import { WhiteWerewolfView } from './roles/WhiteWerewolfView';
import { EasterBunnyView } from './roles/EasterBunnyView';
import { WolfdogView } from './roles/WolfdogView';
import { RipperView } from './roles/RipperView';
import { SurvivorView } from './roles/SurvivorView';
import { PyromaniacView } from './roles/PyromaniacView';
import { ThiefView } from './roles/ThiefView';
import { PlayerSelectionView } from './PlayerSelectionView';

interface NightPhaseProps {
    players: Player[];
    round: number;
    onNextPhase: () => void;
    onNightAction: (action: NightAction, role: Role) => void;
}

const NIGHT_ROLE_ORDER: Role[] = [
    'THIEF', 'CUPID', 'WOLFDOG', 'GUARDIAN', 'WEREWOLF', 'BLACK_WEREWOLF',
    'WHITE_WEREWOLF', 'WITCH', 'SEER', 'DETECTIVE', 'EASTER_BUNNY',
    'PYROMANIAC', 'RIPPER', 'SURVIVOR'
];

export const NightPhase: React.FC<NightPhaseProps> = ({ players, round, onNextPhase, onNightAction }) => {
    const { t } = useTranslation();
    const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
    const [isMorningComing, setIsMorningComing] = useState(false);

    const rolesToAct = useMemo(() => {
        return NIGHT_ROLE_ORDER.filter(role => {
            // Check if anyone with this role is alive
            const exists = players.some(p => p.role === role);
            if (!exists && role !== 'WEREWOLF' && role !== 'BLACK_WEREWOLF') return false; // Werewolves always act (as a group)

            // Special conditions
            if (role === 'THIEF' && round > 0) return false;
            if (role === 'CUPID' && round > 0) return false;
            if (role === 'WOLFDOG' && round > 0) return false;

            const alive = players.some(p => p.role === role && p.isAlive);
            if (role === 'WEREWOLF' || role === 'BLACK_WEREWOLF') {
                return players.some(p => (p.role === 'WEREWOLF' || p.role === 'BLACK_WEREWOLF') && p.isAlive);
            }

            return alive;
        });
    }, [players, round]);

    const activeRole = rolesToAct[currentRoleIndex];

    const nextRole = () => {
        if (currentRoleIndex < rolesToAct.length - 1) {
            setCurrentRoleIndex(prev => prev + 1);
        } else {
            setIsMorningComing(true);
            setTimeout(onNextPhase, 2000);
        }
    };

    const handleAction = (action: NightAction) => {
        onNightAction(action, activeRole || 'WEREWOLF');
        nextRole();
    };

    if (isMorningComing) {
        return (
            <Box sx={{ textAlign: 'center', mt: 10 }}>
                <Typography variant="h5">{t('games.werewolf.narrator.morning_coming')}</Typography>
                <Typography variant="h1" sx={{ mt: 2 }}>🌅</Typography>
            </Box>
        );
    }

    if (!activeRole) {
        return (
            <Box textAlign="center" mt={10}>
                <Button variant="contained" onClick={() => setIsMorningComing(true)}>{t('games.werewolf.narrator.skip_to_morning')}</Button>
            </Box>
        );
    }

    // Render appropriate view based on activeRole
    const alivePlayers = players.filter(p => p.isAlive);
    const rolePlayer = players.find(p => p.role === activeRole && p.isAlive);

    switch (activeRole) {
        case 'WEREWOLF':
        case 'BLACK_WEREWOLF': {
            // Check if Black Werewolf has already acted this turn
            // For now, let's just group them or show Black Werewolf specifically if present and has power
            const blackWolf = players.find(p => p.role === 'BLACK_WEREWOLF' && p.isAlive);
            if (blackWolf && blackWolf.powerState.hasInfected && activeRole === 'BLACK_WEREWOLF') {
                return <BlackWerewolfView players={players} onAction={handleAction} onSkip={nextRole} powerState={blackWolf.powerState} />;
            }

            // Standard Werewolf turn
            const werewolves = alivePlayers.filter(p => p.role === 'WEREWOLF' || p.role === 'BLACK_WEREWOLF');
            const extraContent = (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary">{t('games.werewolf.narrator.werewolves_label')}</Typography>
                    <Typography variant="body1" fontWeight="bold">
                        {werewolves.map(w => w.name).join(', ')}
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
                    onSelect={(id) => handleAction({ type: 'KILL', targetId: id })}
                    onSkip={nextRole}
                    skipLabel={t('games.werewolf.narrator.skip_to_morning')}
                    buttonColor="error"
                    extraContent={extraContent}
                />
            );
        }
        case 'WITCH': return <WitchView players={players} onAction={handleAction} onSkip={nextRole} powerState={rolePlayer?.powerState} />;
        case 'SEER': return <SeerView players={players} onAction={handleAction} onSkip={nextRole} />;
        case 'CUPID': return <CupidView players={players} onAction={handleAction} onSkip={nextRole} />;
        case 'DETECTIVE': return <DetectiveView players={players} onAction={handleAction} onSkip={nextRole} />;
        case 'GUARDIAN': return <GuardianView players={players} onAction={handleAction} onSkip={nextRole} />;
        case 'WHITE_WEREWOLF': return <WhiteWerewolfView players={players} onAction={handleAction} onSkip={nextRole} />;
        case 'EASTER_BUNNY': return <EasterBunnyView players={players} onAction={handleAction} onSkip={nextRole} />;
        case 'WOLFDOG': return <WolfdogView players={players} onAction={handleAction} onSkip={nextRole} />;
        case 'RIPPER': return <RipperView players={players} onAction={handleAction} onSkip={nextRole} />;
        case 'SURVIVOR': return <SurvivorView players={players} onAction={handleAction} onSkip={nextRole} powerState={rolePlayer?.powerState} />;
        case 'PYROMANIAC': return <PyromaniacView players={players} onAction={handleAction} onSkip={nextRole} />;
        case 'THIEF': return <ThiefView players={players} onAction={handleAction} onSkip={nextRole} />;
        default:
            return <Box textAlign="center" mt={10}><Button onClick={nextRole}>Skip {activeRole}</Button></Box>;
    }
};
