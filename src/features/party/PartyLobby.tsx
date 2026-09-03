import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  universalPartyManager,
  type PartyRoomState,
} from './logic/universalPartyManager';
import { storage } from '../../lib/storage';
import { GarticPhoneGame } from '../../games/garticphone';
import { ActiveGameBanner } from './components/ActiveGameBanner';
import { ShareLobbyCard } from './components/ShareLobbyCard';
import { ConnectedPlayersList } from './components/ConnectedPlayersList';
import { GarticGameCard } from './components/GarticGameCard';
import { EditNameDialog } from './components/EditNameDialog';
import { CustomRoomDialog } from './components/CustomRoomDialog';

const STORAGE_PLAYER_NAME = 'party_player_name';

const FUN_NAME_PREFIXES = [
  'Fuchs', 'Pinguin', 'Panda', 'Koala', 'Drache', 'Tiger', 'Ninja',
  'Zauberer', 'Astronaut', 'Delfin', 'Löwe', 'Falke', 'Bär', 'Otter',
];

export const getOrCreatePlayerName = (): string => {
  const existingParty = storage.get(STORAGE_PLAYER_NAME, '');
  if (existingParty && existingParty.trim() && existingParty !== 'Spieler' && existingParty !== 'Host') {
    return existingParty.trim();
  }
  const existingLegacy = storage.get('guessart_player_name', '');
  if (existingLegacy && existingLegacy.trim() && existingLegacy !== 'Spieler' && existingLegacy !== 'Host') {
    storage.set(STORAGE_PLAYER_NAME, existingLegacy.trim());
    return existingLegacy.trim();
  }
  const idx = Math.floor(Math.random() * FUN_NAME_PREFIXES.length);
  const num = Math.floor(10 + Math.random() * 90);
  const generated = `${FUN_NAME_PREFIXES[idx]} ${num}`;
  storage.set(STORAGE_PLAYER_NAME, generated);
  return generated;
};

interface PartyLobbyProps {
  initialRoomId?: string;
}

