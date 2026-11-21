import { useState, useEffect, useReducer, type ReactNode } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../context/TitleContext';
import { tabletopReducer } from './logic/tabletopReducer';
import { validateAndSanitizeGame } from './logic/gameValidator';
import { deleteTabletopSession, sessionKey } from './logic/tabletopStorage';
import { resolveTableGame, type TableOrigin } from './logic/gameSource';
import { createGameSourceLoaders } from './logic/gameSourceLoaders';
import { decksToShuffleOnStart } from './logic/startShuffle';
import { localizeLabels } from './logic/localizeLabels';
import { ruleScriptOf } from './scripted/logic/scriptExport';
import { TabletopEditor } from './components/editor/TabletopEditor';
import { HandDockStrip } from './components/surface/HandDockStrip';
import { TabletopControllerView } from './components/controller/TabletopControllerView';
import { TabletopLobbyView } from './components/views/TabletopLobbyView';
import { useTabletopSync } from './hooks/useTabletopSync';
import { usePartyLobbyReturn } from './hooks/usePartyLobbyReturn';
import { useTabletopAutosave } from './hooks/useTabletopAutosave';
import { AssetUrlContext, useAssetUrls } from './hooks/useAssetUrls';
import { TabletopPassAndPlay } from './components/views/TabletopPassAndPlay';
import { TableGameMenu } from './components/views/TableGameMenu';
import { parseTabletopRoute } from './logic/tabletopRoute';
import { TabletopHostView } from './components/views/TabletopHostView';
import { TabletopScreenView } from './components/views/TabletopScreenView';
import type { TabletopGameDefinition } from './logic/types';
import { useFollowPartyLobby } from '../../features/party/hooks/useFollowPartyLobby';

