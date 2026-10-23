/**
 * State and actions of the party lobby [ID: HOOK-PARTY-LOBBY-CONTROLLER]
 *
 * Seed of the controller planned in #359: the lobby component only renders what this returns.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  universalPartyManager,
  type PartyRoomState,
  type PartyGameType,
} from '../logic/universalPartyManager';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import { getOrCreatePlayerName, savePlayerName } from '../logic/playerName';
import { seatOf } from '../logic/partyRoster';
import {
  buildPartyShareUrl,
  getGameRoute as resolveGameRoute,
  resolveLobbyEntry,
  resolvePendingLaunch,
} from '../logic/partyRoutes';

export function usePartyLobbyController(initialRoomId?: string) {
  const navigate = useNavigate();

  const [playerName, setPlayerName] = useState<string>(() => getOrCreatePlayerName());

  // Which room to open is decided purely here; joining/creating happens in the effect below.
  const [entry] = useState(() => resolveLobbyEntry(initialRoomId));
  // A game picked on the Spieltisch: the host starts it once everybody has joined.
  const [pendingLaunch, setPendingLaunch] = useState(() =>
    entry.kind === 'create' ? resolvePendingLaunch() : null,
  );
  const [roomId, setRoomId] = useState<string>(() =>
    entry.kind === 'join' ? entry.roomId : universalPartyManager.getSavedHostRoomCode(),
  );

  useEffect(() => {
    if (entry.kind === 'create') {
      universalPartyManager.createParty(playerName, roomId);
    }
    // Runs once on mount: later name/room changes go through their own handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [roomState, setRoomState] = useState<PartyRoomState | null>(() =>
    universalPartyManager.getRoomState(),
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [showQr, setShowQr] = useState<boolean>(false);

  // Edit Room Code Dialog State
  const [editRoomOpen, setEditRoomOpen] = useState<boolean>(false);
  const [customRoomInput, setCustomRoomInput] = useState<string>(roomId);

  // Edit My Name Dialog State
  const [editNameOpen, setEditNameOpen] = useState<boolean>(false);
  const [editNameInput, setEditNameInput] = useState<string>(playerName);

  const serverUrl = storage.getHelperUrl();
  const isServerActive = storage.isHelperActive();

  const [pickerOpen, setPickerOpen] = useState<boolean>(false);

  const getGameRoute = (gameType: PartyGameType | null, tabletopGameId?: string | null) => {
    const myId = universalPartyManager.getMyPlayerId();
    return resolveGameRoute({
      gameType,
      tabletopGameId,
      roomId,
      isHost: universalPartyManager.isHost(roomId),
      seat: seatOf(roomState?.players ?? [], myId),
    });
  };

  useEffect(() => {
    universalPartyManager.subscribeToParty(roomId);
    if (!universalPartyManager.isHost(roomId)) {
      universalPartyManager.joinParty(roomId, playerName);
    }

    const unsubscribe = universalPartyManager.onPartyUpdate((updated) => {
      setRoomState(updated);
      const myId = universalPartyManager.getMyPlayerId();
      const myPlayer = updated.players.find((p) => p.id === myId);
      if (myPlayer && myPlayer.name !== playerName) {
        setPlayerName(myPlayer.name);
        savePlayerName(myPlayer.name);
      }

      if (
        updated.status === 'in_game' &&
        !universalPartyManager.isHost(roomId) &&
        updated.activeGame
      ) {
        // Route from the updated roster: the seat is the slot the host assigned.
        navigate(
          resolveGameRoute({
            gameType: updated.activeGame,
            tabletopGameId: updated.tabletopGameId,
            roomId,
            isHost: false,
            seat: seatOf(updated.players, myId),
          }),
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, [roomId, playerName, navigate]);

  const handleSaveName = () => {
    if (!editNameInput.trim()) return;
    const updated = universalPartyManager.updatePlayerName(roomId, editNameInput.trim());
    const myPlayer = updated.players.find((p) => p.id === universalPartyManager.getMyPlayerId());
    if (myPlayer) {
      setPlayerName(myPlayer.name);
      savePlayerName(myPlayer.name);
    }
    setRoomState(updated);
    setEditNameOpen(false);
  };

  const handleSaveCustomRoom = () => {
    const cleaned = customRoomInput
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9_-]/g, '');
    if (!cleaned || cleaned === roomId) {
      setEditRoomOpen(false);
      return;
    }
    const hostName = playerName.trim() || storage.get(STORAGE_KEYS.PARTY_PLAYER_NAME, 'Host');
    const created = universalPartyManager.createParty(hostName, cleaned);
    setRoomId(created.roomId);
    setRoomState(created.state);
    setEditRoomOpen(false);
  };

  const buildShareUrl = () =>
    buildPartyShareUrl({
      origin: window.location.origin,
      pathname: window.location.pathname,
      roomId,
      relayUrl: isServerActive ? serverUrl : null,
    });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(buildShareUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLaunchGame = (gameType: PartyGameType, tabletopGameId?: string) => {
    universalPartyManager.launchGame(roomId, gameType, tabletopGameId);
    navigate(getGameRoute(gameType, tabletopGameId));
  };

  const startPendingGame = () => {
    if (!pendingLaunch) return;
    setPendingLaunch(null);
    handleLaunchGame(pendingLaunch.gameType, pendingLaunch.gameId);
  };

  const handleReturnToLobby = () => {
    universalPartyManager.returnToLobby(roomId);
  };

  // In-Game Render

  const shareUrl = buildShareUrl();
  const players = roomState?.players || [];
  const amIHost = universalPartyManager.isHost(roomId);

  return {
    roomId,
    roomState,
    copied,
    showQr,
    setShowQr,
    editRoomOpen,
    setEditRoomOpen,
    customRoomInput,
    setCustomRoomInput,
    editNameOpen,
    setEditNameOpen,
    editNameInput,
    setEditNameInput,
    serverUrl,
    isServerActive,
    pickerOpen,
    setPickerOpen,
    getGameRoute,
    handleSaveName,
    handleSaveCustomRoom,
    handleCopyLink,
    handleLaunchGame,
    handleReturnToLobby,
    shareUrl,
    players,
    amIHost,
    pendingLaunch,
    startPendingGame,
    clearPendingLaunch: () => setPendingLaunch(null),
  };
}

export type PartyLobbyController = ReturnType<typeof usePartyLobbyController>;
