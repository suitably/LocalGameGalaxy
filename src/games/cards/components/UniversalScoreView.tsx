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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReplayIcon from '@mui/icons-material/Replay';
import HistoryIcon from '@mui/icons-material/History';
import { useTranslation } from 'react-i18next';
import type { CardGameDefinition, CardPlayer } from '../logic/types';

interface UniversalScoreViewProps {
  game: CardGameDefinition;
  initialPlayers: string[];
  onExit: () => void;
}

export const UniversalScoreView: React.FC<UniversalScoreViewProps> = ({
  game,
  initialPlayers,
  onExit,
}) => {
  const { t } = useTranslation();

  const [players, setPlayers] = useState<CardPlayer[]>(() =>
    initialPlayers.map((name, idx) => ({
      id: `p${idx + 1}`,
      name,
      lives: 0,
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

  const handleScoreChange = (playerId: string, val: string) => {
    setCurrentInputs((prev) => ({ ...prev, [playerId]: val }));
  };

  const handleApplyRoundScores = () => {
    setPlayers((prev) =>
      prev.map((p) => {
        const delta = parseFloat(currentInputs[p.id] || '0') || 0;
        return {
          ...p,
          score: p.score + delta,
          roundScores: [...p.roundScores, delta],
        };
      }),
    );
    setCurrentInputs({});
    setRoundNumber((r) => r + 1);
  };

  const handleRestart = () => {
    setPlayers(
      initialPlayers.map((name, idx) => ({
        id: `p${idx + 1}`,
        name,
        lives: 0,
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
  };

  const rankedPlayers = [...players].sort((a, b) => b.score - a.score);

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

        <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffa726' }}>
          🃏 {game.name} - {t('games.cards.round', 'Runde')} {roundNumber}
        </Typography>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {roundNumber > 1 && (
            <IconButton size="small" onClick={() => setHistoryOpen(true)}>
              <HistoryIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton size="small" onClick={handleRestart}>
            <ReplayIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Leaderboard Chips */}
      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1.5, mb: 2 }}>
        {rankedPlayers.map((p, idx) => (
          <Chip
            key={p.id}
            label={`${idx + 1}. ${p.name}: ${p.score}P`}
            color={idx === 0 ? 'warning' : 'default'}
            variant={idx === 0 ? 'filled' : 'outlined'}
            sx={{ fontWeight: 700 }}
          />
        ))}
      </Box>

      {/* Input List */}
      <Stack spacing={1.5} sx={{ mb: 3 }}>
        {players.map((p) => (
          <Paper
            key={p.id}
            elevation={1}
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: 3,
              bgcolor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1.5,
            }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {p.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('games.cards.current_score', 'Punktestand')}: <strong>{p.score}P</strong>
              </Typography>
            </Box>

            <TextField
              size="small"
              type="number"
              placeholder="+ / - Punkte"
              value={currentInputs[p.id] || ''}
              onChange={(e) => handleScoreChange(p.id, e.target.value)}
              sx={{ width: 140 }}
            />
          </Paper>
        ))}
      </Stack>

      <Button
        variant="contained"
        color="warning"
        size="large"
        fullWidth
        onClick={handleApplyRoundScores}
        sx={{ py: 1.5, fontWeight: 800, borderRadius: 50 }}
      >
        {t('games.cards.add_round_points', 'Rundenpunkte eintragen')}
      </Button>

      {/* History Dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{t('games.cards.round_history', 'Rundenhistorie')}</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('games.cards.round', 'Runde')}</TableCell>
                {players.map((p) => (
                  <TableCell key={p.id} align="center" sx={{ fontWeight: 'bold' }}>
                    {p.name}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from({ length: roundNumber - 1 }).map((_, rIdx) => (
                <TableRow key={rIdx}>
                  <TableCell>{rIdx + 1}</TableCell>
                  {players.map((p) => (
                    <TableCell key={p.id} align="center">
                      {p.roundScores[rIdx] >= 0 ? `+${p.roundScores[rIdx]}` : p.roundScores[rIdx]}P
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>{t('common.close', 'Schließen')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
