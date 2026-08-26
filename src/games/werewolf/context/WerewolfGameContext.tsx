import React, { createContext, useContext, useReducer, useEffect, useState, useMemo, useCallback } from 'react';
import { gameReducer } from '../logic/gameReducer';
import { INITIAL_STATE } from '../logic/types';
import type { GameState, Action, Role, RoleDefinition, NightAction, PlayerId } from '../logic/types';
import { useGameStatePersistence, type SavedGameInfo } from '../hooks/useGameStatePersistence';
import { storage, STORAGE_KEYS } from '../../../lib/storage';

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

const WerewolfGameContext = createContext<WerewolfContextType | null>(null);

export const WerewolfGameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { saveGameState, loadGameState, getSavedGameInfo, clearSavedGame, hasSavedGame } = useGameStatePersistence();

    const [showContinueDialog, setShowContinueDialog] = useState(false);
    const [savedGameInfo, setSavedGameInfo] = useState<SavedGameInfo | null>(getSavedGameInfo());
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize game state with persisted setup players directly in initializer function (Fix N1 as well)
    const [gameState, dispatch] = useReducer(gameReducer, INITIAL_STATE, (initial) => {
        try {
            const savedPlayers = storage.getJson(STORAGE_KEYS.WEREWOLF_SETUP_PLAYERS, null);
            const savedCustomRoles = storage.getJson(STORAGE_KEYS.WEREWOLF_CUSTOM_ROLES, null);
            return {
                ...initial,
                ...(savedPlayers ? { players: savedPlayers } : {}),
                ...(savedCustomRoles ? { customRoles: savedCustomRoles } : {})
            };
        } catch {
            return initial;
        }
    });

    // Check for saved game on mount
    useEffect(() => {
        if (hasSavedGame()) {
            setSavedGameInfo(getSavedGameInfo());
            setShowContinueDialog(true);
        } else {
            setIsInitialized(true);
        }
    }, [getSavedGameInfo, hasSavedGame]);

    // Save game state whenever it changes (after initialization)
    useEffect(() => {
        if (isInitialized) {
            saveGameState(gameState);
        }
    }, [gameState, isInitialized, saveGameState]);

    // Persist setup players when in SETUP phase
    useEffect(() => {
        if (gameState.phase === 'SETUP') {
            storage.setJson(STORAGE_KEYS.WEREWOLF_SETUP_PLAYERS, gameState.players);
        }
    }, [gameState.players, gameState.phase]);

    const handleContinueGame = useCallback(() => {
        const savedState = loadGameState();
        if (savedState) {
            dispatch({ type: 'RESTORE_STATE', state: savedState });
        }
        setShowContinueDialog(false);
        setIsInitialized(true);
    }, [loadGameState]);

    const handleNewGame = useCallback(() => {
        clearSavedGame();
        setShowContinueDialog(false);
        setIsInitialized(true);
    }, [clearSavedGame]);

    const addPlayer = useCallback((name: string) => {
        dispatch({ type: 'ADD_PLAYER', name });
    }, []);

    const removePlayer = useCallback((id: PlayerId) => {
        dispatch({ type: 'REMOVE_PLAYER', id });
    }, []);

    const clearAllPlayers = useCallback(() => {
        dispatch({ type: 'CLEAR_ALL_PLAYERS' });
    }, []);

    const startGame = useCallback((roles: Role[]) => {
        dispatch({ type: 'START_GAME', roles });
    }, []);

    const nextPhase = useCallback(() => {
        dispatch({ type: 'NEXT_PHASE' });
    }, []);

    const killPlayer = useCallback((id: PlayerId) => {
        dispatch({ type: 'KILL_PLAYER', id });
    }, []);

    const resetGame = useCallback(() => {
        dispatch({ type: 'RESET_GAME' });
    }, []);

    const saveCustomRoles = useCallback((roles: RoleDefinition[]) => {
        dispatch({ type: 'SAVE_CUSTOM_ROLES', roles });
        storage.setJson(STORAGE_KEYS.WEREWOLF_CUSTOM_ROLES, roles);
    }, []);

    const executeNightAction = useCallback((action: NightAction, role: Role) => {
        dispatch({ type: 'NIGHT_ACTION', action, role });
    }, []);

    const executeHunterShot = useCallback((targetId: string) => {
        dispatch({ type: 'HUNTER_SHOT', targetId });
    }, []);

    const value = useMemo<WerewolfContextType>(() => ({
        gameState,
        dispatch,
        isInitialized,
        showContinueDialog,
        savedGameInfo,
        handleContinueGame,
        handleNewGame,
        addPlayer,
        removePlayer,
        clearAllPlayers,
        startGame,
        nextPhase,
        killPlayer,
        resetGame,
        saveCustomRoles,
        executeNightAction,
        executeHunterShot,
    }), [
        gameState,
        isInitialized,
        showContinueDialog,
        savedGameInfo,
        handleContinueGame,
        handleNewGame,
        addPlayer,
        removePlayer,
        clearAllPlayers,
        startGame,
        nextPhase,
        killPlayer,
        resetGame,
        saveCustomRoles,
        executeNightAction,
        executeHunterShot
    ]);

    return (
        <WerewolfGameContext.Provider value={value}>
            {children}
        </WerewolfGameContext.Provider>
    );
};

export const useWerewolfGame = (): WerewolfContextType => {
    const context = useContext(WerewolfGameContext);
    if (!context) {
        throw new Error('useWerewolfGame must be used within a WerewolfGameProvider');
    }
    return context;
};
