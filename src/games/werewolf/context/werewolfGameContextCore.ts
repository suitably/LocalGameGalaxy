import { createContext, useContext } from 'react';
import type { Action, GameState, NightAction, PlayerId, Role, RoleDefinition } from '../logic/types';
import type { SavedGameInfo } from '../hooks/useGameStatePersistence';

export interface WerewolfContextType {
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
    isInitialized: boolean;
    showContinueDialog: boolean;
    savedGameInfo: SavedGameInfo | null;
    handleContinueGame: () => void;
    handleNewGame: () => void;
    addPlayer: (name: string) => void;
    removePlayer: (id: PlayerId) => void;
    clearAllPlayers: () => void;
    startGame: (roles: Role[]) => void;
    nextPhase: () => void;
    killPlayer: (id: PlayerId) => void;
    resetGame: () => void;
    saveCustomRoles: (roles: RoleDefinition[]) => void;
    executeNightAction: (action: NightAction, role: Role) => void;
    executeHunterShot: (targetId: string) => void;
}

export const WerewolfGameContext = createContext<WerewolfContextType | null>(null);

export const useWerewolfGame = (): WerewolfContextType => {
    const context = useContext(WerewolfGameContext);
    if (!context) {
        throw new Error('useWerewolfGame must be used within a WerewolfGameProvider');
    }
    return context;
};
