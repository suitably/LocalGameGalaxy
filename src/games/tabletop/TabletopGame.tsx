import { useState, useEffect, useReducer } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GroupsIcon from '@mui/icons-material/Groups';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../context/TitleContext';
import { tabletopReducer } from './logic/tabletopReducer';
import { validateAndSanitizeGame } from './logic/gameValidator';
import { getTabletopGame } from './logic/tabletopStorage';
import { TabletopSurface } from './components/surface/TabletopSurface';
import { TabletopControllerView } from './components/controller/TabletopControllerView';
import { TabletopLobbyView } from './components/views/TabletopLobbyView';
import { useTabletopSync } from './hooks/useTabletopSync';
import { usePartyLobbyReturn } from './hooks/usePartyLobbyReturn';

export function TabletopGame() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const roomId = searchParams.get('room');
  const role = searchParams.get('role'); // 'tv' | 'player'
  const seatParam = searchParams.get('seat');
  const seat = seatParam !== null ? Number(seatParam) : null;
  const gameId = searchParams.get('gameId') || 'standard-cards';
  const isLocal = searchParams.get('local') === '1';

  usePageTitle(t('games.tabletop.title', 'Virtueller Spieltisch'));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [gameState, dispatch] = useReducer(tabletopReducer, {
    game: validateAndSanitizeGame({ id: gameId, name: 'Lade Spiel...' }),
    flyingCards: [],
  });

  const { returnToLobby } = usePartyLobbyReturn(roomId);

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
        // 1. Try local IndexedDB
        const localCustom = await getTabletopGame(gameId);
        if (localCustom) {
          dispatch({ type: 'LOAD_GAME', payload: localCustom });
          return;
        }

        // 2. Try public starter game json
        const res = await fetch(`/games/tabletop/${gameId}.json`);
        if (res.ok) {
          const json = await res.json();
          dispatch({ type: 'LOAD_GAME', payload: validateAndSanitizeGame(json) });
          return;
        }

        throw new Error(`Spiel "${gameId}" konnte nicht geladen werden.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [gameId, roomId, isLocal]);

  // Sync setup
  const isHost = role === 'tv';
  const { broadcastAction } = useTabletopSync({
    roomId,
    isHost,
    game: gameState.game,
    dispatch,
    onReturnToLobby: returnToLobby,
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" p={3}>
        <Typography color="error" variant="h6" gutterBottom>{error}</Typography>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/games/tabletop')}>
          Zurück zur Übersicht
        </Button>
      </Box>
    );
  }

  // 1. In Room: TV / Shared Table Mode
  if (roomId && role === 'tv') {
    return (
      <Box position="relative" width="100%" height="100%">
        <Button
          size="small"
          variant="contained"
          color="inherit"
          startIcon={<GroupsIcon />}
          onClick={() => {
            broadcastAction({ type: 'RETURN_TO_LOBBY' });
            returnToLobby();
          }}
          sx={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, opacity: 0.85 }}
        >
          Zurück zur Party-Lobby
        </Button>
        <TabletopSurface state={gameState} dispatch={dispatch} isTvMode={true} />
      </Box>
    );
  }

  // 2. In Room: Smartphone Controller Mode
  if (roomId && seat !== null) {
    return (
      <TabletopControllerView
        state={gameState}
        dispatch={dispatch}
        mySeat={seat}
        onFlickCardToTable={(cardId, targetHolderId) => {
          broadcastAction({ type: 'FLICK_CARD_TO_TABLE', cardId, targetHolderId, senderSeat: seat });
          dispatch({ type: 'ANIMATE_CARD_TO_TABLE', payload: { cardId, targetHolderId } });
        }}
      />
    );
  }

  // 3. Local Single Device Pass-and-Play
  if (isLocal) {
    return (
      <Box position="relative" width="100%" height="100%">
        <TabletopSurface state={gameState} dispatch={dispatch} />
      </Box>
    );
  }

  // 4. Default: Lobby View
  return (
    <TabletopLobbyView
      onStartLocalGame={(id) => navigate(`/games/tabletop?local=1&gameId=${id}`)}
      onStartPartyGame={(_id) => navigate(`/party`)}
    />
  );
}
