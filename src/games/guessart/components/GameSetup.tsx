import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import PhoneIphoneRoundedIcon from '@mui/icons-material/PhoneIphoneRounded';
import { useTranslation } from 'react-i18next';
import { ActiveGamesList } from './ActiveGamesList';
import type { GuessArtGameRecord } from '../logic/types';
import type { LobbyPlayerItem } from '../hooks/useGuessArtLobby';

interface GameSetupProps {
  players: LobbyPlayerItem[];
  onAddPlayer: (name: string, isRemote?: boolean) => boolean;
  onToggleRemote?: (name: string) => void;
  onRemovePlayer: (name: string) => void;
  onStartGame: (options: { name?: string; language: string; manualWordMode: boolean }) => void;
  activeGames: GuessArtGameRecord[];
  onResumeGame: (gameId: string) => void;
  onDeleteGame: (gameId: string) => void;
  onOpenHistory?: (gameId: string) => void;
  onEditGame?: (game: GuessArtGameRecord) => void;
  onOpenShareLinks?: (game: GuessArtGameRecord) => void;
  onOpenCatalogue?: () => void;
  onOpenInfo: () => void;
  onOpenGartic?: () => void;
}

export const GameSetup: React.FC<GameSetupProps> = ({
  players,
  onAddPlayer,
  onRemovePlayer,
  onStartGame,
  activeGames,
  onResumeGame,
  onDeleteGame,
  onOpenHistory,
  onEditGame,
  onOpenShareLinks,
  onOpenCatalogue,
  onOpenInfo,
  onOpenGartic,
}) => {
  const { t, i18n } = useTranslation();
  const [gameName, setGameName] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [manualWordMode, setManualWordMode] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newPlayerName.trim()) return;
    const ok = onAddPlayer(newPlayerName.trim());
    if (ok) {
      setNewPlayerName('');
      setFeedback(null);
    } else {
      setFeedback(t('guessart.duplicatePlayer', 'Spieler existiert bereits!'));
    }
  };

  const handleStart = () => {
    if (players.length < 2) {
      setFeedback(t('guessart.minPlayers', 'Mindestens 2 Spieler werden benötigt!'));
      return;
    }
    const currentLang = i18n.language.startsWith('de') ? 'de' : 'en';
    onStartGame({
      name: gameName.trim() || undefined,
      language: currentLang,
      manualWordMode,
    });
  };

  return (
    <Stack spacing={3} sx={{ p: 2, maxWidth: 600, mx: 'auto', pb: 6 }}>
      {/* Top Banner / Info */}
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={800} color="primary.main">
          {t('games.guessart.title', 'GuessArt')}
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          {onOpenCatalogue && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<MenuBookRoundedIcon />}
              onClick={onOpenCatalogue}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {t('guessart.catalogueButton', 'Wortkatalog')}
            </Button>
          )}
          <IconButton size="small" onClick={onOpenInfo} aria-label={t('common.info', 'Info')}>
            <InfoOutlinedIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Active Games Section */}
      <ActiveGamesList
        games={activeGames}
        onResumeGame={onResumeGame}
        onDeleteGame={onDeleteGame}
        onOpenHistory={onOpenHistory}
        onEditGame={onEditGame}
        onOpenShareLinks={onOpenShareLinks}
      />

      {/* Gartic Phone Banner */}
      {onOpenGartic && (
        <Card
          variant="outlined"
          sx={{
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.12) 0%, rgba(233, 30, 99, 0.12) 100%)',
            border: '1.5px solid rgba(156, 39, 176, 0.35)',
            boxShadow: 2,
          }}
        >
          <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <PhoneIphoneRoundedIcon sx={{ fontSize: 36, color: 'secondary.main' }} />
              <Box>
                <Typography variant="subtitle1" fontWeight={800}>
                  Gartic Phone (Flüsterpost)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('guessart.garticShortDesc', 'Live Multiplayer: Satz schreiben ➔ Zeichnen ➔ Raten ➔ Album-Show!')}
                </Typography>
              </Box>
            </Box>

            <Button
              variant="contained"
              color="secondary"
              startIcon={<PlayArrowRoundedIcon />}
              onClick={onOpenGartic}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              {t('guessart.playGartic', 'Gartic Phone spielen')}
            </Button>
          </CardContent>
        </Card>
      )}

      {feedback && (
        <Alert severity="warning" onClose={() => setFeedback(null)}>
          {feedback}
        </Alert>
      )}

      {/* Players Setup Card */}
      <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            {t('guessart.playersTitle', 'Mitspieler')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('guessart.playersSetupDesc', 'Füge mindestens 2 Spieler hinzu. Gespielt werden kann flexibel an einem Gerät oder mit eigenen Einladungslinks.')}
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
            <TextField
              size="small"
              fullWidth
              placeholder={t('guessart.playerNamePlaceholder', 'Name eingeben...')}
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            <Button
              variant="contained"
              color="primary"
              startIcon={<PersonAddAltRoundedIcon />}
              onClick={handleAdd}
              sx={{ minWidth: 130, fontWeight: 700 }}
            >
              {t('common.add', 'Hinzufügen')}
            </Button>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ minHeight: 40 }}>
            {players.map((player) => (
              <Chip
                key={player.name}
                label={player.name}
                onDelete={() => onRemovePlayer(player.name)}
                color="primary"
                variant="filled"
                sx={{ fontWeight: 700, fontSize: '0.95rem', py: 2.2, px: 0.5 }}
              />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Game Options Card */}
      <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            {t('guessart.optionsTitle', 'Einstellungen')}
          </Typography>

          <TextField
            size="small"
            fullWidth
            label={t('guessart.gameName', 'Spielname')}
            placeholder={t('guessart.gameNamePlaceholder', 'z.B. Spieleabend, WG-Runde (optional)')}
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            sx={{ mb: 2 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={manualWordMode}
                onChange={(e) => setManualWordMode(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {t('guessart.manualWordMode', 'Manuelle Begriffseingabe')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('guessart.manualWordModeDesc', 'Begriffe selbst tippen statt aus dem Katalog zu wählen.')}
                </Typography>
              </Box>
            }
          />
        </CardContent>
      </Card>

      {/* Start Button */}
      <Button
        variant="contained"
        size="large"
        fullWidth
        startIcon={<PlayArrowRoundedIcon />}
        onClick={handleStart}
        sx={{
          py: 1.5,
          fontSize: '1.1rem',
          fontWeight: 800,
          borderRadius: 3,
          boxShadow: 4,
        }}
      >
        {t('guessart.startGame', 'Spiel starten')}
      </Button>
    </Stack>
  );
};
