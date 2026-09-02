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
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReplayIcon from '@mui/icons-material/Replay';
import HistoryIcon from '@mui/icons-material/History';
import UndoIcon from '@mui/icons-material/Undo';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslation } from 'react-i18next';
import type { CardGameDefinition, CardPlayer } from '../logic/types';
import { ModernScoreAdjuster } from './ModernScoreAdjuster';

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
  const [currentDeltas, setCurrentDeltas] = useState<Record<string, number>>({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [roundSnapshots, setRoundSnapshots] = useState<CardPlayer[][]>([]);

  const handleDeltaChange = (playerId: string, val: number) => {
    setCurrentDeltas((prev) => ({ ...prev, [playerId]: val }));
  };

  const handleApplyRoundScores = () => {
    // Save snapshot for undo
    setRoundSnapshots((prev) => [...prev, players]);

    setPlayers((prev) =>
      prev.map((p) => {
        const delta = currentDeltas[p.id] || 0;
        return {
          ...p,
          score: p.score + delta,
          roundScores: [...p.roundScores, delta],
        };
      }),
    );
    setCurrentDeltas({});
    setRoundNumber((r) => r + 1);
  };

  const handleUndo = () => {
    if (roundSnapshots.length === 0) return;
    const previous = roundSnapshots[roundSnapshots.length - 1];
    setPlayers(previous);
    setRoundSnapshots((prev) => prev.slice(0, -1));
    setRoundNumber((r) => Math.max(1, r - 1));
    setCurrentDeltas({});
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
    setCurrentDeltas({});
    setRoundSnapshots([]);
  };

  const rankedPlayers = [...players].sort((a, b) => b.score - a.score);

  const totalDeltasNonZero = Object.values(currentDeltas).some((d) => d !== 0);

  return (
    <Box sx={{ width: '100%', maxWidth: 720, mx: 'auto', py: { xs: 1, sm: 2 } }}>
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
          {roundSnapshots.length > 0 && (
            <Tooltip title={t('games.cards.undo', 'Rückgängig')}>
              <IconButton size="small" onClick={handleUndo}>
                <UndoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {roundNumber > 1 && (
            <Tooltip title={t('games.cards.round_history', 'Rundenhistorie')}>
              <IconButton size="small" onClick={() => setHistoryOpen(true)}>
                <HistoryIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={t('common.restart', 'Neu starten')}>
            <IconButton size="small" onClick={handleRestart}>
              <ReplayIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Leaderboard Ranking Chips */}
      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1.5, mb: 2 }}>
        {rankedPlayers.map((p, idx) => {
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
          return (
            <Chip
              key={p.id}
              label={`${medal} ${p.name}: ${p.score}P`}
              color={idx === 0 ? 'warning' : 'default'}
              variant={idx === 0 ? 'filled' : 'outlined'}
              sx={{ fontWeight: 800, px: 0.5 }}
            />
          );
        })}
      </Box>

      {/* Modern Player Score Cards */}
      <Stack spacing={2} sx={{ mb: 3 }}>
        {players.map((p) => (
          <ModernScoreAdjuster
            key={p.id}
            playerName={p.name}
            currentTotal={p.score}
            delta={currentDeltas[p.id] || 0}
            onChange={(val) => handleDeltaChange(p.id, val)}
            accentColor="#ffa726"
          />
        ))}
      </Stack>

      {/* Complete Round Action Button */}
      <Button
        variant="contained"
        color="warning"
        size="large"
        fullWidth
        startIcon={<CheckCircleIcon />}
        onClick={handleApplyRoundScores}
        disabled={!totalDeltasNonZero && roundNumber > 1}
        sx={{
          py: 1.5,
          fontWeight: 800,
          fontSize: '1.05rem',
          borderRadius: 50,
          boxShadow: '0 4px 16px rgba(255, 167, 38, 0.35)',
        }}
      >
        {t('games.cards.complete_round', 'Runde auswerten')} ({t('games.cards.round', 'Runde')} {roundNumber})
      </Button>

      {/* Full Score Sheet Table Dialog */}
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
                  {players.map((p) => {
                    const scoreVal = p.roundScores[rIdx];
                    return (
                      <TableCell key={p.id} align="center">
                        {scoreVal !== undefined
                          ? scoreVal >= 0
                            ? `+${scoreVal}P`
                            : `${scoreVal}P`
                          : '-'}
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

