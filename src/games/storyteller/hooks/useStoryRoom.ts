import { useCallback, useEffect, useState } from 'react';
import { useRoomReducer } from '../../../modules/room-game';
import { usePartyRoomPlayers } from '../../../features/party/hooks/usePartyRoomPlayers';
import {
  initialStoryRoom,
  storyActorId,
  storyRoomAllows,
  storyRoomReducer,
  type StoryRoomAction,
  type StoryRoomState,
} from '../logic/storyRoom';

/**
 * Storyteller live in a party room [ID: HOOK-STORY-ROOM]: the party host runs the shared story
 * (`storyRoom.ts`), writers follow the room's seat order.
 */
export function useStoryRoom(roomId: string, language: string) {
  const room = usePartyRoomPlayers(roomId);
  const [initialState] = useState<StoryRoomState>(() =>
    initialStoryRoom(room.isHost ? room.myId : ''),
  );
  const { state, dispatch, synced } = useRoomReducer<StoryRoomState, StoryRoomAction>({
    gameKey: 'storyteller',
    roomId,
    playerId: room.myId,
    isHost: room.isHost,
    reducer: storyRoomReducer,
    authorize: storyRoomAllows,
    initialState,
  });

  // The host starts the story once at least two players are in the room.
  const roster = room.players;
  useEffect(() => {
    if (!room.isHost || state.game || roster.length < 2) return;
    dispatch({
      type: 'start',
      players: roster.map((p) => ({ id: p.id, name: p.name })),
      language,
    });
  }, [room.isHost, state.game, roster, language, dispatch]);

  const submitTurn = useCallback(
    async (text: string, timeSpentSeconds?: number) =>
      dispatch({ type: 'submit', text, timeSpentSeconds }),
    [dispatch],
  );
  const finishStory = useCallback(async () => dispatch({ type: 'finish' }), [dispatch]);

  return {
    ...room,
    state,
    synced,
    isMyTurn: storyActorId(state) === room.myId,
    submitTurn,
    finishStory,
  };
}
