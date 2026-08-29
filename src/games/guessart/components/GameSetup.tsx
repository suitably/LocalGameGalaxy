import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import { useTranslation } from 'react-i18next';
import { ActiveGamesList } from './ActiveGamesList';
import type { GuessArtGameRecord } from '../logic/types';

interface GameSetupProps {
  players: string[];
  onAddPlayer: (name: string) => boolean;
  onRemovePlayer: (name: string) => void;
  onStartGame: (options: { name?: string; language: string; manualWordMode: boolean }) => void;
  activeGames: GuessArtGameRecord[];
  onResumeGame: (gameId: string) => void;
  onDeleteGame: (gameId: string) => void;
  onOpenHistory?: (gameId: string) => void;
  onEditGame?: (game: GuessArtGameRecord) => void;
  onOpenCatalogue?: () => void;
  onOpenInfo: () => void;
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
  onOpenCatalogue,
  onOpenInfo,
}) => {
  const { t, i18n } = useTranslation();
  const [gameName, setGameName] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [manualWordMode, setManualWordMode] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newPlayerName.trim()) return;
    const ok = onAddPlayer(newPlayerName);
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
          <Button
            size="small"
            variant="text"
            startIcon={<InfoOutlinedIcon />}
            onClick={onOpenInfo}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {t('guessart.howToPlay', 'Spielregeln')}
          </Button>
        </Box>
      </Box>

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
            {t('guessart.playersSubtitle', 'Füge mindestens 2 Spieler hinzu.')}
          </Typography>

          <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
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
              variant="outlined"
              startIcon={<PersonAddAltRoundedIcon />}
              onClick={handleAdd}
            >
              {t('common.add', 'Hinzufügen')}
            </Button>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ minHeight: 40 }}>
            {players.map((player) => (
              <Chip
                key={player}
                label={player}
                onDelete={() => onRemovePlayer(player)}
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600, fontSize: '0.95rem', py: 2 }}
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
                <Typography variant="subtitle2" fontWeight={600}>
                  {t('guessart.manualWordModeToggle', 'Manuelle Worterstellung')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('guessart.manualWordModeDesc', 'Spieler geben eigene Begriffe ein statt Wörter aus dem Katalog zu wählen.')}
                </Typography>
              </Box>
            }
          />
        </CardContent>
      </Card>

      {/* Start Button */}
      <Button
        variant="contained"
        color="primary"
        size="large"
        fullWidth
        startIcon={<PlayArrowRoundedIcon />}
        onClick={handleStart}
        disabled={players.length < 2}
        sx={{ py: 2, fontSize: '1.15rem', fontWeight: 800, borderRadius: 3, boxShadow: 4 }}
      >
        {t('guessart.startGame', 'Neues Spiel starten')}
      </Button>

      {/* Active Games */}
      <ActiveGamesList
        games={activeGames}
        onResumeGame={onResumeGame}
        onDeleteGame={onDeleteGame}
        onOpenHistory={onOpenHistory}
        onEditGame={onEditGame}
      />
    </Stack>
  );
};
