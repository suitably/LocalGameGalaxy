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
import { processOhHellRound } from '../logic/ohHellEngine';
import type { CardPlayer } from '../logic/types';

interface OhHellGameViewProps {
  initialPlayers: string[];
  roundsSequence?: number[];
  onExit: () => void;
}

export const OhHellGameView: React.FC<OhHellGameViewProps> = ({
  initialPlayers,
  roundsSequence = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
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

  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState<'bidding' | 'tricks'>('bidding');
  const [currentBids, setCurrentBids] = useState<Record<string, string>>({});
  const [currentTricks, setCurrentTricks] = useState<Record<string, string>>({});
  const [historyOpen, setHistoryOpen] = useState(false);

  const cardsThisRound = roundsSequence[roundIdx] || 1;
  const isLastRound = roundIdx >= roundsSequence.length - 1;

  const totalBidsEntered = Object.values(currentBids).reduce(
    (acc, val) => acc + (parseInt(val, 10) || 0),
    0,
  );

  const handleBidChange = (playerId: string, val: string) => {
    setCurrentBids((prev) => ({ ...prev, [playerId]: val }));
  };

  const handleTrickChange = (playerId: string, val: string) => {
    setCurrentTricks((prev) => ({ ...prev, [playerId]: val }));
  };

  const handleAdvanceToTricks = () => {
    setPhase('tricks');
  };

  const handleCompleteRound = () => {
    const bidsMap: Record<string, number> = {};
    const tricksMap: Record<string, number> = {};

    players.forEach((p) => {
      bidsMap[p.id] = parseInt(currentBids[p.id] || '0', 10);
      tricksMap[p.id] = parseInt(currentTricks[p.id] || '0', 10);
    });

    const result = processOhHellRound(players, {
      bids: bidsMap,
      tricks: tricksMap,
      cardsCount: cardsThisRound,
    });

    setPlayers(result.updatedPlayers);
    setCurrentBids({});
    setCurrentTricks({});
    setPhase('bidding');

    if (!isLastRound) {
      setRoundIdx((r) => r + 1);
    } else {
      setPhase('bidding');
    }
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
    setRoundIdx(0);
    setPhase('bidding');
    setCurrentBids({});
    setCurrentTricks({});
  };

  const rankedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <Box sx={{ width: '100%', maxWidth: 750, mx: 'auto', py: { xs: 1, sm: 2 } }}>
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

        <Typography variant="h6" sx={{ fontWeight: 800, color: '#ab47bc' }}>
          🧙‍♂️ {t('games.cards.ohell.title', 'Oh Hell')} - {t('games.cards.round', 'Runde')} {roundIdx + 1}/
          {roundsSequence.length} ({cardsThisRound} {t('games.cards.cards_count', 'Karten')})
        </Typography>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton size="small" onClick={() => setHistoryOpen(true)}>
            <HistoryIcon fontSize="small" />
          </IconButton>
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
            color={idx === 0 ? 'secondary' : 'default'}
            variant={idx === 0 ? 'filled' : 'outlined'}
            sx={{ fontWeight: 700 }}
          />
        ))}
      </Box>

      {/* Phase Indicator & Hook Warning */}
      <Paper
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 3,
          bgcolor: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'secondary.light' }}>
            {phase === 'bidding'
              ? `1. ${t('games.cards.phase_bidding', 'Stichansage (Vorhersage)')}`
              : `2. ${t('games.cards.phase_tricks', 'Ergebnis (Gemachte Stiche)')}`}
          </Typography>

          <Chip
            label={`${t('games.cards.total_bids', 'Gesamtansage')}: ${totalBidsEntered} / ${cardsThisRound} ${t('games.cards.cards_count', 'Karten')}`}
            size="small"
            color={totalBidsEntered === cardsThisRound ? 'warning' : 'info'}
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
        </Box>
      </Paper>

      {/* Input List */}
      <Stack spacing={1.5} sx={{ mb: 3 }}>
        {players.map((p) => {
          return (
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

              {phase === 'bidding' ? (
                <TextField
                  size="small"
                  type="number"
                  label={t('games.cards.bid_label', 'Ansage')}
                  value={currentBids[p.id] || ''}
                  onChange={(e) => handleBidChange(p.id, e.target.value)}
                  sx={{ width: 120 }}
                  inputProps={{ min: '0', max: String(cardsThisRound) }}
                />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Chip
                    label={`${t('games.cards.bid_label', 'Ansage')}: ${currentBids[p.id] || 0}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                  <TextField
                    size="small"
                    type="number"
                    label={t('games.cards.tricks_label', 'Stiche')}
                    value={currentTricks[p.id] || ''}
                    onChange={(e) => handleTrickChange(p.id, e.target.value)}
                    sx={{ width: 120 }}
                    inputProps={{ min: '0', max: String(cardsThisRound) }}
                  />
                </Box>
              )}
            </Paper>
          );
        })}
      </Stack>

      {/* Action Buttons */}
      {phase === 'bidding' ? (
        <Button
          variant="contained"
          color="secondary"
          size="large"
          fullWidth
          onClick={handleAdvanceToTricks}
          sx={{ py: 1.5, fontWeight: 800, borderRadius: 50 }}
        >
          {t('games.cards.continue_to_tricks', 'Ansagen fixieren & Runde spielen')}
        </Button>
      ) : (
        <Button
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          onClick={handleCompleteRound}
          sx={{
            py: 1.5,
            fontWeight: 800,
            borderRadius: 50,
            background: 'linear-gradient(90deg, #ab47bc, #7b1fa2)',
          }}
        >
          {t('games.cards.complete_round', 'Runde auswerten')}
        </Button>
      )}

      {/* Full Score Sheet Table Dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{t('games.cards.score_table', 'Punktetabelle')}</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('games.cards.round', 'Runde')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('games.cards.cards_count', 'Karten')}</TableCell>
                {players.map((p) => (
                  <TableCell key={p.id} align="center" sx={{ fontWeight: 'bold' }}>
                    {p.name}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {roundsSequence.slice(0, roundIdx + 1).map((cards, rNum) => (
                <TableRow key={rNum}>
                  <TableCell>{rNum + 1}</TableCell>
                  <TableCell>{cards}</TableCell>
                  {players.map((p) => {
                    const bid = p.bids[rNum];
                    const trick = p.tricksWon[rNum];
                    const pts = p.roundScores[rNum];
                    return (
                      <TableCell key={p.id} align="center">
                        {bid !== undefined && trick !== undefined ? (
                          <span>
                            {bid}/{trick} ({pts >= 0 ? `+${pts}` : pts}P)
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    );
                  })}
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
