import React, { useState, useMemo } from 'react';
import { Box, Typography, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import type { Player, NightAction, Role, RoleDefinition } from '../logic/types';
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
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';

interface NightPhaseProps {
    players: Player[];
    customRoles: RoleDefinition[];
    round: number;
    nightActionLog: string[];
    onNextPhase: () => void;
    onNightAction: (action: NightAction, role: Role) => void;
}

const NIGHT_ROLE_ORDER: Role[] = [
    'CUPID', 'THIEF', 'WOLFDOG', 'GUARDIAN', 'WEREWOLF', 'BLACK_WEREWOLF',
    'WHITE_WEREWOLF', 'WITCH', 'SEER', 'DETECTIVE', 'EASTER_BUNNY',
    'PYROMANIAC', 'RIPPER', 'SURVIVOR'
];

export const NightPhase: React.FC<NightPhaseProps> = ({ players, customRoles = [], round, nightActionLog, onNextPhase, onNightAction }) => {
    const { t } = useTranslation();
    const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
    const [isMorningComing, setIsMorningComing] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);

    const rolesToAct = useMemo(() => {
        const standardRoles = NIGHT_ROLE_ORDER.filter(role => {
            // Check if anyone with this role is alive
            const exists = players.some(p => p.role === role);
            if (!exists && role !== 'WEREWOLF' && role !== 'BLACK_WEREWOLF') return false;

            // Special conditions: roles that only act on the very first night
            if (role === 'THIEF' && round > 1) return false;
            if (role === 'CUPID' && round > 1) return false;
            if (role === 'WOLFDOG' && round > 1) return false;

            const alive = players.some(p => p.role === role && p.isAlive);
            if (role === 'WEREWOLF') {
                return players.some(p => (p.role === 'WEREWOLF' || p.role === 'BLACK_WEREWOLF') && p.isAlive);
            }

            if (role === 'BLACK_WEREWOLF') {
                const blackWolf = players.find(p => p.role === 'BLACK_WEREWOLF' && p.isAlive);
                // Black wolf acts only if they have their power AND there is a victim to infect
                return !!blackWolf && blackWolf.powerState.hasInfected === true && nightActionLog.length > 0;
            }

            return alive;
        });

        const activeCustomRoles = customRoles.filter(cr => {
            const hasRole = players.some(p => p.role === cr.id && p.isAlive);
            if (!hasRole) return false;

            // Check abilities for timing
            return cr.abilities.some(ability => {
                if (ability.timing === 'FIRST_NIGHT' && round > 1) return false;
                if (ability.timing === 'ROUND_NUMBER' && ability.roundNumber !== round) return false;
                return true;
            });
        }).map(cr => cr.id as Role);

        return [...standardRoles, ...activeCustomRoles];
    }, [players, customRoles, round]);

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

    const getDescription = () => {
        if (!activeRole) return '';
        const customRole = customRoles.find(cr => cr.id === activeRole);
        if (customRole) return customRole.description;
        return t(`games.werewolf.role_descriptions.${activeRole}`);
    };

    const getRoleName = () => {
        if (!activeRole) return '';
        const customRole = customRoles.find(cr => cr.id === activeRole);
        if (customRole) return customRole.name;
        return t(`games.werewolf.roles.${activeRole}`);
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

    const renderContent = () => {
        // Render appropriate view based on activeRole
        const alivePlayers = players.filter(p => p.isAlive);
        const rolePlayer = players.find(p => p.role === activeRole && p.isAlive);

        // Check if there is a custom definition/override for this role
        const customRole = customRoles.find(cr => cr.id === activeRole);

        // If it's a custom role or an overridden standard role, use generic handling
        // UNLESS it's a standard role but with NO changes to abilities?
        // Actually, if the user edited it, they probably want the generic behavior (e.g. they changed Seer to Kill).
        // The only risk is if they kept standard abilities but the generic view is inferior.
        // For MVP, if it is in customRoles, we assume it's "customized" enough to warrant generic view.
        if (customRole) {
            const ability = customRole.abilities[0];
            if (!ability) return <Box textAlign="center" mt={10}><Button onClick={nextRole}>Skip {activeRole}</Button></Box>;

            return (
                <PlayerSelectionView
                    icon={<Typography variant="h1">{customRole.icon}</Typography>}
                    title={customRole.name}
                    subtitle={customRole.description}
                    instruction={t(`games.werewolf.editor.ability_instruction_${ability.type.toLowerCase()}`, { count: ability.targetCount })}
                    players={players.filter(p => p.isAlive)}
                    onSelect={(id) => handleAction({ type: ability.type as any, targetId: id })}
                    onSkip={nextRole}
                    skipLabel={t('common.skip')}
                    buttonColor="primary"
                />
            );
        }

        switch (activeRole) {
            case 'WEREWOLF': {
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
            case 'BLACK_WEREWOLF': {
                const blackWolf = players.find(p => p.role === 'BLACK_WEREWOLF' && p.isAlive);
                // Find the victim chosen by werewolves tonight
                const victimId = nightActionLog[nightActionLog.length - 1];
                const victim = players.find(p => p.id === victimId);

                if (!blackWolf || !victim) {
                    return <Box textAlign="center" mt={10}><Button onClick={nextRole}>Skip</Button></Box>;
                }

                return (
                    <BlackWerewolfView
                        players={players}
                        victim={victim}
                        onAction={handleAction}
                        onSkip={nextRole}
                        powerState={blackWolf.powerState}
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
            default: {
                // Check if it's a custom role
                const customRole = customRoles.find(cr => cr.id === activeRole);
                if (customRole) {
                    // For now, render a generic selection view for the first ability
                    const ability = customRole.abilities[0];
                    if (!ability) return <Box textAlign="center" mt={10}><Button onClick={nextRole}>Skip {activeRole}</Button></Box>;

                    return (
                        <PlayerSelectionView
                            icon={<Typography variant="h1">{customRole.icon}</Typography>}
                            title={customRole.name}
                            subtitle={customRole.description}
                            instruction={t(`games.werewolf.editor.ability_instruction_${ability.type.toLowerCase()}`, { count: ability.targetCount })}
                            players={players.filter(p => p.isAlive)}
                            onSelect={(id) => handleAction({ type: ability.type as any, targetId: id })}
                            onSkip={nextRole}
                            skipLabel={t('common.skip')}
                            buttonColor="primary"
                        />
                    );
                }
                return <Box textAlign="center" mt={10}><Button onClick={nextRole}>Skip {activeRole}</Button></Box>;
            }
        }
    };

    return (
        <Box sx={{ position: 'relative' }}>
            <Box sx={{ position: 'absolute', top: -48, right: 0, zIndex: 10 }}>
                <IconButton onClick={() => setIsInfoOpen(true)} color="info">
                    <InfoIcon />
                </IconButton>
            </Box>

            {renderContent()}

            <Dialog open={isInfoOpen} onClose={() => setIsInfoOpen(false)} maxWidth="xs">
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {getRoleName()}
                    <IconButton onClick={() => setIsInfoOpen(false)} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1">
                        {getDescription()}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsInfoOpen(false)}>{t('common.close', 'Close')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
