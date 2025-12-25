
import { gameReducer } from './src/games/werewolf/logic/gameReducer.ts';
import { GameState, NightAction } from './src/games/werewolf/logic/types.ts';

// Mock initial state with Hunter and Werewolf
const initialState: GameState = {
    players: [
        { id: '1', name: 'Hunter', role: 'HUNTER', isAlive: true, needsToAct: false, powerState: {} },
        { id: '2', name: 'Wolf', role: 'WEREWOLF', isAlive: true, needsToAct: false, powerState: {} },
        { id: '3', name: 'Villager', role: 'VILLAGER', isAlive: true, needsToAct: false, powerState: {} }
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

// Step 1: Werewolf kills Hunter
const stateAfterKill = gameReducer(initialState, {
    type: 'NIGHT_ACTION',
    role: 'WEREWOLF',
    action: { type: 'KILL', targetId: '1' }
});

console.log('After Kill log:', stateAfterKill.nightActionLog);

// Step 2: Transition to Day (NEXT_PHASE)
const stateDay = gameReducer(stateAfterKill, {
    type: 'NEXT_PHASE'
});

console.log('Detailed State Day Phase:', stateDay.phase);
console.log('Pending Hunter IDs:', stateDay.pendingHunterIds);
console.log('Hunter Alive?:', stateDay.players.find(p => p.id === '1').isAlive);
console.log('Players:', JSON.stringify(stateDay.players, null, 2));

if (stateDay.phase === 'HUNTER_SHOT') {
    console.log('SUCCESS: Transitioned to HUNTER_SHOT phase.');
} else {
    console.log('FAILURE: Did NOT transition to HUNTER_SHOT phase. Current phase:', stateDay.phase);
}
