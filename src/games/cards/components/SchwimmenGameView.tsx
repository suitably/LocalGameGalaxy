import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PoolIcon from '@mui/icons-material/Pool';
import DangerousIcon from '@mui/icons-material/Dangerous';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReplayIcon from '@mui/icons-material/Replay';
import HistoryIcon from '@mui/icons-material/History';
import { useTranslation } from 'react-i18next';
import { processSchwimmenRound } from '../logic/schwimmenEngine';
import type { CardPlayer } from '../logic/types';

interface SchwimmenGameViewProps {
  initialPlayers: string[];
  defaultLives?: number;
  onExit: () => void;
}

export const SchwimmenGameView: React.FC<SchwimmenGameViewProps> = ({
  initialPlayers,
  defaultLives = 3,
  onExit,
}) => {
  const { t } = useTranslation();

  const [players, setPlayers] = useState<CardPlayer[]>(() =>
    initialPlayers.map((name, idx) => ({
      id: `p${idx + 1}`,
      name,
      lives: defaultLives,
      isSwimming: false,
      isEliminated: false,
      score: 0,
      roundScores: [],
      bids: [],
      tricksWon: [],
    })),
  );

  const [roundNumber, setRoundNumber] = useState(1);
  const [currentInputs, setCurrentInputs] = useState<Record<string, string>>({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [roundHistory, setRoundHistory] = useState<
    Array<{ round: number; entries: Array<{ name: string; score: number; lostLife: boolean; status: string }> }>
  >([]);
  const [winner, setWinner] = useState<CardPlayer | null>(null);

  const handleScoreChange = (playerId: string, val: string) => {
    setCurrentInputs((prev) => ({ ...prev, [playerId]: val }));
  };

  const handleSetFeuer = (playerId: string) => {
    setCurrentInputs((prev) => ({ ...prev, [playerId]: '33' }));
  };

  const handleEvaluateRound = () => {
    const scoresMap: Record<string, number> = {};
    for (const p of players) {
      if (!p.isEliminated) {
        const raw = currentInputs[p.id];
        const num = parseFloat(raw || '0');
        scoresMap[p.id] = isNaN(num) ? 0 : num;
      }
    }

    const result = processSchwimmenRound(players, { playerScores: scoresMap });

    const historyEntry = {
      round: roundNumber,
      entries: players
        .filter((p) => !p.isEliminated)
        .map((p) => ({
          name: p.name,
          score: scoresMap[p.id] || 0,
          lostLife: result.losers.includes(p.id),
          status: p.isSwimming ? 'swimming' : p.lives <= 1 && result.losers.includes(p.id) ? 'swimming' : 'active',
        })),
    };

    setRoundHistory((prev) => [historyEntry, ...prev]);
    setPlayers(result.updatedPlayers);
    setCurrentInputs({});
    setRoundNumber((r) => r + 1);

    if (result.isGameOver && result.winner) {
      setWinner(result.winner);
    }
  };

  const handleRestart = () => {
    setPlayers(
      initialPlayers.map((name, idx) => ({
        id: `p${idx + 1}`,
        name,
        lives: defaultLives,
        isSwimming: false,
        isEliminated: false,
        score: 0,
        roundScores: [],
        bids: [],
        tricksWon: [],
      })),
    );
    setRoundNumber(1);
    setCurrentInputs({});
    setRoundHistory([]);
    setWinner(null);
  };

  const activePlayersCount = players.filter((p) => !p.isEliminated).length;

  return (
    <Box sx={{ width: '100%', maxWidth: 700, mx: 'auto', py: { xs: 1, sm: 2 } }}>
      {/* Header bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onExit}
          size="small"
          sx={{ textTransform: 'none', color: 'text.secondary' }}
        >
          {t('common.back', 'Zurück')}
        </Button>

        <Typography variant="h6" sx={{ fontWeight: 800, color: '#00e5ff' }}>
          🏊 {t('games.cards.schwimmen.title', 'Schwimmen')} - {t('games.cards.round', 'Runde')} {roundNumber}
        </Typography>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {roundHistory.length > 0 && (
            <IconButton size="small" onClick={() => setHistoryOpen(true)}>
              <HistoryIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton size="small" onClick={handleRestart}>
            <ReplayIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Players Life Cards */}
      <Stack spacing={1.5} sx={{ mb: 3 }}>
        {players.map((player) => {
          const isDead = player.isEliminated;
          const isSwim = player.isSwimming;
          const currentVal = currentInputs[player.id] || '';

          return (
            <Paper
              key={player.id}
              elevation={isDead ? 0 : 2}
              sx={{
                p: { xs: 1.5, sm: 2 },
                borderRadius: 3,
                bgcolor: isDead
                  ? 'rgba(255, 255, 255, 0.02)'
                  : isSwim
                  ? 'rgba(0, 172, 193, 0.12)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: '1px solid',
                borderColor: isDead
                  ? 'transparent'
                  : isSwim
                  ? '#00acc1'
                  : 'rgba(255, 255, 255, 0.1)',
                opacity: isDead ? 0.45 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1.5,
              }}
            >
              {/* Player Name and Lives */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 160 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {player.name}
                  </Typography>

                  {/* Status & Lives badge */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                    {isDead ? (
                      <Chip
                        icon={<DangerousIcon fontSize="small" />}
                        label={t('games.cards.eliminated', 'Ertrunken')}
                        size="small"
                        color="error"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    ) : isSwim ? (
                      <Chip
                        icon={<PoolIcon fontSize="small" />}
                        label={t('games.cards.swimming_status', 'Schwimmt (0 Leben)')}
                        size="small"
                        sx={{
                          bgcolor: alpha('#00acc1', 0.25),
                          color: '#80deea',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      />
                    ) : (
                      Array.from({ length: player.lives }).map((_, i) => (
                        <FavoriteIcon
                          key={i}
                          sx={{ fontSize: 18, color: '#f44336' }}
                        />
                      ))
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Point Input & Feuer Trigger */}
              {!isDead && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField
                    size="small"
                    type="number"
                    placeholder="Punkte (0-31)"
                    value={currentVal}
                    onChange={(e) => handleScoreChange(player.id, e.target.value)}
                    sx={{ width: { xs: 120, sm: 140 } }}
                    inputProps={{ step: '0.5', min: '0', max: '33' }}
                  />

                  <Tooltip title={t('games.cards.feuer_tooltip', 'Feuer / 3 Asse (33 Punkte)')}>
                    <Button
                      variant={currentVal === '33' ? 'contained' : 'outlined'}
                      color="warning"
                      size="small"
                      startIcon={<WhatshotIcon />}
                      onClick={() => handleSetFeuer(player.id)}
                      sx={{ textTransform: 'none', px: 1, minWidth: 0, borderRadius: 2 }}
                    >
                      {t('games.cards.feuer', 'Feuer')}
                    </Button>
                  </Tooltip>
                </Box>
              )}
            </Paper>
          );
        })}
      </Stack>

      {/* Evaluate round button */}
      {!winner && activePlayersCount > 1 && (
        <Button
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          onClick={handleEvaluateRound}
          sx={{
            py: 1.5,
            fontWeight: 800,
            fontSize: '1.05rem',
            borderRadius: 50,
            boxShadow: '0 4px 16px rgba(0, 172, 193, 0.4)',
            background: 'linear-gradient(90deg, #00acc1, #00838f)',
          }}
        >
          {t('games.cards.evaluate_round', 'Runde auswerten')}
        </Button>
      )}

      {/* Winner Celebration Modal */}
      {winner && (
        <Paper
          elevation={6}
          sx={{
            p: 3,
            mt: 2,
            textAlign: 'center',
            bgcolor: 'rgba(255, 183, 77, 0.15)',
            border: '2px solid #ffb74d',
            borderRadius: 4,
          }}
        >
          <EmojiEventsIcon sx={{ fontSize: 64, color: '#ffb74d', mb: 1 }} />
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            🎉 {winner.name} {t('games.cards.has_won', 'hat gewonnen!')} 🎉
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
            {t('games.cards.survived_all', 'Hat alle Runden überstanden!')}
          </Typography>
          <Button
            variant="contained"
            color="warning"
            onClick={handleRestart}
            startIcon={<ReplayIcon />}
            sx={{ borderRadius: 50, fontWeight: 700 }}
          >
            {t('games.cards.play_again', 'Nochmal spielen')}
          </Button>
        </Paper>
      )}

      {/* Round History Dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{t('games.cards.round_history', 'Rundenhistorie')}</DialogTitle>
        <DialogContent dividers>
          {roundHistory.map((rh) => (
            <Box key={rh.round} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#00acc1' }}>
                {t('games.cards.round', 'Runde')} {rh.round}
              </Typography>
              {rh.entries.map((e, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.85rem',
                    color: e.lostLife ? 'error.light' : 'text.primary',
                  }}
                >
                  <span>
                    {e.name}: {e.score}P
                  </span>
                  <span>{e.lostLife ? '💔 -1 Leben' : '✓ Weiter'}</span>
                </Box>
              ))}
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>{t('common.close', 'Schließen')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
