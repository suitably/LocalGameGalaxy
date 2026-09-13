import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import GroupsIcon from '@mui/icons-material/Groups';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import SettingsIcon from '@mui/icons-material/Settings';
import { useTranslation } from 'react-i18next';
import { GameManagerDialog } from '../manager/GameManagerDialog';
import { PublishTabletopGameDialog } from '../publisher/PublishTabletopGameDialog';
import type { TabletopGameDefinition, TabletopGameSummary } from '../../logic/types';
import { listTabletopGames } from '../../logic/tabletopStorage';

interface TabletopLobbyViewProps {
  onStartLocalGame: (gameId: string) => void;
  onStartPartyGame: (gameId: string) => void;
}

export const TabletopLobbyView: React.FC<TabletopLobbyViewProps> = ({
  onStartLocalGame,
  onStartPartyGame,
}) => {
  const { t } = useTranslation();
  const [managerOpen, setManagerOpen] = useState(false);
  const [publishGame, setPublishGame] = useState<TabletopGameDefinition | null>(null);
  const [installedGames, setInstalledGames] = useState<TabletopGameSummary[]>([]);

  const BUILTIN_STARTERS = [
    {
      id: 'standard-cards',
      name: 'Standard Kartendeck (52)',
      desc: 'Mau-Mau, Skat, Poker oder Rommé mit geteiltem Tisch und Smartphone-Handkarten.',
      modes: ['party_multi_device', 'local_pass_and_play'],
      icon: '🃏',
      color: '#1976d2',
    },
    {
      id: 'liars-dice',
      name: 'Liar\'s Dice / Perudo',
      desc: 'Bluff-Würfelspiel mit 3D-Würfeln und verdeckten Bechern auf jedem Smartphone.',
      modes: ['party_multi_device'],
      icon: '🎲',
      color: '#f57c00',
    },
    {
      id: 'checkers',
      name: 'Dame / Checkers',
      desc: 'Klassisches Brettspiel für zwei Spieler auf einem 8x8 Schachbrett.',
      modes: ['local_pass_and_play', 'party_multi_device'],
      icon: '🏁',
      color: '#388e3c',
    },
  ];

  useEffect(() => {
    listTabletopGames().then(setInstalledGames).catch(() => {});
  }, [managerOpen]);

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: { xs: 2, sm: 3 } }}>
      <Container maxWidth="md" disableGutters>
        <Paper
          elevation={3}
          sx={{
            p: { xs: 2.5, sm: 4 },
            borderRadius: 3.5,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
            <Box>
              <Typography variant="h4" fontWeight={900} color="primary.main">
                {t('games.tabletop.title', 'Virtueller Spieltisch')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('games.tabletop.subtitle', 'Beliebige Karten- & Brettspiele mit geteiltem Tisch und Smartphone-Handkarten spielen.')}
              </Typography>
            </Box>

            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => setManagerOpen(true)}
              >
                {t('games.tabletop.manage_games', 'Spiele verwalten')}
              </Button>
            </Box>
          </Box>

          {/* Starter Games Grid */}
          <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
            {t('games.tabletop.starter_games', 'Klassiker')}
          </Typography>
          <Grid container spacing={2.5} sx={{ mb: 4 }}>
            {BUILTIN_STARTERS.map((game) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={game.id}>
                <Card
                  variant="outlined"
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 3,
                    borderTop: '4px solid',
                    borderTopColor: game.color,
                  }}
                >
                  <CardContent sx={{ flex: 1 }}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Typography variant="h5">{game.icon}</Typography>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {game.name}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {game.desc}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0, gap: 1 }}>
                    {game.modes.includes('local_pass_and_play') && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PhoneIphoneIcon />}
                        onClick={() => onStartLocalGame(game.id)}
                      >
                        Lokal
                      </Button>
                    )}
                    {game.modes.includes('party_multi_device') && (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<GroupsIcon />}
                        onClick={() => onStartPartyGame(game.id)}
                      >
                        Party
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Custom Games Section */}
          {installedGames.length > 0 && (
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                {t('games.tabletop.custom_games', 'Eigene & Importierte Spiele')} ({installedGames.length})
              </Typography>
              <Grid container spacing={2}>
                {installedGames.map((game) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={game.id}>
                    <Card variant="outlined" sx={{ borderRadius: 3 }}>
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight={700}>{game.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {game.minPlayers}-{game.maxPlayers} Spieler • {game.cardCount} Karten
                        </Typography>
                      </CardContent>
                      <CardActions sx={{ px: 2, pb: 2 }}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<PlayArrowIcon />}
                          onClick={() => onStartLocalGame(game.id)}
                        >
                          Starten
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<GroupsIcon />}
                          onClick={() => onStartPartyGame(game.id)}
                        >
                          Party
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Paper>
      </Container>

      <GameManagerDialog
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        onPlayParty={onStartPartyGame}
        onPlayLocal={onStartLocalGame}
        onPublish={setPublishGame}
      />

      <PublishTabletopGameDialog
        open={Boolean(publishGame)}
        game={publishGame}
        onClose={() => setPublishGame(null)}
      />
    </Box>
  );
};
