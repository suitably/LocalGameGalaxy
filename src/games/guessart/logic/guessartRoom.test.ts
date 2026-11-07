import { describe, expect, it } from 'vitest';
import { createMemoryTransport, RoomStatePeer } from '../../../modules/room-game';
import {
  guessArtRoomAllows,
  guessArtRoomReducer,
  initialGuessArtRoom,
  type GuessArtRoomAction,
  type GuessArtRoomState,
} from './guessartRoom';

const players = [
  { id: 'h', name: 'Hanna' },
  { id: 'a', name: 'Alex' },
  { id: 'b', name: 'Bo' },
];
const start: GuessArtRoomAction = { type: 'start', players, language: 'en', manual: true };
const pick: GuessArtRoomAction = {
  type: 'selectWord',
  payload: { word: 'Cat' },
  language: 'en',
};

function peer(t: ReturnType<typeof createMemoryTransport>, id: string, isHost: boolean) {
  return new RoomStatePeer<GuessArtRoomState, GuessArtRoomAction>({
    transport: t,
    channel: 'guessart_ROOM',
    playerId: id,
    isHost,
    reducer: guessArtRoomReducer,
    authorize: guessArtRoomAllows,
    initialState: initialGuessArtRoom(isHost ? 'h' : ''),
    onChange: () => {},
  });
}

describe('guessArtRoomReducer', () => {
  it('starts with the first player drawing and the next one guessing', () => {
    const s = guessArtRoomReducer(initialGuessArtRoom('h'), start);
    expect(s.game?.status).toBe('selecting');
    expect(s.round?.drawnById).toBe('h');
    expect(s.round?.guesserId).toBe('a');
  });

  it('rotates after a correct guess: the guesser draws next', () => {
    let s = guessArtRoomReducer(initialGuessArtRoom('h'), start);
    s = guessArtRoomReducer(s, pick);
    s = guessArtRoomReducer(s, { type: 'submitDrawing', canvasData: '{}' });
    expect(s.game?.status).toBe('guessing');
    s = guessArtRoomReducer(s, { type: 'guess', guess: 'Dog' });
    expect(s.round?.guesses).toEqual(['Dog']);
    s = guessArtRoomReducer(s, { type: 'guess', guess: 'cat' });
    expect(s.completed?.word).toBe('Cat');
    expect(s.game?.roundNumber).toBe(2);
    expect(s.round?.drawnById).toBe('a');
    expect(s.round?.guesserId).toBe('b');
  });

  it('authorizes only the player whose turn it is', () => {
    const s = guessArtRoomReducer(initialGuessArtRoom('h'), start);
    expect(guessArtRoomAllows(s, pick, 'h')).toBe(true);
    expect(guessArtRoomAllows(s, pick, 'a')).toBe(false);
    expect(guessArtRoomAllows(s, { type: 'guess', guess: 'x' }, 'a')).toBe(false);
    expect(guessArtRoomAllows(initialGuessArtRoom('h'), start, 'a')).toBe(false);
  });
});

describe('GuessArt round over RoomStatePeer', () => {
  it('three players play one round', () => {
    const t = createMemoryTransport();
    const host = peer(t, 'h', true);
    host.start();
    const a = peer(t, 'a', false);
    a.start();
    const b = peer(t, 'b', false);
    b.start();
    host.dispatch(start);
    expect(b.current.state.round?.drawnById).toBe('h');

    a.dispatch(pick); // not a's turn
    expect(host.current.state.game?.status).toBe('selecting');
    host.dispatch(pick);
    host.dispatch({ type: 'submitDrawing', canvasData: '{"elements":[]}' });
    expect(b.current.state.round?.status).toBe('guessing');

    b.dispatch({ type: 'guess', guess: 'cat' }); // b is not the guesser
    expect(host.current.state.completed).toBeNull();
    a.dispatch({ type: 'hint', language: 'en' });
    expect(host.current.state.round?.hintLevel).toBe(1);
    a.dispatch({ type: 'guess', guess: 'cat' });
    expect(b.current.state.completed?.guesserName).toBe('Alex');
    expect(b.current.state.round?.drawnById).toBe('a');
  });
});
