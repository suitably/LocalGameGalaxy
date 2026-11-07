import { describe, expect, it } from 'vitest';
import { createMemoryTransport, RoomStatePeer } from '../../../modules/room-game';
import {
  initialStoryRoom,
  storyRoomAllows,
  storyRoomReducer,
  type StoryRoomAction,
  type StoryRoomState,
} from './storyRoom';

const players = [
  { id: 'h', name: 'Hanna' },
  { id: 'a', name: 'Alex' },
  { id: 'b', name: 'Bo' },
];
const start: StoryRoomAction = { type: 'start', players, language: 'en' };

function peer(t: ReturnType<typeof createMemoryTransport>, id: string, isHost: boolean) {
  return new RoomStatePeer<StoryRoomState, StoryRoomAction>({
    transport: t,
    channel: 'storyteller_ROOM',
    playerId: id,
    isHost,
    reducer: storyRoomReducer,
    authorize: storyRoomAllows,
    initialState: initialStoryRoom(isHost ? 'h' : ''),
    onChange: () => {},
  });
}

describe('storyRoomReducer', () => {
  it('turns follow the seat order and wrap around', () => {
    let s = storyRoomReducer(initialStoryRoom('h'), start);
    for (const text of ['Once upon', 'a time there', 'was a cat', 'who slept']) {
      s = storyRoomReducer(s, { type: 'submit', text });
    }
    expect(s.entries.map((e) => e.authorName)).toEqual(['Hanna', 'Alex', 'Bo', 'Hanna']);
    expect(s.game?.currentPlayerIndex).toBe(1);
    expect(s.game?.statistics?.totalWords).toBe(10);
  });

  it('ignores empty text and finishes the story', () => {
    let s = storyRoomReducer(initialStoryRoom('h'), start);
    expect(storyRoomReducer(s, { type: 'submit', text: '   ' })).toBe(s);
    s = storyRoomReducer(s, { type: 'finish' });
    expect(s.game?.status).toBe('completed');
    expect(storyRoomReducer(s, { type: 'submit', text: 'late' })).toBe(s);
  });

  it('only the writer whose turn it is may submit', () => {
    const s = storyRoomReducer(initialStoryRoom('h'), start);
    const submit: StoryRoomAction = { type: 'submit', text: 'x' };
    expect(storyRoomAllows(s, submit, 'h')).toBe(true);
    expect(storyRoomAllows(s, submit, 'a')).toBe(false);
    expect(storyRoomAllows(s, { type: 'finish' }, 'b')).toBe(false);
    expect(storyRoomAllows(s, { type: 'finish' }, 'h')).toBe(true);
  });
});

describe('Story over RoomStatePeer', () => {
  it('three players write in turn', () => {
    const t = createMemoryTransport();
    const host = peer(t, 'h', true);
    host.start();
    const a = peer(t, 'a', false);
    a.start();
    const b = peer(t, 'b', false);
    b.start();
    host.dispatch(start);

    a.dispatch({ type: 'submit', text: 'too early' });
    expect(b.current.state.entries).toHaveLength(0);
    host.dispatch({ type: 'submit', text: 'First line' });
    a.dispatch({ type: 'submit', text: 'Second line' });
    b.dispatch({ type: 'submit', text: 'Third line' });
    expect(a.current.state.entries.map((e) => e.text)).toEqual([
      'First line',
      'Second line',
      'Third line',
    ]);
    b.dispatch({ type: 'finish' }); // not b's turn any more
    host.dispatch({ type: 'finish' });
    expect(b.current.state.game?.status).toBe('completed');
  });
});