export function TabletopGame() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { roomId, gameId, isLocal, isHost, isScreen, isSpectator, seat } =
    parseTabletopRoute(searchParams);

  usePageTitle(t('games.tabletop.title', 'Virtueller Spieltisch'));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restartCount, setRestartCount] = useState(0);
  const [origin, setOrigin] = useState<TableOrigin | null>(null);
  const [tableSettingsOpen, setTableSettingsOpen] = useState(false);
  /** Host and local play own the state, so they save and resume it; phones get snapshots. */
  const ownsState = isLocal || isHost;
  const saveKey = sessionKey(roomId, gameId);

  const [gameState, dispatch] = useReducer(tabletopReducer, {
    game: validateAndSanitizeGame({ id: gameId, name: 'Lade Spiel...' }),
    flyingCards: [],
  });

  const { returnToLobby } = usePartyLobbyReturn(roomId);
  useFollowPartyLobby(roomId);

  // Load Game Definition (Built-in or IndexedDB)
  useEffect(() => {
    if (!roomId && !isLocal) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const fetchGame = async () => {
      try {
        // session → device game → starter JSON → server; a local template replaces the original
        const resolved = await resolveTableGame(
          gameId,
          createGameSourceLoaders(gameId, ownsState ? saveKey : null),
        );
        // A game file naming a built-in rule script plays with enforced rules.
        const scriptId = resolved && ruleScriptOf(resolved.game);
        if (scriptId) {
          const next = new URLSearchParams(searchParams);
          next.set('gameId', scriptId);
          navigate({ search: next.toString() }, { replace: true });
          return;
        }
        if (resolved) {
          setOrigin(resolved.origin);
          const game = localizeLabels(resolved.game, (key, options) => String(t(key, options)));
          dispatch({ type: 'LOAD_GAME', payload: game });
          // Phones take the host's state; only the owner deals a fresh game (#670).
          if (ownsState) {
            for (const deckId of decksToShuffleOnStart(game, resolved.startedFrom)) {
              dispatch({ type: 'SHUFFLE_DECK', payload: { deckId } });
            }
          }
          return;
        }

        throw new Error(t('games.tabletop.load_error', { gameId }));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- saveKey/ownsState derive from these
  }, [gameId, roomId, isLocal, restartCount]);

  useTabletopAutosave(saveKey, gameState.game, ownsState && !loading && !error);

  const loadSavedTable = (game: TabletopGameDefinition) =>
    dispatch({ type: 'LOAD_GAME', payload: game });

  const restartGame = async () => {
    await deleteTabletopSession(saveKey);
    setRestartCount((n) => n + 1);
  };

  // Sync setup
  const { broadcastAction, syncedDispatch } = useTabletopSync({
    roomId,
    isHost,
    game: gameState.game,
    dispatch,
    onReturnToLobby: returnToLobby,
    seat,
    spectator: isSpectator,
    ready: !loading,
    onSnapshot: () => setError(null),
  });
  // this device's cached copies of the game's images (#693)
  const resolveAsset = useAssetUrls(gameState.game);
  const withAssets = (node: ReactNode) => (
    <AssetUrlContext.Provider value={resolveAsset}>{node}</AssetUrlContext.Provider>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height="100%"
        p={3}
      >
        <Typography color="error" variant="h6" gutterBottom>
          {error}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/games/tabletop')}
        >
          {t('games.tabletop.backToOverview')}
        </Button>
      </Box>
    );
  }

  // Owner views (host, local play): full header menu; the table settings dialog sits in the editor
  const ownerMenu = {
    game: gameState.game,
    origin,
    onLoad: loadSavedTable,
    onRestart: restartGame,
    onOpenTableSettings: () => setTableSettingsOpen(true),
  };
  const tableSettings = {
    tableSettingsOpen,
    onCloseTableSettings: () => setTableSettingsOpen(false),
  };

  // 1. In Room: host (shared table on this device, or playing a seat while a TV shows the table)
  if (roomId && isHost) {
    const backToLobby = () => {
      broadcastAction({ type: 'RETURN_TO_LOBBY' });
      returnToLobby();
    };
    return withAssets(
      <TabletopHostView
        {...{ roomId, gameId, seat, broadcastAction, syncedDispatch, dispatch, ownerMenu }}
        state={gameState}
        tableSettings={tableSettings}
        onBackToLobby={backToLobby}
      />,
    );
  }

  // 1b. In Room: read-only table on a TV (`role=screen`)
  if (roomId && isScreen) {
    return withAssets(<TabletopScreenView state={gameState} origin={origin} />);
  }

  // 2. In Room: Smartphone Controller Mode (`role=spectator`: no seat, no hand, no drawing)
  if (roomId && (seat !== null || isSpectator)) {
    return withAssets(
      <>
        <TableGameMenu game={gameState.game} origin={origin} />
        <TabletopControllerView
          state={gameState}
          dispatch={syncedDispatch}
          mySeat={seat}
          readOnly={isSpectator}
          onFlickCardToTable={(cardId, targetHolderId) => {
            broadcastAction({
              type: 'FLICK_CARD_TO_TABLE',
              cardId,
              targetHolderId,
              senderSeat: seat ?? undefined,
            });
            dispatch({ type: 'ANIMATE_CARD_TO_TABLE', payload: { cardId, targetHolderId } });
          }}
        />
      </>,
    );
  }

  // 3. Local Single Device Pass-and-Play
  if (isLocal) {
    return withAssets(
      <Box display="flex" flexDirection="column" width="100%" height="100%" overflow="hidden">
        <Box flex={1} position="relative" minHeight={0}>
          <TableGameMenu {...ownerMenu} onBack={() => navigate('/games/tabletop')} />
          <TabletopEditor
            state={gameState}
            dispatch={syncedDispatch}
            hideSeatSelector
            {...tableSettings}
          />
          <TabletopPassAndPlay state={gameState} dispatch={syncedDispatch} />
        </Box>
        <HandDockStrip state={gameState} dispatch={syncedDispatch} />
      </Box>,
    );
  }

  // 4. Default: Lobby View
  return <TabletopLobbyView onOpen={(route) => navigate(route)} />;
}
