import { gameReducer } from './src/games/werewolf/logic/gameReducer.ts';
import { INITIAL_STATE, GameState, Action, Player } from './src/games/werewolf/logic/types.ts';
import { DEFAULT_ROLES } from './src/games/werewolf/logic/defaultRoles.ts';

// Mock initial state
const createPlayer = (id: string, role: string, name: string): Player => ({
    id,
    name,
    role: role,
    isAlive: true,
    needsToAct: false,
    powerState: {}
});

const runTest = () => {
    console.log('Starting Easter Bunny Win Verification...');

    let state: GameState = {
        ...INITIAL_STATE,
        players: [
            createPlayer('p1', 'EASTER_BUNNY', 'Bunny'),
            createPlayer('p2', 'VILLAGER', 'Alice'),
            createPlayer('p3', 'WEREWOLF', 'Wolf') // Added a Werewolf to prevent immediate Villager win
        ],
        phase: 'NIGHT',
        round: 1
    };

    console.log('Initial State: 3 players (Bunny, Alice, Wolf). No eggs.');

    // Bunny gives eggs to Alice and Wolf
    const giveEggAction: Action = {
        type: 'NIGHT_ACTION',
        role: 'EASTER_BUNNY',
        action: {
            type: 'GIVE_EGG',
            targetIds: ['p2', 'p3'] // Alice, Wolf
        }
    };

    state = gameReducer(state, giveEggAction);
    console.log('After giving eggs to Alice and Wolf:');
    console.log('Winner:', state.winner);

    // Expected: No winner yet, because Bunny doesn't have an egg.
    if (state.winner) {
        console.error('FAIL: Game ended too early. Winner:', state.winner);
        return;
    }

    // Bunny gives egg to self 
    const giveSelfEggAction: Action = {
        type: 'NIGHT_ACTION',
        role: 'EASTER_BUNNY',
        action: {
            type: 'GIVE_EGG',
            targetIds: ['p1']
        }
    };

    state = gameReducer(state, giveSelfEggAction);
    console.log('After giving egg to self:');
    console.log('Winner:', state.winner);

    if (state.winner === 'EASTER_BUNNY') {
        console.log('PASS: Easter Bunny won!');
    } else {
        console.error('FAIL: Easter Bunny did not win. Winner is:', state.winner);
        state.players.forEach(p => console.log(`${p.name} (${p.role}) hasEgg: ${p.powerState.hasEgg}`));
    }
};

runTest();
