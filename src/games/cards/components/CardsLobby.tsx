import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useTranslation } from 'react-i18next';
import type { CardGameDefinition } from '../logic/types';
import { getAllCardGames } from '../logic/gamesCatalogue';

interface CardsLobbyProps {
  onStartGame: (game: CardGameDefinition, players: string[]) => void;
}

export const CardsLobby: React.FC<CardsLobbyProps> = ({ onStartGame }) => {
  const { t } = useTranslation();

  const games = getAllCardGames();
  const [selectedGameId, setSelectedGameId] = useState<string>('schwimmen');
  const [players, setPlayers] = useState<string[]>(['Spieler 1', 'Spieler 2', 'Spieler 3']);
  const [newPlayerName, setNewPlayerName] = useState('');

  const selectedGame = games.find((g) => g.id === selectedGameId) || games[0];

  const handleAddPlayer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newPlayerName.trim()) return;
    setPlayers((prev) => [...prev, newPlayerName.trim()]);
    setNewPlayerName('');
  };

  const handleRemovePlayer = (index: number) => {
    if (players.length <= 2) return;
    setPlayers((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 720, mx: 'auto', py: { xs: 1.5, sm: 3 } }}>
      {/* Title & Introduction */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography
          variant="h3"
          component="h1"
          sx={{
            fontWeight: 900,
            fontSize: { xs: '1.8rem', sm: '2.5rem' },
            background: 'linear-gradient(90deg, #00acc1, #ab47bc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1,
          }}
        >
          🃏 {t('games.cards.suite_title', 'Kartenspiele Companion')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t(
            'games.cards.suite_subtitle',
            'Digitale Punkte-, Lebens- und Stichverwaltung für deine echten Kartenspiele am Tisch.',
          )}
        </Typography>
      </Box>

      {/* Select Card Game */}
      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
        1. {t('games.cards.select_game', 'Kartenspiel wählen:')}
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        {games.map((g) => {
          const isSelected = g.id === selectedGameId;
          return (
            <Card
              key={g.id}
              sx={{
                borderRadius: 3,
                bgcolor: isSelected ? 'rgba(0, 172, 193, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: '2px solid',
                borderColor: isSelected ? '#00acc1' : 'rgba(255, 255, 255, 0.08)',
                transition: 'all 0.2s ease',
              }}
            >
              <CardActionArea onClick={() => setSelectedGameId(g.id)} sx={{ p: 2, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Typography variant="h4">{g.icon || '🃏'}</Typography>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      {g.nameKey ? t(g.nameKey, g.name) : g.name}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                  {g.descriptionKey ? t(g.descriptionKey, g.description) : g.description}
                </Typography>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>

      {/* Players Setup */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, bgcolor: 'rgba(255, 255, 255, 0.04)', mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
          2. {t('games.cards.players_title', 'Mitspieler:')}
        </Typography>

        <Stack spacing={1} sx={{ mb: 2 }}>
          {players.map((p, idx) => (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                py: 1,
                borderRadius: 2,
                bgcolor: 'rgba(255, 255, 255, 0.05)',
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {idx + 1}. {p}
              </Typography>
              {players.length > 2 && (
                <IconButton size="small" onClick={() => handleRemovePlayer(idx)} color="default">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          ))}
        </Stack>

        {/* Add player form */}
        <Box component="form" onSubmit={handleAddPlayer} sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder={t('games.cards.add_player_placeholder', 'Neuer Spielername...')}
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
          />
          <Button
            type="submit"
            variant="outlined"
            startIcon={<AddIcon />}
            disabled={!newPlayerName.trim()}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            {t('common.add', 'Hinzufügen')}
          </Button>
        </Box>
      </Paper>

      {/* Start Game Action Button */}
      <Button
        variant="contained"
        color="primary"
        size="large"
        fullWidth
        startIcon={<PlayArrowIcon />}
        onClick={() => onStartGame(selectedGame, players)}
        disabled={players.length < 2}
        sx={{
          py: 1.5,
          fontWeight: 800,
          fontSize: '1.1rem',
          borderRadius: 50,
          background: 'linear-gradient(90deg, #00acc1, #ab47bc)',
          boxShadow: '0 4px 20px rgba(0, 172, 193, 0.4)',
        }}
      >
        {t('games.cards.start_session', 'Runde starten')} ({selectedGame.name})
      </Button>
    </Box>
  );
};