export const PartyLobby: React.FC<PartyLobbyProps> = ({ initialRoomId }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [playerName, setPlayerName] = useState<string>(() => getOrCreatePlayerName());

  const [roomId, setRoomId] = useState<string>(() => {
    if (initialRoomId) {
      universalPartyManager.joinParty(initialRoomId, playerName);
      return initialRoomId;
    }
    const hash = window.location.hash;
    const queryString = window.location.search || (hash.includes('?') ? hash.substring(hash.indexOf('?')) : '');
    const urlParams = new URLSearchParams(queryString);
    const fromUrl = urlParams.get('room');
    if (fromUrl) {
      const cleaned = fromUrl.toUpperCase().trim();
      universalPartyManager.joinParty(cleaned, playerName);
      return cleaned;
    }

    const created = universalPartyManager.createParty(playerName);
    return created.roomId;
  });

  const [roomState, setRoomState] = useState<PartyRoomState | null>(() => universalPartyManager.getRoomState());
  const [isInGameView, setIsInGameView] = useState<boolean>(() => {
    const s = universalPartyManager.getRoomState();
    return s?.status === 'in_game';
  });

  // Dialog States
  const [editRoomOpen, setEditRoomOpen] = useState<boolean>(false);
  const [editNameOpen, setEditNameOpen] = useState<boolean>(false);

  useEffect(() => {
    universalPartyManager.subscribeToParty(roomId);
    if (!universalPartyManager.isHost(roomId)) {
      universalPartyManager.joinParty(roomId, playerName);
    }

    const unsubscribe = universalPartyManager.onPartyUpdate((updated) => {
      setRoomState((prev) => {
        if (prev?.status === 'lobby' && updated.status === 'in_game') {
          sessionStorage.removeItem(`galaxy_gartic_state_${roomId}`);
          setIsInGameView(true);
        } else if (prev?.status === 'in_game' && updated.status === 'lobby') {
          sessionStorage.removeItem(`galaxy_gartic_state_${roomId}`);
          setIsInGameView(false);
        }
        return updated;
      });

      const myId = universalPartyManager.getMyPlayerId();
      const myPlayer = updated.players.find((p) => p.id === myId);
      if (myPlayer && myPlayer.name !== playerName) {
        setPlayerName(myPlayer.name);
        storage.set(STORAGE_PLAYER_NAME, myPlayer.name);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [roomId, playerName]);

  const handleSaveName = (newName: string) => {
    const updated = universalPartyManager.updatePlayerName(roomId, newName);
    const myPlayer = updated.players.find((p) => p.id === universalPartyManager.getMyPlayerId());
    if (myPlayer) {
      setPlayerName(myPlayer.name);
      storage.set(STORAGE_PLAYER_NAME, myPlayer.name);
    }
    setRoomState(updated);
    setEditNameOpen(false);
  };

  const handleSaveCustomRoom = (cleaned: string) => {
    if (cleaned === roomId) {
      setEditRoomOpen(false);
      return;
    }
    const hostName = playerName.trim() || storage.get(STORAGE_PLAYER_NAME, 'Host');
    const created = universalPartyManager.createParty(hostName, cleaned);
    setRoomId(created.roomId);
    setRoomState(created.state);
    setEditRoomOpen(false);
  };

  const buildShareUrl = () => {
    return `${window.location.origin}${window.location.pathname}#/party?room=${roomId}`;
  };

  const handleLaunchGame = () => {
    const newGameId = `gartic_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    sessionStorage.removeItem(`galaxy_gartic_state_${roomId}`);
    universalPartyManager.launchGame(roomId, 'garticphone', newGameId);
    setIsInGameView(true);
  };

  const handleReturnToLobby = () => {
    universalPartyManager.returnToLobby(roomId);
    sessionStorage.removeItem(`galaxy_gartic_state_${roomId}`);
    setIsInGameView(false);
  };

  // In-Game Render
  if (roomState?.status === 'in_game' && roomState.activeGame === 'garticphone' && isInGameView) {
    return <GarticPhoneGame onBackToMenu={() => setIsInGameView(false)} initialRoomId={roomId} />;
  }

  const shareUrl = buildShareUrl();
  const players = roomState?.players || [];
  const amIHost = universalPartyManager.isHost(roomId);

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', py: { xs: 1.5, sm: 3 }, px: { xs: 1, sm: 2 } }}>
      <Container maxWidth="md" disableGutters>
        <Paper
          elevation={4}
          sx={{
            p: { xs: 2, sm: 3.5 },
            borderRadius: 3.5,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* Active Live Game Banner */}
          {roomState?.status === 'in_game' && (
            <ActiveGameBanner
              amIHost={amIHost}
              onReturnToLobby={handleReturnToLobby}
              onRejoinGame={() => setIsInGameView(true)}
            />
          )}

          {/* Header */}
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2.5} flexWrap="wrap" gap={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <IconButton onClick={() => navigate('/')} size="small">
                <ArrowBackRoundedIcon />
              </IconButton>
              <Typography variant="h5" fontWeight={900}>
                🎉 {t('party.lobbyTitle', 'Galaxy Party-Lobby')}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.8} flexWrap="wrap">
              <Chip
                label={`${t('party.room', 'Raum')}: ${roomId}`}
                color="primary"
                variant="filled"
                sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}
              />
              {amIHost && (
                <Tooltip title={t('party.editRoomCode', 'Eigenen Raum-Code festlegen')}>
                  <IconButton size="small" onClick={() => setEditRoomOpen(true)}>
                    <EditRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title={t('party.shareLobbyTooltip', 'Lobby teilen / Freunde einladen')}>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  startIcon={<ShareRoundedIcon />}
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                  }}
                  sx={{ fontWeight: 700, borderRadius: 2, height: 32 }}
                >
                  {t('party.shareLobby', 'Lobby teilen')}
                </Button>
              </Tooltip>
            </Box>
          </Box>

          {/* Share Link & QR Card */}
          <ShareLobbyCard shareUrl={shareUrl} />

          {/* Connected Players Roster */}
          <ConnectedPlayersList
            players={players}
            myPlayerId={universalPartyManager.getMyPlayerId()}
            onEditMyName={() => setEditNameOpen(true)}
          />

          <Divider sx={{ my: 3 }} />

          {/* Game Selection Section */}
          <Box>
            <Box mb={2}>
              <Typography variant="h6" fontWeight={800} color="primary.main">
                🎮 {t('party.categoryAvailableGames', 'Verfügbare Spielmodi')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {amIHost
                  ? t('party.hostSelectPrompt', 'Wähle ein Spiel aus, um es für alle Spieler zu starten:')
                  : t('party.guestWaitingPrompt', 'Der Host wählt gerade das nächste Spiel aus...')}
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr' },
                gap: 2,
              }}
            >
              <GarticGameCard
                amIHost={amIHost}
                onLaunchGame={handleLaunchGame}
              />
            </Box>
          </Box>
        </Paper>

        {/* Edit Name Dialog */}
        <EditNameDialog
          open={editNameOpen}
          initialName={playerName}
          onClose={() => setEditNameOpen(false)}
          onSave={handleSaveName}
        />

        {/* Custom Room Code Dialog */}
        <CustomRoomDialog
          open={editRoomOpen}
          currentRoomId={roomId}
          onClose={() => setEditRoomOpen(false)}
          onSave={handleSaveCustomRoom}
        />
      </Container>
    </Box>
  );
};
