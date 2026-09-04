import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useTranslation } from 'react-i18next';
import type { CardGameDefinition } from '../logic/types';
import { getAllCardGames } from '../logic/gamesCatalogue';
import { PlayerManagerCard, useLobbyPlayers } from '../../../modules/player-management';

interface CardsLobbyProps {
  onStartGame: (game: CardGameDefinition, players: string[]) => void;
}

export const CardsLobby: React.FC<CardsLobbyProps> = ({ onStartGame }) => {
  const { t } = useTranslation();

  const games = getAllCardGames();
  const [selectedGameId, setSelectedGameId] = useState<string>('schwimmen');

  const {
    players: lobbyPlayers,
    addPlayer,
    removePlayer,
    hasMinPlayers,
  } = useLobbyPlayers({
    storageKey: 'cards_lobby_players',
    defaultPlayers: ['Spieler 1', 'Spieler 2', 'Spieler 3'],
    minPlayers: 2,
    maxPlayers: 10,
  });

  const selectedGame = games.find((g) => g.id === selectedGameId) || games[0];

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
      <PlayerManagerCard
        players={lobbyPlayers}
        onAddPlayer={addPlayer}
        onRemovePlayer={removePlayer}
        minPlayers={2}
        maxPlayers={10}
        sx={{ mb: 3 }}
      />

      {/* Start Game Action Button */}
      <Button
        variant="contained"
        color="primary"
        size="large"
        fullWidth
        startIcon={<PlayArrowIcon />}
        onClick={() => onStartGame(selectedGame, lobbyPlayers.map((p) => p.name))}
        disabled={!hasMinPlayers}
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
