/**
 * Werewolf in a party room: sealed game plus the host's chores [ID: HOOK-WEREWOLF-ROOM]
 *
 * The host keeps the roster in step during setup and narrates by voice: nightfall, every role
 * it calls, the morning and the vote. Each device holds only its own view (`werewolfRoomView`).
 */
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useSealedPartyGame } from '../../../features/party/hooks/useSealedPartyGame';
import type { SealedGame } from '../../../modules/room-game/sealed/sealedRoomPeer';
import type { NightAction, Role } from '../logic/types';
import {
  INITIAL_WEREWOLF_ROOM,
  werewolfRoomAllows,
  werewolfRoomReducer,
  type WerewolfRoomAction,
  type WerewolfRoomState,
} from '../logic/werewolfRoom';
import { werewolfRoomView, type WerewolfRoomView } from '../logic/werewolfRoomView';
import { useTTS } from './useTTS';

const GAME: SealedGame<WerewolfRoomState, WerewolfRoomAction, WerewolfRoomView> = {
  reducer: werewolfRoomReducer,
  allows: werewolfRoomAllows,
  playerIds: (state) => state.game.players.map((p) => p.id),
  viewFor: werewolfRoomView,
};

/** The narrator's line for what the room shows now, or `null`. */
function narration(view: WerewolfRoomView, t: TFunction) {
  const name = (id: string | null) => view.players.find((p) => p.id === id)?.name ?? '';
  switch (view.phase) {
    case 'NIGHT':
      if (!view.calling) return null;
      return [
        // The first call of a night opens it.
        view.callIndex === 0 ? t('games.werewolf.room.narrate_night') : '',
        t('games.werewolf.room.narrate_call', { role: t(`games.werewolf.roles.${view.calling}`) }),
      ].join(' ');
    case 'DAY':
      return view.victims.length > 0
        ? t('games.werewolf.room.narrate_day', { names: view.victims.map(name).join(', ') })
        : t('games.werewolf.room.narrate_day_none');
    case 'VOTING':
      return t('games.werewolf.room.narrate_vote');
    case 'HUNTER_SHOT':
      return t('games.werewolf.room.narrate_hunter', { name: name(view.hunter) });
    default:
      return null;
  }
}

export function useWerewolfRoom(roomId: string) {
  const { t } = useTranslation();
  const { room, view, dispatch, synced } = useSealedPartyGame({
    gameKey: 'werewolf',
    roomId,
    game: GAME,
    initialState: INITIAL_WEREWOLF_ROOM,
  });
  const isHost = room.isHost;
  const myId = room.myId;
  const tts = useTTS();

  // The roster follows the room until the game starts (the reducer ignores it afterwards).
  const roster = room.players;
  useEffect(() => {
    if (isHost && roster.length > 0)
      dispatch({
        type: 'SETUP',
        hostId: myId,
        players: roster.map(({ id, name }) => ({ id, name })),
      });
  }, [isHost, myId, roster, dispatch]);

  // The host narrates; nobody else speaks, so the room hears one voice.
  const line = view ? narration(view, t) : null;
  const { speak } = tts;
  useEffect(() => {
    if (isHost && line) speak(line);
  }, [isHost, line, speak]);

  const start = useCallback(
    (roles: Role[], narrator: boolean) => dispatch({ type: 'START', roles, narrator }),
    [dispatch],
  );
  const nightAction = useCallback(
    (action: NightAction) => dispatch({ type: 'NIGHT_ACTION', playerId: myId, action }),
    [dispatch, myId],
  );
  const nightSkip = useCallback(
    () => dispatch({ type: 'NIGHT_SKIP', playerId: myId }),
    [dispatch, myId],
  );

  return { room, view, dispatch, synced, isHost, myId, line, tts, start, nightAction, nightSkip };
}
