import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
  Avatar,
  CircularProgress,
} from '@mui/material';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import QrCodeRoundedIcon from '@mui/icons-material/QrCodeRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import StarsRoundedIcon from '@mui/icons-material/StarsRounded';
import PhoneIphoneRoundedIcon from '@mui/icons-material/PhoneIphoneRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import DnsRoundedIcon from '@mui/icons-material/DnsRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  universalPartyManager,
  type PartyRoomState,
  type PartyGameType,
} from './logic/universalPartyManager';
import { GarticPhoneGame } from '../../games/garticphone/GarticPhoneGame';
import { StorytellerGame } from '../../games/storyteller/StorytellerGame';
import { storage } from '../../lib/storage';

const STORAGE_PLAYER_NAME = 'guessart_player_name';

const FUN_NAME_PREFIXES = [
  'Fuchs', 'Pinguin', 'Panda', 'Koala', 'Drache', 'Tiger', 'Ninja',
  'Zauberer', 'Astronaut', 'Delfin', 'Löwe', 'Falke', 'Bär', 'Otter',
];

export const getOrCreatePlayerName = (): string => {
  const existing = storage.get(STORAGE_PLAYER_NAME, '');
  if (existing && existing.trim() && existing !== 'Spieler' && existing !== 'Host') {
    return existing.trim();
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
  const [copied, setCopied] = useState<boolean>(false);
  const [showQr, setShowQr] = useState<boolean>(false);

  // Edit Room Code Dialog State
  const [editRoomOpen, setEditRoomOpen] = useState<boolean>(false);
  const [customRoomInput, setCustomRoomInput] = useState<string>(roomId);

  // Edit My Name Dialog State
  const [editNameOpen, setEditNameOpen] = useState<boolean>(false);
  const [editNameInput, setEditNameInput] = useState<string>(playerName);

  const [isInGameView, setIsInGameView] = useState<boolean>(() => {
    const state = universalPartyManager.getRoomState();
    return state?.status === 'in_game';
  });

  const serverUrl = storage.getHelperUrl();
  const isServerActive = storage.isHelperActive();

  useEffect(() => {
    universalPartyManager.subscribeToParty(roomId);
    if (!universalPartyManager.isHost(roomId)) {
      universalPartyManager.joinParty(roomId, playerName);
    }

    const unsubscribe = universalPartyManager.onPartyUpdate((updated) => {
      setRoomState((prev) => {
        if (prev?.status !== 'in_game' && updated.status === 'in_game') {
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

  const handleSaveName = () => {
    if (!editNameInput.trim()) return;
    const updated = universalPartyManager.updatePlayerName(roomId, editNameInput.trim());
    const myPlayer = updated.players.find((p) => p.id === universalPartyManager.getMyPlayerId());
    if (myPlayer) {
      setPlayerName(myPlayer.name);
      storage.set(STORAGE_PLAYER_NAME, myPlayer.name);
    }
    setRoomState(updated);
    setEditNameOpen(false);
  };

  const handleSaveCustomRoom = () => {
    const cleaned = customRoomInput.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '');
    if (!cleaned || cleaned === roomId) {
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
    let url = `${window.location.origin}${window.location.pathname}#/party?room=${roomId}`;
    if (isServerActive && serverUrl) {
      url += `&gameRelay=${encodeURIComponent(serverUrl)}`;
    }
    return url;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(buildShareUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLaunchGame = (gameType: PartyGameType) => {
    if (gameType === 'guessart') {
      navigate('/games/guessart');
      return;
    }
    const newGameId = `gartic_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    sessionStorage.removeItem(`galaxy_gartic_state_${roomId}`);
    universalPartyManager.launchGame(roomId, gameType, newGameId);
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

  if (roomState?.status === 'in_game' && roomState.activeGame === 'storyteller' && isInGameView) {
    return <StorytellerGame onBackToMenu={() => setIsInGameView(false)} initialRoomId={roomId} />;
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
        {/* Active Live Game Banner (when user returned to lobby while game is running) */}
        {roomState?.status === 'in_game' && (
          <Card
            elevation={3}
            sx={{
              p: 2.5,
              mb: 3,
              borderRadius: 3,
              border: '2px solid',
              borderColor: 'primary.main',
              background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.12) 0%, rgba(156, 39, 176, 0.12) 100%)',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.4)',
                }}
              >
                <PhoneIphoneRoundedIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip
                    label={t('party.liveGameActive', '🔴 Live Spiel läuft')}
                    color="error"
                    size="small"
                    sx={{ fontWeight: 800, height: 22 }}
                  />
                  <Typography variant="h6" fontWeight={800}>
                    Gartic Phone
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {t('party.rejoinGameDesc', 'Das Spiel läuft gerade. Du kannst jederzeit beitreten oder fortsetzen.')}
                </Typography>
              </Box>
            </Box>

            <Box display="flex" gap={1} width={{ xs: '100%', sm: 'auto' }} flexWrap="wrap">
              {amIHost && (
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={handleReturnToLobby}
                  sx={{ fontWeight: 700, borderRadius: 2 }}
                >
                  {t('party.endGameForEveryone', 'Spiel beenden')}
                </Button>
              )}
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<PlayArrowRoundedIcon />}
                onClick={() => setIsInGameView(true)}
                sx={{ fontWeight: 800, borderRadius: 2, flexGrow: { xs: 1, sm: 0 }, py: 1.2, px: 3 }}
              >
                {t('party.rejoinGame', 'Spiel beitreten / fortsetzen')}
              </Button>
            </Box>
          </Card>
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
                <IconButton
                  size="small"
                  onClick={() => {
                    setCustomRoomInput(roomId);
                    setEditRoomOpen(true);
                  }}
                >
                  <EditRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={t('party.shareLobbyTooltip', 'Lobby teilen / QR-Code anzeigen')}>
              <Button
                size="small"
                variant="outlined"
                color="primary"
                startIcon={<ShareRoundedIcon />}
                onClick={() => setShowQr(true)}
                sx={{ fontWeight: 700, borderRadius: 2, height: 32 }}
              >
                {t('party.shareLobby', 'Lobby teilen')}
              </Button>
            </Tooltip>
          </Box>
        </Box>

        {/* Backend / Server URL Connection Info Card (Host Only) */}
        {amIHost && (
          <Card
            variant="outlined"
            sx={{
              px: 2,
              py: 1.2,
              mb: 2,
              borderRadius: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: 'action.selected',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box display="flex" alignItems="center" gap={1} minWidth={0} mr={1}>
              <DnsRoundedIcon fontSize="small" color={isServerActive && serverUrl ? 'success' : 'action'} />
              <Box minWidth={0}>
                <Typography variant="caption" color="text.secondary" display="block">
                  {t('party.backendUrlLabel', 'Host Backend-Verbindung:')}
                </Typography>
                <Typography variant="body2" fontWeight={700} noWrap>
                  {isServerActive && serverUrl ? serverUrl : t('party.defaultCloudRelay', 'Öffentliches Cloud Relay (Standard)')}
                </Typography>
              </Box>
            </Box>
            <Button
              size="small"
              variant="text"
              startIcon={<SettingsRoundedIcon />}
              onClick={() => navigate('/settings')}
              sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              {t('party.manageBackend', 'Server verwalten')}
            </Button>
          </Card>
        )}

        {/* Share Link & QR Card */}
        <Card
          variant="outlined"
          sx={{
            p: 2,
            mb: 3,
            bgcolor: 'action.hover',
            borderRadius: 2.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              {t('party.invitePrompt', 'Freunde einladen: 1× scannen für den ganzen Abend!')}
            </Typography>
            <Box display="flex" gap={1}>
              <IconButton size="small" onClick={() => setShowQr(!showQr)} color={showQr ? 'primary' : 'default'}>
                <QrCodeRoundedIcon fontSize="small" />
              </IconButton>
              <Button
                size="small"
                variant="outlined"
                startIcon={copied ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />}
                onClick={handleCopyLink}
                color={copied ? 'success' : 'primary'}
                sx={{ fontWeight: 'bold', borderRadius: 2 }}
              >
                {copied ? t('common.copied', 'Kopiert!') : t('common.copyLink', 'Link kopieren')}
              </Button>
            </Box>
          </Box>

          {showQr && (
            <Box display="flex" justifyContent="center" py={1.5}>
              <Paper sx={{ p: 2, bgcolor: '#ffffff', borderRadius: 2 }}>
                <QRCodeSVG value={shareUrl} size={160} />
              </Paper>
            </Box>
          )}
        </Card>

        {/* Connected Players Roster */}
        <Box mb={3.5}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
              {t('party.connectedPlayers', 'Verbundene Spieler')} ({players.length})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('party.stayConnectedHint', 'Alle Handys bleiben für jedes Spiel verbunden')}
            </Typography>
          </Box>

          <Box display="flex" flexWrap="wrap" gap={1.5}>
            {players.map((p) => {
              const isMe = p.id === universalPartyManager.getMyPlayerId();
              return (
                <Chip
                  key={p.id}
                  avatar={
                    <Avatar sx={{ bgcolor: p.avatarColor, fontWeight: 'bold', color: '#fff' }}>
                      {p.name.charAt(0).toUpperCase()}
                    </Avatar>
                  }
                  label={
                    <Box component="span" display="inline-flex" alignItems="center" gap={0.6}>
                      <Typography variant="body2" fontWeight={isMe ? 800 : 600} component="span">
                        {p.name} {isMe ? `(${t('common.you', 'Du')})` : ''}
                      </Typography>
                      {p.isHost && (
                        <StarsRoundedIcon sx={{ color: 'warning.main', fontSize: 18 }} />
                      )}
                    </Box>
                  }
                  onDelete={
                    isMe
                      ? () => {
                          setEditNameInput(p.name);
                          setEditNameOpen(true);
                        }
                      : undefined
                  }
                  deleteIcon={
                    isMe ? (
                      <Tooltip title={t('party.editNameTooltip', 'Namen ändern')}>
                        <EditRoundedIcon fontSize="small" sx={{ color: 'primary.main' }} />
                      </Tooltip>
                    ) : undefined
                  }
                  onClick={
                    isMe
                      ? () => {
                          setEditNameInput(p.name);
                          setEditNameOpen(true);
                        }
                      : undefined
                  }
                  variant="outlined"
                  sx={{
                    p: 2,
                    py: 2.5,
                    borderRadius: 3,
                    borderColor: isMe ? 'primary.main' : p.isHost ? 'secondary.main' : 'divider',
                    borderWidth: isMe ? 2 : 1,
                    bgcolor: isMe ? 'primary.main' + '18' : 'background.default',
                    boxShadow: isMe ? '0 2px 10px rgba(25, 118, 210, 0.2)' : 'none',
                    cursor: isMe ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                    '&:hover': isMe
                      ? {
                          bgcolor: 'primary.main' + '28',
                        }
                      : {},
                  }}
                />
              );
            })}

            {players.length === 0 && (
              <Box display="flex" alignItems="center" gap={1} py={1}>
                <CircularProgress size={18} />
                <Typography color="text.secondary" variant="body2">
                  {t('party.waitingForGuests', 'Warte auf Mitspieler...')}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Game Selection Section */}
        <Box>
          <Box mb={2}>
            <Typography variant="h6" fontWeight={800} color="primary.main">
              🎮 {t('party.categoryAvailableGames', 'Verfügbare Spielmodi')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {amIHost
                ? t('party.hostSelectPrompt', 'Starte das nächste Spiel für alle verbundenen Smartphones:')
                : t('party.guestWaitingPrompt', 'Der Host startet gleich das nächste Spiel...')}
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              gap: 2,
            }}
          >
            {/* Gartic Phone Card */}
            <Card
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: '1.5px solid',
                borderColor: 'secondary.main',
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 2,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(156, 39, 176, 0.15)',
                },
              }}
            >
              <Box>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <Typography variant="h6" fontWeight={800} color="secondary.main">
                    📞 Gartic Phone
                  </Typography>
                  <Chip label="Party Hit 🎉" color="secondary" size="small" sx={{ fontWeight: 'bold' }} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {t('party.garticDesc', 'Flüsterpost: Satz schreiben ➔ Zeichnen ➔ Raten ➔ Zeichnen ➔ Animierte Album-Show!')}
                </Typography>
              </Box>

              {amIHost ? (
                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  onClick={() => handleLaunchGame('garticphone')}
                  startIcon={<PlayArrowRoundedIcon />}
                  sx={{
                    fontWeight: 800,
                    borderRadius: 2.5,
                    py: 1.2,
                    boxShadow: '0 4px 14px rgba(156, 39, 176, 0.35)',
                  }}
                >
                  {t('party.launchGartic', 'Gartic Phone starten')}
                </Button>
              ) : (
                <Chip
                  label={t('party.guestWaitingPrompt', 'Der Host wählt gerade das nächste Spiel aus...')}
                  variant="outlined"
                  color="secondary"
                  sx={{ fontWeight: 'bold', py: 1 }}
                />
              )}
            </Card>

            {/* GuessArt Card */}
            <Card
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: '1.5px solid',
                borderColor: 'primary.main',
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 2,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(25, 118, 210, 0.15)',
                },
              }}
            >
              <Box>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <Typography variant="h6" fontWeight={800} color="primary.main">
                    🎨 GuessArt
                  </Typography>
                  <Chip label="Klassiker ✏️" color="primary" size="small" sx={{ fontWeight: 'bold' }} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {t('party.guessArtDesc', 'Klassisches Zeichnen & Raten! Ein Spieler zeichnet, alle anderen raten auf ihren Handys.')}
                </Typography>
              </Box>

              {amIHost ? (
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={() => handleLaunchGame('guessart')}
                  startIcon={<PlayArrowRoundedIcon />}
                  sx={{
                    fontWeight: 800,
                    borderRadius: 2.5,
                    py: 1.2,
                    boxShadow: '0 4px 14px rgba(25, 118, 210, 0.35)',
                  }}
                >
                  {t('party.launchGuessArt', 'GuessArt starten')}
                </Button>
              ) : (
                <Chip
                  label={t('party.guestWaitingPrompt', 'Der Host wählt gerade das nächste Spiel aus...')}
                  variant="outlined"
                  color="primary"
                  sx={{ fontWeight: 'bold', py: 1 }}
                />
              )}
            </Card>

            {/* Geschichtenschreiber Card */}
            <Card
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: '1.5px solid',
                borderColor: '#0284c7',
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 2,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(2, 132, 199, 0.15)',
                },
              }}
            >
              <Box>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <Typography variant="h6" fontWeight={800} sx={{ color: '#0284c7' }}>
                    📖 Geschichtenschreiber
                  </Typography>
                  <Chip label="Kreativ ✍️" sx={{ bgcolor: 'rgba(2, 132, 199, 0.15)', color: '#0284c7', fontWeight: 'bold' }} size="small" />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {t('party.storytellerDesc', 'Kollaboratives Geschichtenschreiben! Schreibt gemeinsam einen Text mit Blind Mode, Time Attack & Word Roulette.')}
                </Typography>
              </Box>

              {amIHost ? (
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => handleLaunchGame('storyteller')}
                  startIcon={<PlayArrowRoundedIcon />}
                  sx={{
                    fontWeight: 800,
                    borderRadius: 2.5,
                    py: 1.2,
                    bgcolor: '#0284c7',
                    '&:hover': { bgcolor: '#0369a1' },
                    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                  }}
                >
                  {t('party.launchStoryteller', 'Geschichtenschreiber starten')}
                </Button>
              ) : (
                <Chip
                  label={t('party.guestWaitingPrompt', 'Der Host wählt gerade das nächste Spiel aus...')}
                  variant="outlined"
                  sx={{ color: '#0284c7', borderColor: '#0284c7', fontWeight: 'bold', py: 1 }}
                />
              )}
            </Card>
          </Box>
        </Box>
      </Paper>

      {/* Edit Name Dialog */}
      <Dialog open={editNameOpen} onClose={() => setEditNameOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {t('party.editNameTitle', 'Deinen Namen ändern')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('party.editNameDesc', 'Passe deinen Spielernamen für die Party-Lobby und alle Minispiele an.')}
          </Typography>
          <TextField
            autoFocus
            label={t('party.nameInputLabel', 'Dein Name')}
            value={editNameInput}
            onChange={(e) => setEditNameInput(e.target.value)}
            fullWidth
            inputProps={{ maxLength: 20 }}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditNameOpen(false)}>{t('common.cancel', 'Abbrechen')}</Button>
          <Button onClick={handleSaveName} variant="contained" disabled={!editNameInput.trim()}>
            {t('common.save', 'Speichern')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Custom Room Code Dialog */}
      <Dialog open={editRoomOpen} onClose={() => setEditRoomOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {t('party.customRoomTitle', 'Raum-Code anpassen')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('party.customRoomDesc', 'Verwende einen leicht merkbaren Code (z.B. SPIELABEND oder ALEX), damit deine Freunde immer denselben Link nutzen können.')}
          </Typography>
          <TextField
            autoFocus
            label={t('party.roomCodeLabel', 'Raum-Code')}
            value={customRoomInput}
            onChange={(e) => setCustomRoomInput(e.target.value.toUpperCase())}
            fullWidth
            inputProps={{ maxLength: 16 }}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveCustomRoom()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditRoomOpen(false)}>{t('common.cancel', 'Abbrechen')}</Button>
          <Button onClick={handleSaveCustomRoom} variant="contained" disabled={!customRoomInput.trim()}>
            {t('common.save', 'Speichern')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  </Box>
  );
};
