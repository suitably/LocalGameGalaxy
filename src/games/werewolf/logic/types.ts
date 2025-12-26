export type RoleAlignment = 'VILLAGER' | 'WEREWOLF' | 'NEUTRAL';

export interface Ability {
    type: NightAction['type'];
    usesPerGame?: number;
    usesPerNight?: number;
    timing: 'FIRST_NIGHT' | 'EVERY_NIGHT' | 'ROUND_NUMBER';
    roundNumber?: number;
    targetCount: number;
}

export interface RoleDefinition {
    id: string;
    name: string;
    description: string;
    icon: string;
    alignment: RoleAlignment;
    abilities: Ability[];
    isCustom?: boolean;
    narratorText?: string;
    inheritsFrom?: string;
}

export type Role =
    | 'VILLAGER'
    | 'WITCH'
    | 'SEER'
    | 'CUPID'
    | 'LITTLE_GIRL'
    | 'DETECTIVE'
    | 'GUARDIAN'
    | 'BLACK_CAT'
    | 'HUNTER'
    | 'WISE'
    | 'WEREWOLF'
    | 'BLACK_WEREWOLF'
    | 'WHITE_WEREWOLF'
    | 'ANGEL'
    | 'EASTER_BUNNY'
    | 'WOLFDOG'
    | 'RIPPER'
    | 'SURVIVOR'
    | 'PYROMANIAC'
    | 'THIEF'
    | 'DORFMATRATZE'
    | string; // Support for custom role IDs

export type PlayerId = string;

export interface PlayerPowerState {
    hasHealPotion?: boolean;
    hasKillPotion?: boolean;
    protectionsLeft?: number;
    canSurviveWerewolf?: boolean;
    hasInfected?: boolean;
    isOiled?: boolean;
    hasEgg?: boolean;
    loverIds?: PlayerId[];
    isProtectedByGuardian?: boolean;
    isDragonInfected?: boolean; // Wait, Black Werewolf infects, let's call it isInfected
    isInfected?: boolean;
    isDoubleVoted?: boolean;
    isCursed?: boolean;
    chosenCamp?: 'VILLAGER' | 'WEREWOLF'; // For Wolfdog
    hasEGG?: boolean; // Wait, hasEgg was already there
    eggCount?: number;
    wasOiled?: boolean;
    isProtectedBySurvivor?: boolean;
    isProtectedByWise?: boolean;
    isDeadSoon?: boolean; // For Witch's victim
    isProtected?: boolean; // Unified protection flag (Guardian, Survivor, etc.)
    hasShot?: boolean; // For Hunter
    sleepingAt?: PlayerId; // For Dorfmatratze
}

export type NightAction =
    | { type: 'KILL'; targetId: string }
    | { type: 'HEAL'; targetId: string }
    | { type: 'PROTECT'; targetId: string }
    | { type: 'INFECT'; targetId: string }
    | { type: 'LINK_LOVERS'; targetIds: [string, string] }
    | { type: 'CHECK_ROLE'; targetId: string }
    | { type: 'COMPARE_CAMPS'; targetIds: [string, string] }
    | { type: 'OIL'; targetIds: string[] }
    | { type: 'BURN' }
    | { type: 'GIVE_EGG'; targetIds: string[] }
    | { type: 'CHOOSE_CAMP'; camp: 'VILLAGER' | 'WEREWOLF' }
    | { type: 'STEAL_ROLE'; targetId: string }
    | { type: 'PEEK' }
    | { type: 'CURSE'; targetId: string }
    | { type: 'SLEEP'; targetId: string }
    | { type: 'SURVIVE' }
    | { type: 'NONE' };

export interface NightDecision {
    role: Role;
    action: NightAction;
}

export interface Player {
    id: PlayerId;
    name: string;
    role: Role | null;
    isAlive: boolean;
    needsToAct: boolean;
    powerState: PlayerPowerState;
}

export type Action =
    | { type: 'ADD_PLAYER'; name: string }
    | { type: 'REMOVE_PLAYER'; id: PlayerId }
    | { type: 'CLEAR_ALL_PLAYERS' }
    | { type: 'START_GAME'; roles: Role[] }
    | { type: 'NEXT_PHASE' }
    | { type: 'KILL_PLAYER'; id: PlayerId }
    | { type: 'RESET_GAME' }
    | { type: 'RESTORE_STATE'; state: GameState }
    | { type: 'SAVE_CUSTOM_ROLES'; roles: RoleDefinition[] }
    | { type: 'NIGHT_ACTION'; action: NightAction; role: Role }
    | { type: 'HUNTER_SHOT'; targetId: string };

export type GamePhase =
    | 'SETUP'
    | 'ROLE_REVEAL'
    | 'NIGHT'
    | 'DAY'
    | 'VOTING'
    | 'HUNTER_SHOT'
    | 'GAME_OVER';

export interface GameState {
    players: Player[];
    phase: GamePhase;
    round: number;
    currentTurnPlayerId: PlayerId | null;
    nightActionLog: string[];
    nightDecisions: NightDecision[];
    winner: 'VILLAGERS' | 'WEREWOLVES' | 'WHITE_WEREWOLF' | 'LOVERS' | 'ANGEL' | 'RIPPER' | 'SURVIVOR' | 'PYROMANIAC' | 'EASTER_BUNNY' | null;
    enabledRoles: Role[];
    customRoles: RoleDefinition[];
    pendingHunterIds: string[];
    nextPhaseAfterShot: GamePhase | null;
}

export const INITIAL_STATE: GameState = {
    players: [],
    phase: 'SETUP',
    round: 0,
    currentTurnPlayerId: null,
    nightActionLog: [],
    nightDecisions: [],
    winner: null,
    enabledRoles: ['VILLAGER', 'WEREWOLF', 'SEER', 'WITCH', 'HUNTER'], // Default basic roles
    customRoles: [],
    pendingHunterIds: [],
    nextPhaseAfterShot: null,
};

// Modular phase configuration - easily change game flow order here
export const GAME_PHASES: GamePhase[] = ['SETUP', 'ROLE_REVEAL', 'NIGHT', 'DAY'];

// Get next phase in the game flow
export const getNextPhase = (current: GamePhase): { phase: GamePhase; incrementRound: boolean } => {
    switch (current) {
        case 'SETUP':
            return { phase: 'ROLE_REVEAL', incrementRound: false };
        case 'ROLE_REVEAL':
            return { phase: 'NIGHT', incrementRound: true }; // Round 1 starts
        case 'NIGHT':
            return { phase: 'DAY', incrementRound: false };
        case 'DAY':
            return { phase: 'VOTING', incrementRound: false };
        case 'VOTING':
            return { phase: 'NIGHT', incrementRound: true }; // New round
        default:
            return { phase: current, incrementRound: false };
    }
};
