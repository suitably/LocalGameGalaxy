import React, { useEffect } from 'react';
import { Box, Typography, Button, Paper, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { Player, NightDecision, RoleDefinition } from '../logic/types';
import { isWerewolf } from '../logic/utils';
import { useTTS } from '../hooks/useTTS';
import { useTranslation } from 'react-i18next';
import WbSunnyIcon from '@mui/icons-material/WbSunny';

interface DayPhaseProps {
    players: Player[];
    round: number;
    onNextPhase: () => void;
    removedPlayerIds: string[]; // Players killed last night
    nightDecisions: NightDecision[];
    customRoles?: RoleDefinition[];
}

export const DayPhase: React.FC<DayPhaseProps> = ({ players, round, onNextPhase, removedPlayerIds, nightDecisions, customRoles }) => {
    const { t } = useTranslation();
    const { speak } = useTTS();

    const killedPlayers = players.filter(p => removedPlayerIds.includes(p.id));

    useEffect(() => {
        // Announce deaths
        let message = t('games.werewolf.narrator.day_intro');
        if (killedPlayers.length > 0) {
            const names = killedPlayers.map(p => p.name).join(', ');
            message += ` ${t('games.werewolf.narrator.died_night', { names })}`;
        } else {
            message += ` ${t('games.werewolf.narrator.noone_died')}`;
        }

        speak(message);
    }, [killedPlayers, speak, t]);

    const getTargetName = (targetId: string | undefined): string => {
        if (!targetId) return t('common.none');
        const player = players.find(p => p.id === targetId);
        return player ? player.name : targetId;
    };

    const getActionSummary = (decision: NightDecision): string => {
        const { role, action } = decision;
        const roleName = typeof role === 'string' ? t(`games.werewolf.roles.${role}`) : role;

        switch (action.type) {
            case 'KILL':
                return t('games.werewolf.night_summary.kill', { role: roleName, target: getTargetName(action.targetId) });
            case 'HEAL':
                return t('games.werewolf.night_summary.heal', { role: roleName, target: getTargetName(action.targetId) });
            case 'PROTECT':
                return t('games.werewolf.night_summary.protect', { role: roleName, target: getTargetName(action.targetId) });
            case 'INFECT':
                return t('games.werewolf.night_summary.infect', { role: roleName, target: getTargetName(action.targetId) });
            case 'LINK_LOVERS':
                return t('games.werewolf.night_summary.link_lovers', {
                    role: roleName,
                    target1: getTargetName(action.targetIds?.[0]),
                    target2: getTargetName(action.targetIds?.[1])
                });
            case 'CHECK_ROLE': {
                const target = players.find(p => p.id === action.targetId);
                const roleKey = target?.role || 'VILLAGER';
                const translatedRole = t(`games.werewolf.roles.${roleKey}`);
                return t('games.werewolf.night_summary.check_role', {
                    role: roleName,
                    target: getTargetName(action.targetId),
                    result: translatedRole
                });
            }
            case 'COMPARE_CAMPS': {
                const p1 = players.find(p => p.id === action.targetIds?.[0]);
                const p2 = players.find(p => p.id === action.targetIds?.[1]);
                let resultStr = t('common.none');
                if (p1 && p2) {
                    const camp1 = isWerewolf(p1, customRoles) ? 'WOLF' : 'VILLAGER';
                    const camp2 = isWerewolf(p2, customRoles) ? 'WOLF' : 'VILLAGER';
                    resultStr = camp1 === camp2 ? t('games.werewolf.ui.detective.same_camp') : t('games.werewolf.ui.detective.different_camps');
                }
                return t('games.werewolf.night_summary.compare_camps', {
                    role: roleName,
                    target1: getTargetName(action.targetIds?.[0]),
                    target2: getTargetName(action.targetIds?.[1]),
                    result: resultStr
                });
            }
            case 'OIL':
                return t('games.werewolf.night_summary.oil', {
                    role: roleName,
                    targets: action.targetIds?.map(id => getTargetName(id)).join(', ')
                });
            case 'BURN':
                return t('games.werewolf.night_summary.burn', { role: roleName });
            case 'GIVE_EGG':
                return t('games.werewolf.night_summary.give_egg', {
                    role: roleName,
                    targets: action.targetIds?.map(id => getTargetName(id)).join(', ')
                });
            case 'CHOOSE_CAMP':
                return t('games.werewolf.night_summary.choose_camp', { role: roleName, camp: action.camp });
            case 'STEAL_ROLE':
                return t('games.werewolf.night_summary.steal_role', { role: roleName, target: getTargetName(action.targetId) });
            case 'PEEK':
                return t('games.werewolf.night_summary.peek', { role: roleName });
            case 'CURSE':
                return t('games.werewolf.night_summary.curse', { role: roleName, target: getTargetName(action.targetId) });
            case 'SLEEP':
                return t('games.werewolf.night_summary.sleep', { role: roleName, target: getTargetName(action.targetId) });
            case 'SURVIVE':
                return t('games.werewolf.night_summary.survive', { role: roleName });
            default:
                return `${roleName}: ${action.type}`;
        }
    };

    return (
        <Box maxWidth="sm" mx="auto" textAlign="center" mt={4}>
            <WbSunnyIcon sx={{ fontSize: 60, color: 'orange', mb: 2 }} />
            <Typography variant="h4" gutterBottom>{t('games.werewolf.narrator.day_label', { round })}</Typography>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    {killedPlayers.length > 0
                        ? t('games.werewolf.ui.died_last_night')
                        : t('games.werewolf.ui.peaceful_night')}
                </Typography>
                {killedPlayers.map(p => (
                    <Typography key={p.id} variant="body1" color="error">
                        💀 {p.name}
                    </Typography>
                ))}
            </Paper>

            {nightDecisions && nightDecisions.length > 0 && (
                <Accordion sx={{ mb: 3, textAlign: 'left' }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography color="primary" fontWeight="bold">
                            {t('games.werewolf.narrator.night_summary_label')}
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <List dense>
                            {nightDecisions.map((decision, index) => (
                                <ListItem key={index}>
                                    <ListItemText
                                        primary={getActionSummary(decision)}
                                        primaryTypographyProps={{ variant: 'body2' }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </AccordionDetails>
                </Accordion>
            )}

            <Button
                variant="contained"
                size="large"
                onClick={onNextPhase}
                sx={{ mt: 2 }}
            >
                {t('games.werewolf.ui.start_vote')}
            </Button>
        </Box >
    );
};
