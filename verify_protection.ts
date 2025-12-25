
import { gameReducer } from './src/games/werewolf/logic/gameReducer';
import { GameState, NightAction } from './src/games/werewolf/logic/types';

// Mock initial state
const initialState: GameState = {
    players: [
        { id: '1', name: 'Guardian', role: 'GUARDIAN', isAlive: true, needsToAct: false, powerState: {} },
        { id: '2', name: 'Hunter', role: 'HUNTER', isAlive: true, needsToAct: false, powerState: {} },
        { id: '3', name: 'Wolf', role: 'WEREWOLF', isAlive: true, needsToAct: false, powerState: {} }
    ],
    phase: 'NIGHT',
    round: 1,
    currentTurnPlayerId: null,
    nightActionLog: [],
    nightDecisions: [],
    winner: null,
    enabledRoles: [],
    customRoles: [],
    pendingHunterIds: [],
    nextPhaseAfterShot: null
};

// Step 1: Guardian Protects Hunter
const stateAfterProtect = gameReducer(initialState, {
    type: 'NIGHT_ACTION',
    role: 'GUARDIAN',
    action: { type: 'PROTECT', targetId: '2' }
});

console.log('After Protect - Hunter Protected?', stateAfterProtect.players.find(p => p.id === '2')?.powerState.isProtected);

// Step 2: Werewolf Kills Hunter
const stateAfterKill = gameReducer(stateAfterProtect, {
    type: 'NIGHT_ACTION',
    role: 'WEREWOLF',
    action: { type: 'KILL', targetId: '2' }
});

console.log('After Kill - Hunter ID in log?', stateAfterKill.nightActionLog.includes('2'));
console.log('After Kill - Hunter isDeadSoon?', stateAfterKill.players.find(p => p.id === '2')?.powerState.isDeadSoon);

if (!stateAfterKill.nightActionLog.includes('2')) {
    console.log('SUCCESS: Protection prevented kill log.');
} else {
    console.log('FAILURE: Hunter was added to kill log.');
}
