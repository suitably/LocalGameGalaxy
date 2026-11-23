/**
 * A dice game played in a party room, everyone on their own device [ID: HOOK-PARTY-ROOM-GAME]
 *
 * What Knister, Kniffel and Qwixx share in a room: the roster (`usePartyRoomPlayers`), the host's
 * reducer over the room transport (`useRoomReducer`), guests following the host to the lobby,
 * the header back arrow to the lobby, and the host dealing once the players are known.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHeaderLayout } from '../../../context/headerLayoutContextCore';
import { useWakeLock } from '../../../hooks/useWakeLock';
import { useRoomEvents, useRoomReducer } from '../../../modules/room-game';
import { HELP_GAME_KEY, mayHelp, withHelp, type HelpEvent } from '../logic/partyHelp';
import { universalPartyManager } from '../logic/universalPartyManager';
import { useFollowPartyLobby } from './useFollowPartyLobby';
import { usePartyRoomPlayers, type RoomPlayer } from './usePartyRoomPlayers';

interface Options<S, A> {
  gameKey: string;
  roomId: string;
  reducer: (state: S, action: A) => S;
  authorize: (state: S, action: A, from: string) => boolean;
  initialState: S;
  /** True while the host still has to deal (no players in the game state yet). */
  needsStart: (state: S) => boolean;
  /** The host's start action for the room's players. */
  start: (hostId: string, players: RoomPlayer[]) => A;
  /** Whose turn it is (turn-based games): a helper may play that turn (`logic/partyHelp.ts`). */
  actorOf?: (state: S) => string | null;
}

/** A resumed state names the new host where the game keeps one (`hostId`: deal, restart). */
function withHost<S>(state: S, hostId: string): S {
  const s = state as S & { hostId?: unknown };
  return typeof s?.hostId === 'string' ? { ...s, hostId } : state;
}

export function usePartyRoomGame<S, A>({
  gameKey,
  roomId,
  reducer,
  authorize,
  initialState,
  needsStart,
  start,
  actorOf,
}: Options<S, A>) {
  const navigate = useNavigate();
  useFollowPartyLobby(roomId);
  useWakeLock(true);
  const room = usePartyRoomPlayers(roomId, { liveHost: true });
  // In a Stammtisch every device keeps the running game, so it can be resumed on another day.
  const [resumeTag] = useState(() => {
    const party = universalPartyManager.getRoomState();
    return party?.roomId === roomId && party.stammtisch ? String(party.statusAt ?? 0) : undefined;
  });
  const myId = room.myId;
  const adoptState = useCallback((state: S) => withHost(state, myId), [myId]);
  // The host also accepts actions from players someone allowed to help them.
  const players = room.players;
  const helpedAuthorize = useMemo(() => withHelp(authorize, () => players), [authorize, players]);
  const game = useRoomReducer<S, A>({
    gameKey,
    roomId,
    playerId: room.myId,
    isHost: room.isHost,
    reducer,
    authorize: helpedAuthorize,
    initialState,
    resumeTag,
    adoptState,
  });
  const { state, dispatch } = game;

  // The host deals once the room's players are known.
  const roster = room.players;
  const dealt = !needsStart(state);
  useEffect(() => {
    if (room.isHost && !dealt && roster.length > 0) dispatch(start(room.myId, roster));
  }, [room.isHost, room.myId, roster, dealt, dispatch, start]);

  // Header back arrow = party lobby; the game goes on while this device visits it (#657).
  const { setHomeAction } = useHeaderLayout();
  useEffect(() => {
    setHomeAction(() => navigate(`/party?room=${roomId}`));
    return () => setHomeAction(null);
  }, [navigate, roomId, setHomeAction]);

  // Playing for someone else: their device is told who did it (`PartyHelpNotice`).
  const actor = actorOf?.(state) ?? null;
  const actingFor = actor && mayHelp(room.players, myId, actor) ? actor : null;
  const { send } = useRoomEvents<HelpEvent>({ gameKey: HELP_GAME_KEY, roomId, onEvent: () => {} });
  const dispatchFor = useCallback(
    (playerId: string, action: A) => {
      if (playerId !== myId) send({ type: 'helped', by: myId, for: playerId, at: Date.now() });
      dispatch(action);
    },
    [send, myId, dispatch],
  );
  const playerDispatch = useCallback(
    (action: A) => dispatchFor(actingFor ?? myId, action),
    [dispatchFor, actingFor, myId],
  );
  const helpable = useMemo(
    () => room.players.filter((p) => mayHelp(room.players, myId, p.id)),
    [room.players, myId],
  );

  return {
    room,
    ...game,
    dispatch: playerDispatch,
    /** Dispatches an action done for `playerId` (announced to them when it is not this device). */
    dispatchFor,
    /** Players this device may play for (they allowed help). */
    helpable,
    /** The player whose turn this device may play now: itself, or someone it may help. */
    actingFor,
    canAct: actor !== null && (actor === myId || actingFor !== null),
  };
}
